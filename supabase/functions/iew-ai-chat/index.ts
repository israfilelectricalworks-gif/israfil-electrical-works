const corsHeaders = {
  "Access-Control-Allow-Origin": "https://israfilelectricalworks.dpdns.org",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
};

const SYSTEM_PROMPT = `You are Israfil Electrical Works AI, the website's helpful customer enquiry assistant.
Business: Israfil Electrical Works, an industrial and commercial electrical contractor serving Noida, Greater Noida, Delhi and nearby NCR.
Services include transformer installation, LT/HT panels, cable laying, earthing, lightning protection, electrical wiring, testing, commissioning, maintenance and AMC.
Products and services information may change; do not invent prices, stock, certifications, project experience, timelines, technical specifications, or availability. If exact details are unknown, say the team will confirm.
Be polite, concise, and helpful. Reply in the language used by the customer (Hindi, English, or Hinglish).
For enquiries, ask only the most useful next question: service required, project/site location, and contact preference. Do not request passwords, OTPs, payment card details, or sensitive personal data.
For quotations, site visits, urgent electrical faults, or confirmed technical advice, direct customers to call 7011022348 or 9821402799, or WhatsApp https://wa.me/919821402799.
Never claim that you have booked a visit, sent a quotation, or contacted staff. You are an AI assistant, not a licensed on-site electrician. For dangerous live electrical situations, advise the customer to keep away, switch off power only if safe, and contact a qualified electrician/emergency services.`;

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const allowedOrigins = [
    "https://israfilelectricalworks.dpdns.org",
    "https://israfil-electrical-works.vercel.app"
  ];
  const headers = {
    ...corsHeaders,
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  };

  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Only POST requests are allowed." }), { status: 405, headers });
  }
  if (origin && !allowedOrigins.includes(origin)) {
    return new Response(JSON.stringify({ error: "This website is not allowed to use the chat service." }), { status: 403, headers });
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Chat is not configured yet. Please contact us on WhatsApp." }), { status: 503, headers });
  }

  try {
    const body = await req.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message || message.length > 4000) {
      return new Response(JSON.stringify({ error: "Please enter a message (maximum 4,000 characters)." }), { status: 400, headers });
    }
    const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
    const input = history
      .filter((item) => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string")
      .map((item) => ({ role: item.role, content: item.content.slice(0, 4000) }));
    input.push({ role: "user", content: message });

    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
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
      return new Response(JSON.stringify({ error: "Sorry, chat is temporarily unavailable. Please try WhatsApp or call us." }), { status: 502, headers });
    }
    const reply = (data.output || [])
      .flatMap((item) => item.content || [])
      .filter((item) => item.type === "output_text")
      .map((item) => item.text)
      .join("\n")
      .trim();
    return new Response(JSON.stringify({ reply: reply || "Sorry, I could not prepare a reply. Please try again." }), { status: 200, headers });
  } catch (error) {
    console.error("Chat function failed:", error);
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again or contact us on WhatsApp." }), { status: 500, headers });
  }
});
