// api/miral-chat.js — Vercel Serverless Function (standalone, simple)
export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*"); 
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  // --- GET para probar ---
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, message: "Miral API working ✅" });
  }

  // --- Solo aceptamos POST para el chat ---
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // --- Respuesta por defecto (si falla OpenAI) ---
  const FALLBACK = `Sí, manejamos anillos de matrimonio en oro 10K/14K y más.
Escríbenos por WhatsApp: https://wa.me/13055103730
—
Yes, we carry 10K/14K wedding rings and more.
Message us on WhatsApp: https://wa.me/13055103730`;

  try {
    const { messages } = JSON.parse(req.body || "{}");

    if (!process.env.OPENAI_API_KEY) {
      return res.status(200).json({ reply: FALLBACK, source: "no-api-key" });
    }

    const systemPrompt = `
You are the Miral Jewelers Assistant.
Answer clearly, friendly, in ES/EN depending on user.

Brand:
- 10K & 14K authentic gold (not plated)
- Fast shipping in USA
- Easy returns, Klarna/Afterpay
- Based in Miami

Collections:
- Wedding Rings: /collections/wedding-rings
- Cuban Chains: /collections/cuban-link
- Monaco: /collections/monaco
- Bracelets: /collections/bracelets
- Earrings: /collections/earrings
- Men: /collections/men
- Women: /collections/women
- Clearance: /collections/clearance

Rules:
- Don’t invent stock/prices
- If unsure → give WhatsApp: https://wa.me/13055103730
`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, ...(messages || [])],
      }),
    });

    if (!r.ok) return res.status(200).json({ reply: FALLBACK, source: `http-${r.status}` });

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || FALLBACK;

    return res.status(200).json({ reply, source: "openai" });
  } catch (e) {
    return res.status(200).json({ reply: FALLBACK, source: "exception", error: String(e) });
  }
}
