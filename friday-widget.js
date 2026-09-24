/* Friday chat widget: plain JS, no framework, no build step.
   Include on the page with:
   <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
   <script src="friday-widget.js" defer></script>
*/
(function () {
  "use strict";

  var CONFIG = {
    apiUrl: "https://friday-chatbot.vercel.app/api/chat", // your Vercel proxy
    emailjs: { serviceId: "YOUR_SERVICE_ID", templateId: "YOUR_TEMPLATE_ID", publicKey: "YOUR_PUBLIC_KEY" },
    welcome: "Hello, I am Friday, Sai Kiran's AI assistant. How can I help you today?",
    suggestions: ["What's Sai's experience?", "What projects has he built?", "Is he open to new roles?"],
    links: [
      { label: "Portfolio", href: "https://kiranmunugoti.github.io/" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/mr-kiran" }
    ]
  };

  var CSS = [
    ".fw-root{--bg:#000;--sf:#131314;--bd:#2a2a2d;--tx:#e3e3e3;--mu:#9aa0a6;--gr:conic-gradient(from 0deg,#4285f4,#9b72cb,#d96570,#f4b400,#4285f4);position:fixed;right:24px;bottom:24px;z-index:9999;font-family:'Google Sans',Inter,system-ui,sans-serif}",
    ".fw-root *{box-sizing:border-box}",
    ".fw-launch{width:60px;height:60px;border:none;border-radius:50%;background:var(--gr);color:#fff;font-size:24px;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.4)}",
    ".fw-panel{position:absolute;right:0;bottom:76px;width:380px;height:580px;max-height:calc(100vh - 120px);display:none;flex-direction:column;background:var(--bg);color:var(--tx);border:1px solid var(--bd);border-radius:18px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.5)}",
    ".fw-panel.open{display:flex}",
    ".fw-head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--bd)}",
    ".fw-av{width:28px;height:28px;border-radius:50%;background:var(--gr);animation:fw-spin 6s linear infinite}",
    "@keyframes fw-spin{to{transform:rotate(360deg)}}",
    ".fw-name{font-weight:500;font-size:16px}",
    ".fw-x{margin-left:auto;background:none;border:none;color:var(--mu);font-size:16px;cursor:pointer}",
    ".fw-log{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}",
    ".fw-msg{margin:0;max-width:85%;padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.5;white-space:pre-wrap}",
    ".fw-a{align-self:flex-start;background:var(--sf)}.fw-u{align-self:flex-end;background:#1f3a68}",
    ".fw-dots{display:flex;gap:5px}.fw-dots span{width:7px;height:7px;border-radius:50%;animation:fw-b 1s infinite}",
    ".fw-dots span:nth-child(1){background:#4285f4}.fw-dots span:nth-child(2){background:#9b72cb;animation-delay:.15s}.fw-dots span:nth-child(3){background:#d96570;animation-delay:.3s}",
    "@keyframes fw-b{0%,100%{transform:none;opacity:.5}50%{transform:translateY(-4px);opacity:1}}",
    ".fw-links{display:flex;gap:8px}.fw-links a{padding:6px 12px;border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-size:13px;text-decoration:none}",
    ".fw-chips{display:flex;gap:6px;padding:0 12px 10px;overflow-x:auto}",
    ".fw-chips button{flex-shrink:0;padding:6px 12px;background:var(--sf);color:var(--tx);border:1px solid var(--bd);border-radius:14px;font-size:12px;cursor:pointer}",
    ".fw-chips .fw-lead-chip{border-color:#9b72cb}",
    ".fw-in{display:flex;gap:8px;padding:12px;border-top:1px solid var(--bd)}",
    ".fw-lead{display:flex;flex-direction:column;gap:8px;padding:12px;background:var(--sf);border-radius:14px}",
    ".fw-root input,.fw-root textarea{flex:1;padding:10px 12px;background:var(--sf);color:var(--tx);border:1px solid var(--bd);border-radius:12px;font:inherit;font-size:14px}",
    ".fw-lead input,.fw-lead textarea{background:var(--bg)}",
    ".fw-btn{padding:10px 16px;background:#4285f4;color:#fff;border:none;border-radius:12px;font-size:14px;cursor:pointer}.fw-btn:disabled{opacity:.5;cursor:default}",
    ".fw-err{margin:0;color:#f28b82;font-size:12px}",
    ".fw-root button:focus-visible,.fw-root input:focus-visible,.fw-root textarea:focus-visible,.fw-root a:focus-visible{outline:2px solid #4285f4;outline-offset:2px}",
    "@media(max-width:480px){.fw-root{right:12px;bottom:12px}.fw-panel{width:calc(100vw - 24px);bottom:72px}}",
    "@media(prefers-reduced-motion:reduce){.fw-av,.fw-dots span{animation:none}}"
  ].join("");

  var messages = [];
  var busy = false;

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  function init() {
    var style = el("style"); style.textContent = CSS; document.head.appendChild(style);

    var root = el("div", { "class": "fw-root" });
    var panel = el("section", { "class": "fw-panel", "aria-label": "Chat with Friday" });

    var head = el("div", { "class": "fw-head" });
    head.appendChild(el("span", { "class": "fw-av", "aria-hidden": "true" }));
    head.appendChild(el("span", { "class": "fw-name" }, "Friday"));
    var close = el("button", { "class": "fw-x", "aria-label": "Close chat" }, "✕");
    head.appendChild(close);

    var log = el("div", { "class": "fw-log" });

    var chips = el("div", { "class": "fw-chips" });
    CONFIG.suggestions.forEach(function (s) {
      var b = el("button", { type: "button" }, s);
      b.onclick = function () { send(s); };
      chips.appendChild(b);
    });
    var leadChip = el("button", { type: "button", "class": "fw-lead-chip" }, "Leave your info");
    leadChip.onclick = function () { showLead(); };
    chips.appendChild(leadChip);

    var form = el("form", { "class": "fw-in" });
    var input = el("input", { placeholder: "Ask about Sai's background", "aria-label": "Message" });
    var sendBtn = el("button", { type: "submit", "class": "fw-btn" }, "Send");
    form.appendChild(input); form.appendChild(sendBtn);
    form.onsubmit = function (e) { e.preventDefault(); send(input.value); };

    panel.appendChild(head); panel.appendChild(log); panel.appendChild(chips); panel.appendChild(form);

    var launch = el("button", { "class": "fw-launch", "aria-label": "Chat with Friday" }, "✦");
    function toggle(open) {
      panel.classList.toggle("open", open);
      launch.textContent = open ? "✕" : "✦";
      launch.setAttribute("aria-label", open ? "Close chat" : "Chat with Friday");
      if (open) input.focus();
    }
    launch.onclick = function () { toggle(!panel.classList.contains("open")); };
    close.onclick = function () { toggle(false); };

    root.appendChild(panel); root.appendChild(launch);
    document.body.appendChild(root);

    addMsg("assistant", CONFIG.welcome, false);
    var links = el("div", { "class": "fw-links" });
    CONFIG.links.forEach(function (l) {
      links.appendChild(el("a", { href: l.href, target: "_blank", rel: "noreferrer" }, l.label));
    });
    log.appendChild(links);

    function addMsg(role, text, record) {
      var p = el("p", { "class": "fw-msg " + (role === "user" ? "fw-u" : "fw-a") }, text);
      log.appendChild(p);
      log.scrollTop = log.scrollHeight;
      if (record !== false) messages.push({ role: role, content: text });
      return p;
    }

    function send(text) {
      text = (text || "").trim();
      if (!text || busy) return;
      busy = true; sendBtn.disabled = true; input.value = "";
      addMsg("user", text);

      var typing = el("p", { "class": "fw-msg fw-a fw-dots", "aria-label": "Friday is typing" });
      typing.innerHTML = "<span></span><span></span><span></span>";
      log.appendChild(typing); log.scrollTop = log.scrollHeight;

      fetch(CONFIG.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messages })
      })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (data) {
          var reply = (data.content || [])
            .filter(function (b) { return b.type === "text"; })
            .map(function (b) { return b.text; })
            .join("\n");
          typing.remove();
          addMsg("assistant", reply || "I couldn't generate a reply.");
        })
        .catch(function () {
          typing.remove();
          addMsg("assistant", "I'm having trouble connecting right now. You can leave your info and Sai will follow up.", false);
        })
        .then(function () { busy = false; sendBtn.disabled = false; });
    }

    function showLead() {
      if (log.querySelector(".fw-lead")) return;
      var f = el("form", { "class": "fw-lead" });
      var fields = [
        ["from_name", "Name"], ["from_email", "Email"], ["visitor_company", "Company"],
        ["visitor_role", "Role you're hiring for"]
      ].map(function (d) { var i = el("input", { name: d[0], placeholder: d[1] }); f.appendChild(i); return i; });
      var msg = el("textarea", { name: "visitor_message", placeholder: "Message (optional)", rows: "2" });
      f.appendChild(msg);
      var err = el("p", { "class": "fw-err" });
      var btn = el("button", { type: "submit", "class": "fw-btn" }, "Send details");
      f.appendChild(err); f.appendChild(btn);
      f.oninput = function () { err.textContent = ""; };

      f.onsubmit = function (e) {
        e.preventDefault();
        var name = fields[0].value.trim(), email = fields[1].value.trim();
        if (!name) { err.textContent = "Enter your name."; return; }
        if (!/^\S+@\S+\.\S+$/.test(email)) { err.textContent = "Enter a valid email."; return; }
        if (!window.emailjs) { err.textContent = "Email service didn't load. Reach Sai on LinkedIn."; return; }
        btn.disabled = true; btn.textContent = "Sending…";
        window.emailjs.send(CONFIG.emailjs.serviceId, CONFIG.emailjs.templateId, {
          from_name: name, from_email: email,
          visitor_company: fields[2].value.trim(), visitor_role: fields[3].value.trim(),
          visitor_message: msg.value.trim(), sent_at: new Date().toLocaleString()
        }, { publicKey: CONFIG.emailjs.publicKey })
          .then(function () {
            f.remove();
            addMsg("assistant", "Thanks, " + name + ". Sai has your details and will be in touch.", false);
          })
          .catch(function () {
            err.textContent = "Couldn't send. Try again or reach Sai on LinkedIn.";
            btn.disabled = false; btn.textContent = "Send details";
          });
      };

      log.appendChild(f);
      log.scrollTop = log.scrollHeight;
      fields[0].focus();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
