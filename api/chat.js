const SYSTEM_PROMPT = `You are Israfil Electrical Works AI, the website's helpful customer enquiry assistant.
Business: Israfil Electrical Works, an industrial and commercial electrical contractor serving Noida, Greater Noida, Delhi and nearby NCR.
Services include transformer installation, LT/HT panels, cable laying, earthing, lightning protection, electrical wiring, testing, commissioning, maintenance and AMC.
Products and services information may change; do not invent prices, stock, certifications, project experience, timelines, technical specifications, or availability. If exact details are unknown, say the team will confirm.
Be polite, concise, and helpful. Reply in the language used by the customer (Hindi, English, or Hinglish).
For enquiries, ask only the most useful next question: service required, project/site location, and contact preference. Do not request passwords, OTPs, payment card details, or sensitive personal data.
For quotations, site visits, urgent electrical faults, or confirmed technical advice, direct customers to call 7011022348 or 9821402799, or WhatsApp https://wa.me/919821402799.
Never claim that you have booked a visit, sent a quotation, or contacted staff. You are an AI assistant, not a licensed on-site electrician. For dangerous live electrical situations, advise the customer to keep away, switch off power only if safe, and contact a qualified electrician/emergency services.`;

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Only POST requests are allowed." });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: "Chat is not configured yet. Please contact us on WhatsApp." });
  }
  try {
    const body = req.body || {};
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message || message.length > 4000) {
      return res.status(400).json({ error: "Please enter a message (maximum 4,000 characters)." });
    }
    const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
    const input = history
      .filter(item => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string")
      .map(item => ({ role: item.role, content: item.content.slice(0, 4000) }));
    input.push({ role: "user", content: message });

    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        instructions: SYSTEM_PROMPT,
        input,
        max_output_tokens: 500
      })
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      console.error("OpenAI API error:", data.error?.message || upstream.status);
      return res.status(502).json({ error: "Sorry, chat is temporarily unavailable. Please try WhatsApp or call us." });
    }
    const answer = (data.output || [])
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text)
      .join("\n")
      .trim();
    return res.status(200).json({ reply: answer || "Sorry, I could not prepare a reply. Please try again." });
  } catch (error) {
    console.error("Chat endpoint failed:", error);
    return res.status(500).json({ error: "Something went wrong. Please try again or contact us on WhatsApp." });
  }
};
