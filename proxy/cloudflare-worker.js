/**
 * INFINITEX — Popcorn Proxy (Cloudflare Worker)
 *
 * هدفه: حماية POPCORN-API-KEY (لا يُوضع داخل الموقع).
 *
 * 1) انشئ Cloudflare Worker
 * 2) ضع Secret باسم POPCORN_API_KEY
 * 3) انشره على رابط مثل: https://ix-popcorn-proxy.YOURSUBDOMAIN.workers.dev
 * 4) داخل track.html ضع:
 *    window.IX_POPCORN_PROXY_URL = 'https://ix-popcorn-proxy.YOURSUBDOMAIN.workers.dev/chat';
 */

export default {
  async fetch(request, env) {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json; charset=utf-8',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/chat') {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
    }

    const { userId, message } = body || {};
    if (!userId || !message) {
      return new Response(JSON.stringify({ error: 'userId and message are required' }), { status: 400, headers });
    }

    const res = await fetch('https://api.trypopcorn.ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'POPCORN-API-KEY': env.POPCORN_API_KEY,
      },
      body: JSON.stringify({ userId, message }),
    });

    const data = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(data), { status: res.status, headers });
  },
};
