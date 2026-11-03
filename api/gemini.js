const MAX_MESSAGE_LENGTH = 12000;
const DEFAULT_MODEL = "gemini-2.5-flash";

async function handler(req, res) {
  if (typeof res.setHeader === "function") {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const origin = req.headers?.origin;
  const host = req.headers?.host;
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return res.status(403).json({ error: "Cross-origin request blocked" });
      }
    } catch {
      return res.status(403).json({ error: "Invalid request origin" });
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "AI service is not configured" });
  }

  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: "message must be between 1 and 12000 characters" });
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) {
    return res.status(500).json({ error: "AI service configuration is invalid" });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 2048 },
        }),
        signal: AbortSignal.timeout(25000),
      },
    );

    if (!response.ok) {
      return res.status(502).json({ error: "AI provider request failed" });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part) => typeof part.text === "string" ? part.text : "")
      .join("")
      .trim();

    if (!text) {
      return res.status(502).json({ error: "AI provider returned no text" });
    }

    return res.status(200).json({ text });
  } catch {
    return res.status(502).json({ error: "AI provider is temporarily unavailable" });
  }
}

module.exports = handler;
