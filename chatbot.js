(() => {
  if (document.getElementById("iew-ai-chat")) return;
  const oldTelegram = document.querySelector(".telegram-float");
  if (oldTelegram) oldTelegram.remove();

  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "/chatbot.css";
  document.head.appendChild(css);

  const launcher = document.createElement("button");
  launcher.type = "button";
  launcher.className = "iew-chat-launcher";
  launcher.id = "iew-chat-launcher";
  launcher.setAttribute("aria-label", "Chat with Israfil Electrical Works AI");
  launcher.setAttribute("aria-expanded", "false");
  launcher.innerHTML = '<span aria-hidden="true">✦</span><span class="iew-chat-launcher-label">AI Chat</span>';

  const panel = document.createElement("section");
  panel.className = "iew-chat-panel";
  panel.id = "iew-ai-chat";
  panel.setAttribute("aria-label", "Israfil Electrical Works AI chat");
  panel.hidden = true;
  panel.innerHTML = `
    <header class="iew-chat-header">
      <div class="iew-chat-avatar" aria-hidden="true">IE</div>
      <div class="iew-chat-heading"><strong>Israfil Electrical Works</strong><small><span></span> AI Assistant</small></div>
      <button type="button" class="iew-chat-close" aria-label="Close chat">&times;</button>
    </header>
    <div class="iew-chat-messages" role="log" aria-live="polite">
      <div class="iew-chat-bubble iew-chat-bot">Namaste! Welcome to Israfil Electrical Works. How can I help with your electrical project today?</div>
    </div>
    <div class="iew-chat-quick">
      <button type="button" data-question="What electrical services do you provide?">Our services</button>
      <button type="button" data-question="I need a project quotation.">Get a quotation</button>
    </div>
    <form class="iew-chat-form">
      <label class="iew-sr-only" for="iew-chat-input">Your message</label>
      <input id="iew-chat-input" name="message" maxlength="4000" placeholder="Type your message..." autocomplete="off" required>
      <button type="submit" aria-label="Send message">➤</button>
    </form>
    <div class="iew-chat-footer">For urgent help: <a href="tel:+917011022348">7011022348</a> · <a href="https://wa.me/919821402799" target="_blank" rel="noopener">WhatsApp</a></div>
  `;
  document.body.append(launcher, panel);

  const messages = panel.querySelector(".iew-chat-messages");
  const form = panel.querySelector("form");
  const input = panel.querySelector("input");
  const send = form.querySelector("button");
  const history = [];
  let busy = false;

  function toggle(open) {
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
    launcher.innerHTML = open ? '<span aria-hidden="true">×</span>' : '<span aria-hidden="true">✦</span><span class="iew-chat-launcher-label">AI Chat</span>';
    if (open) input.focus();
  }
  function bubble(text, who) {
    const el = document.createElement("div");
    el.className = "iew-chat-bubble " + (who === "user" ? "iew-chat-user" : "iew-chat-bot");
    el.textContent = text;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
    return el;
  }
  async function sendMessage(text) {
    if (busy || !text.trim()) return;
    busy = true;
    input.value = "";
    bubble(text, "user");
    const pending = bubble("Typing…", "bot");
    send.disabled = true;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Chat is temporarily unavailable.");
      pending.textContent = data.reply;
      history.push({ role: "user", content: text }, { role: "assistant", content: data.reply });
      if (history.length > 10) history.splice(0, history.length - 10);
    } catch (error) {
      pending.textContent = error.message || "Sorry, please try again or contact us on WhatsApp.";
    } finally {
      busy = false;
      send.disabled = false;
      messages.scrollTop = messages.scrollHeight;
      input.focus();
    }
  }
  launcher.addEventListener("click", () => toggle(panel.hidden));
  panel.querySelector(".iew-chat-close").addEventListener("click", () => toggle(false));
  form.addEventListener("submit", event => {
    event.preventDefault();
    sendMessage(input.value);
  });
  panel.querySelectorAll("[data-question]").forEach(button => {
    button.addEventListener("click", () => sendMessage(button.dataset.question));
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !panel.hidden) toggle(false);
  });
})();