# INFINITEX — تتبع الطلب Inline (Popcorn)

هذه الصفحة (track.html) تحتوي شات داخل الصفحة (Inline) لجلب تتبع الطلب تلقائياً عبر Popcorn Chat API.

## لماذا نحتاج Proxy؟
Popcorn API يتطلب `POPCORN-API-KEY` في الهيدر. هذا المفتاح لا يجب وضعه داخل كود الواجهة (Front-end) لأنه سيتسرب.

## إعداد Cloudflare Worker
1) أنشئ Worker جديد.
2) أضف Secret باسم: `POPCORN_API_KEY` (قيمته هي API key من Popcorn).
3) انسخ محتوى `cloudflare-worker.js` داخل Worker.
4) انشره.

سيكون رابطك عادةً مثل:
- `https://YOUR-WORKER.workers.dev/chat`

## ربط الرابط داخل الموقع
في `track.html` ابحث عن:
```js
const POPCORN_PROXY_URL = window.IX_POPCORN_PROXY_URL || 'REPLACE_WITH_YOUR_PROXY_URL';
```
واستبدلها (أو عرّف متغير `window.IX_POPCORN_PROXY_URL` قبلها) إلى رابط البروكسي.

ملاحظة: إذا تستخدم نفس الدومين لاستضافة الـWorker، يمكنك ضبط CORS ليكون محدوداً لدومينك بدل `*`.
