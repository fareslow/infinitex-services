import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function handler(event) {
  // CORS (allow same-origin by default)
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  const origin = event.headers.origin || '';
  const headers = corsHeaders(origin, allowedOrigin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {}

  const password = String(body.password || '');
  const hash = process.env.ADMIN_PASSWORD_HASH;
  const jwtSecret = process.env.JWT_SECRET;

  if (!hash || !jwtSecret) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server not configured' }) };
  }

  // Basic anti-bruteforce: optional small delay
  await sleep(250);

  const ok = bcrypt.compareSync(password, hash);
  if (!ok) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid credentials' }) };
  }

  const token = jwt.sign(
    { sub: 'admin', role: 'admin' },
    jwtSecret,
    { expiresIn: '12h' }
  );

  return {
    statusCode: 200,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, expiresIn: 43200 })
  };
}

function corsHeaders(origin, allowedOrigin) {
  const allow = allowedOrigin ? (origin === allowedOrigin ? origin : 'null') : (origin || '*');
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin'
  };
}

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
