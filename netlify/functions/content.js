import { getStore } from '@netlify/blobs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const STORE_NAME = 'infinitex';
const CONTENT_KEY = 'content.json';

// Default content in case the blob store is empty
const DEFAULT_CONTENT = {
  global: {
    links: {
      store: 'https://infinitex.sa/',
      warrantyPolicy: 'https://infinitex.sa/blogs/gold-warranty-policy'
    },
    chipAfterSales: 'خدمات ما بعد البيع',
    nav: {
      home: 'الرئيسية',
      track: 'تتبع الطلب',
      returns: 'الاسترجاع',
      products: 'المنتجات',
      policy: 'سياسة الضمان الذهبي',
      store: 'المتجر'
    },
    mobileNav: {
      services: 'خدمات',
      track: 'تتبع',
      returns: 'استرجاع',
      products: 'منتجات',
      store: 'متجر'
    },
    media: {
      infinitexLogo: 'assets/brands/infinitex-logo.png',
      yammLogo: 'assets/brands/yamm-logo.png'
    }
  },
  yamm: {
    baseUrl: 'https://yamm.sa/store',
    hostname: 'infinitex.sa',
    phone: { countryCode: '966' },
    params: {
      hostname: 'hostname',
      order: 'order_number',
      phone: 'phone_number',
      countryCode: 'country_code'
    }
  },
  pages: {
    returns: {
      badge: 'استرجاع منظم وموثّق',
      title: 'اشترِ بثقة…<br/>واسترجع بكل وضوح',
      desc: 'صممنا “الضمان الذهبي” لتكون تجربة الشراء أكثر اطمئنانًا. من هذه الصفحة ستصل مباشرةً إلى السياسة الرسمية وتبدأ طلب الاسترجاع عبر “يم (Yamm)” بخطوات واضحة.',
      formTitle: 'ابدأ طلب الاسترجاع الآن',
      orderLabel: 'رقم الطلب',
      orderPlaceholder: 'مثال: 3455',
      phoneLabel: 'رقم الجوال',
      phonePlaceholder: '5XXXXXXXX',
      cta: 'ابدأ طلب الاسترجاع',
      policyCta: 'فتح السياسة الرسمية',
      helper: 'الشروط الرسمية والمدة وآلية الاسترجاع موجودة داخل صفحة “سياسة الضمان الذهبي”. هذه الصفحة هدفها توجيهك بسرعة إلى بوابة “يم” مع تمرير رقم الطلب والجوال.'
    },
    track: {
      badge: 'تتبع فوري بالذكاء الاصطناعي',
      title: 'تتبع طلبك مباشرة<br/>اكتب رقم الطلب وخلاص',
      desc: 'اكتب رقم الطلب بالأسفل. الوكيل مربوط عندنا ويعطيك تفاصيل التتبع فورًا داخل نفس الصفحة.',
      intro: 'أهلاً! اكتب رقم طلبك وسأرسل لك حالة الشحنة ورقم التتبع والرابط إن وجد.',
      orderPlaceholder: 'رقم الطلب (مثال: 12345)',
      cta: 'تتبع',
      hint: 'إذا عندك أي استفسار إضافي، تقدر تفتح الشات من أيقونة خدمة العملاء في يمين الشاشة.',
      openChat: 'فتح شات خدمة العملاء'
    },
    index: {
      badge: 'خدمات ما بعد البيع',
      title: 'كل ما تحتاجه بعد الشراء…\nفي صفحة واحدة',
      desc: 'تتبع الطلب، الاسترجاع، وسياسة الضمان الذهبي — بشكل واضح وسريع.',
      ctaTrack: 'تتبع الطلب',
      ctaReturns: 'بدء الاسترجاع',
      heroImage: 'assets/images/sound-pro-dark-grey.jpg'
    },
    products: {
      badge: 'منتجات INFINITEX',
      title: 'منتجاتنا',
      desc: 'استعرض أبرز المنتجات والمواصفات بشكل سريع.',
      ctaStore: 'زيارة المتجر'
    }
  }
};

export async function handler(event) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  const origin = event.headers.origin || '';
  const headers = corsHeaders(origin, allowedOrigin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const store = getStore(STORE_NAME);

  if (event.httpMethod === 'GET') {
    let content = await store.get(CONTENT_KEY, { type: 'json' }).catch(()=>null);
    if (!content) {
      content = DEFAULT_CONTENT;
      await store.set(CONTENT_KEY, JSON.stringify(DEFAULT_CONTENT)).catch(()=>{});
    }

    const jsonStr = JSON.stringify(content);
    const etag = 'W/"' + crypto.createHash('sha1').update(jsonStr).digest('hex') + '"';

    const inm = event.headers['if-none-match'] || event.headers['If-None-Match'];
    if (inm && inm === etag) {
      return { statusCode: 304, headers: { ...headers, ETag: etag } };
    }

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache', ETag: etag },
      body: jsonStr
    };
  }

  if (event.httpMethod === 'PUT') {
    const auth = verifyAuth(event.headers);
    if (!auth.ok) {
      return { statusCode: auth.code, headers, body: JSON.stringify({ error: auth.error }) };
    }

    let body = null;
    try { body = JSON.parse(event.body || 'null'); } catch {}

    if (!body || typeof body !== 'object') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }

    // Size guard
    const raw = JSON.stringify(body);
    if (raw.length > 120000) {
      return { statusCode: 413, headers, body: JSON.stringify({ error: 'Content too large' }) };
    }

    await store.set(CONTENT_KEY, raw);

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true })
    };
  }

  return { statusCode: 405, headers, body: 'Method Not Allowed' };
}

function corsHeaders(origin, allowedOrigin) {
  const allow = allowedOrigin ? (origin === allowedOrigin ? origin : 'null') : (origin || '*');
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
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
