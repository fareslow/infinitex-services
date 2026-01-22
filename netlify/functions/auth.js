const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const COOKIE_NAME = 'ix_admin_token';
const TOKEN_TTL_SECONDS = 8 * 60 * 60;

const base64url = (input) => Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const signToken = (payload, secret) => {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${header}.${body}.${signature}`;
};

const verifyToken = (token, secret) => {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  if (signature !== expected) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    if (!data.exp || Date.now() > data.exp) return null;
    return data;
  } catch (error) {
    return null;
  }
};

const parseCookies = (cookieHeader) => {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, part) => {
    const [key, ...rest] = part.trim().split('=');
    acc[key] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
};

exports.handler = async (event) => {
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const jwtSecret = process.env.JWT_SECRET;

  if (!passwordHash || !jwtSecret) {
    return {
      statusCode: 500,
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify({ authorized: false, message: 'Missing server configuration.' })
    };
  }

  if (event.httpMethod === 'GET') {
    const cookies = parseCookies(event.headers.cookie || event.headers.Cookie);
    const token = cookies[COOKIE_NAME];
    const session = verifyToken(token, jwtSecret);
    return {
      statusCode: 200,
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify({ authorized: Boolean(session), exp: session ? session.exp : null })
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Allow': 'GET, POST', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ authorized: false })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (error) {
    body = {};
  }

  if (!body.password) {
    return {
      statusCode: 400,
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify({ authorized: false })
    };
  }

  const matches = await bcrypt.compare(String(body.password), passwordHash);
  if (!matches) {
    return {
      statusCode: 401,
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify({ authorized: false })
    };
  }

  const exp = Date.now() + TOKEN_TTL_SECONDS * 1000;
  const token = signToken({ exp }, jwtSecret);
  const secure = event.headers.host && !event.headers.host.includes('localhost');
  const cookie = `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${TOKEN_TTL_SECONDS}; SameSite=Lax${secure ? '; Secure' : ''}`;

  return {
    statusCode: 200,
    headers: {
      'Set-Cookie': cookie,
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify({ authorized: true, exp })
  };
};
