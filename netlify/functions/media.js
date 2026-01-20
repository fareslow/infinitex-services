import { getStore } from '@netlify/blobs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const STORE_NAME = 'infinitex';

export async function handler(event) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  const origin = event.headers.origin || '';
  const headers = corsHeaders(origin, allowedOrigin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const store = getStore(STORE_NAME);

  if (event.httpMethod === 'GET') {
    const key = (event.queryStringParameters && event.queryStringParameters.key) ? String(event.queryStringParameters.key) : '';
    if (!key || !key.startsWith('media/')) {
      return { statusCode: 400, headers, body: 'Bad Request' };
    }

    const metaKey = key + '.meta.json';
    const meta = await store.get(metaKey, { type: 'json' }).catch(()=>null) || {};
    const ct = meta.contentType || 'application/octet-stream';

    const ab = await store.get(key, { type: 'arrayBuffer' }).catch(()=>null);
    if (!ab) return { statusCode: 404, headers, body: 'Not Found' };

    const buf = Buffer.from(ab);

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=31536000, immutable'
      },
      isBase64Encoded: true,
      body: buf.toString('base64')
    };
  }

  if (event.httpMethod === 'POST') {
    const auth = verifyAuth(event.headers);
    if (!auth.ok) {
      return { statusCode: auth.code, headers, body: JSON.stringify({ error: auth.error }) };
    }

    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch {}

    const dataUrl = String(body.dataUrl || '');
    const filename = String(body.filename || 'upload');

    const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid dataUrl' }) };
    }

    const contentType = m[1];
    const b64 = m[2];
    const buf = Buffer.from(b64, 'base64');

    // ~2.5MB limit guard
    if (buf.length > 2_500_000) {
      return { statusCode: 413, headers, body: JSON.stringify({ error: 'File too large (max ~2.5MB)' }) };
    }

    const ext = extFromContentType(contentType) || extFromFilename(filename) || 'bin';
    const id = crypto.randomBytes(10).toString('hex');
    const key = `media/${Date.now()}_${id}.${ext}`;
    const metaKey = key + '.meta.json';

    await store.set(key, buf);
    await store.set(metaKey, JSON.stringify({ contentType, filename, size: buf.length }));

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        key,
        url: `/api/media?key=${encodeURIComponent(key)}`
      })
    };
  }

  return { statusCode: 405, headers, body: 'Method Not Allowed' };
}

function corsHeaders(origin, allowedOrigin) {
  const allow = allowedOrigin ? (origin === allowedOrigin ? origin : 'null') : (origin || '*');
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin'
  };
}

function verifyAuth(headers) {
  const token = (headers.authorization || headers.Authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false, code: 401, error: 'Missing token' };

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) return { ok: false, code: 500, error: 'Server not configured' };

  try {
    jwt.verify(token, jwtSecret);
    return { ok: true };
  } catch {
    return { ok: false, code: 401, error: 'Invalid token' };
  }
}

function extFromContentType(ct){
  const map = {
    'image/png':'png',
    'image/jpeg':'jpg',
    'image/jpg':'jpg',
    'image/webp':'webp',
    'image/svg+xml':'svg'
  };
  return map[String(ct||'').toLowerCase()] || null;
}

function extFromFilename(name){
  const m = String(name||'').toLowerCase().match(/\.([a-z0-9]{2,5})$/);
  return m ? m[1] : null;
}
