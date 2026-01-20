export async function handler(event) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN; // optional: https://your-site.netlify.app
  const origin = event.headers.origin || "";

  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors(origin, allowedOrigin), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Lock to your domain if ALLOWED_ORIGIN is set
  if (allowedOrigin && origin !== allowedOrigin) {
    return {
      statusCode: 403,
      headers: cors(origin, allowedOrigin),
      body: JSON.stringify({ error: "Forbidden" }),
    };
  }

  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch {}

  const order = String(body.order || "").trim();

  // Digits only, 4-12 length
  if (!/^\d{4,12}$/.test(order)) {
    return {
      statusCode: 400,
      headers: cors(origin, allowedOrigin),
      body: JSON.stringify({ error: "Invalid order number" }),
    };
  }

  const apiKey = process.env.POPCORN_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: cors(origin, allowedOrigin),
      body: JSON.stringify({ error: "Missing POPCORN_API_KEY" }),
    };
  }

  const res = await fetch("https://api.trypopcorn.ai/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "POPCORN-API-KEY": apiKey,
    },
    body: JSON.stringify({
      userId: `order_${order}`,
      message: `رقم طلبي: ${order}. أعطني حالة الطلب + شركة الشحن + رقم التتبع + رابط التتبع إن وجد.`,
    }),
  });

  const data = await res.json().catch(() => ({}));

  return {
    statusCode: 200,
    headers: cors(origin, allowedOrigin),
    body: JSON.stringify({ response: data?.response ?? "تعذر جلب البيانات حالياً" }),
  };
}

function cors(origin, allowed) {
  const allow = allowed ? (origin === allowed ? origin : "null") : origin;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}
