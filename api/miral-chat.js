export default async function handler(req, res) {
  // CORS (keep * while testing; later lock to your domain)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method === "GET") {
    return res.status(200).json({ ok: true, route: "miral-chat", message: "API working ✅" });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const FALLBACK = "WhatsApp: https://wa.me/13055103730";
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const { messages = [{ role: "user", content: "Hello" }] } = body;

  const hasKey = !!process.env.OPENAI_API_KEY;

  try {
    if (!hasKey) {
      return res.status(200).json({ reply: FALLBACK, source: "no-api-key", diag: { hasKey } });
    }

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.5,
        messages: [
          { role: "system", content: "You are Miral Jewelers assistant. Answer ES/EN, mention collections, offer WhatsApp if unsure." },
          ...messages,
        ],
      }),
    });

    const status = r.status;
    if (!r.ok) {
      const errText = await r.text().catch(() => "(no body)");
      return res.status(200).json({
        reply: FALLBACK,
        source: `http-${status}`,
        diag: { hasKey, status, error: errText.slice(0, 600) },
      });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || FALLBACK;
    return res.status(200).json({ reply, source: "openai", diag: { hasKey, status: 200 } });
  } catch (e) {
    return res.status(200).json({ reply: FALLBACK, source: "exception", diag: { hasKey, error: String(e) } });
  }
}
