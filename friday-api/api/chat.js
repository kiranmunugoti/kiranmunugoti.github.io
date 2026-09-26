// Vercel serverless function: POST /api/chat
// Set ANTHROPIC_API_KEY in Vercel > Settings > Environment Variables.
import { extractText, getDocumentProxy } from "unpdf";

const SITE = "https://kiranmunugoti.github.io";
const ALLOWED_ORIGINS = [SITE, "http://localhost:5173", "http://localhost:3000"];
const CACHE_MS = 60 * 60 * 1000; // refresh site content every hour

// Optional: anything not in the resume you want Friday to know.
const EXTRA_NOTES = ``;

let cache = { text: "", at: 0 };

async function loadSiteContent() {
  if (cache.text && Date.now() - cache.at < CACHE_MS) return cache.text;

  const parts = [];

  try {
    const buf = await (await fetch(`${SITE}/resume.pdf`)).arrayBuffer();
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: true });
    parts.push(`--- RESUME ---\n${text.trim()}`);
  } catch (e) {
    console.error("resume.pdf failed:", e);
  }

  try {
    const cfg = await (await fetch(`${SITE}/repos-config.json`)).json();
    const projects = (cfg.repositories || [])
      .map((p) => `- ${p.name} (${p.year}): ${p.description} [${(p.tags || []).join(", ")}]`)
      .join("\n");
    parts.push(`--- PORTFOLIO PROJECTS ---\n${projects}`);
  } catch (e) {
    console.error("repos-config.json failed:", e);
  }

  if (EXTRA_NOTES.trim()) parts.push(`--- ADDITIONAL NOTES ---\n${EXTRA_NOTES.trim()}`);

  const text = parts.join("\n\n");
  if (text) cache = { text, at: Date.now() };
  return text || cache.text;
}

function buildSystemPrompt(content) {
  return `You are Friday, Sai Kiran Munugoti's AI assistant on his portfolio website (${SITE}).
You answer recruiters' and hiring managers' questions about Sai's background.

Rules:
- Answer only from the content below. Never invent employers, dates, skills, or numbers.
- If something isn't covered (salary, availability dates, visa, references), say you don't have that
  and suggest they use "Leave your info" so Sai can follow up.
- Do not share Sai's phone number or email address. Direct people to "Leave your info" or LinkedIn instead.
- Keep answers to 2-4 sentences, plain text, no markdown headings.
- Stay on topic. Politely decline unrelated requests.

${content || "(Site content is temporarily unavailable. Ask the visitor to leave their info.)"}`;
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return res.status(403).json({ error: "Forbidden" });

  const { messages } = req.body || {};
  const valid =
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.length <= 40 &&
    messages.every(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.length <= 2000
    );
  if (!valid) return res.status(400).json({ error: "Invalid request" });

  try {
    const content = await loadSiteContent();
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: buildSystemPrompt(content),
        messages: messages.slice(-12),
      }),
    });

    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: "Upstream request failed" });
  }
}
