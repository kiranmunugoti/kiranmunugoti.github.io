// Vercel serverless function: POST /api/chat
// Set ANTHROPIC_API_KEY in Vercel > Settings > Environment Variables.

const ALLOWED_ORIGINS = [
  "https://kiranmunugoti.github.io",
  "http://localhost:5173",
  "http://localhost:3000",
];

const SYSTEM_PROMPT = `You are Friday, Sai Kiran Munugoti's AI assistant on his portfolio website.
You answer recruiters' and hiring managers' questions about Sai's background.

Rules:
- Answer only from the resume and project details below. Never invent employers, dates, skills, or numbers.
- If something isn't covered (salary, availability dates, visa, references), say you don't have that
  and suggest they use "Leave your info" so Sai can follow up.
- Keep answers to 2-4 sentences, plain text, no markdown headings.
- Stay on topic. Politely decline unrelated requests.

--- RESUME ---
(paste resume text here)

--- PORTFOLIO PROJECTS ---
(paste short summaries of each project here)
`;

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
        system: SYSTEM_PROMPT,
        messages: messages.slice(-12),
      }),
    });

    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: "Upstream request failed" });
  }
}
