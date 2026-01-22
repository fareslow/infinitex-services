INFINITEX Services — Netlify (GitHub)

1) ارفع هذا المجلد إلى GitHub Repo (كل الملفات كما هي).

2) على Netlify:
   - New site from Git → اختر الريبو → Deploy

3) Netlify → Site configuration → Environment variables (مهم)
   - POPCORN_API_KEY = مفتاح Popcorn (لتتبع الطلب)

   اختياري (أمان إضافي):
   - ALLOWED_ORIGIN = رابط موقعك بالضبط (مثال: https://xxxxx.netlify.app)

   ملاحظة مهمة لميزة Netlify Blobs:
   - في كثير من الحالات Netlify يضبط Blobs تلقائياً داخل Functions.
   - إذا ظهرت لك رسالة: MissingBlobsEnvironmentError / Server not configured عند الحفظ
     أضف المتغيرات التالية (لتفعيل "API mode"):
     - NETLIFY_SITE_ID = Project ID (Site ID) من Netlify
     - NETLIFY_AUTH_TOKEN = Personal Access Token من Netlify (يكون له صلاحية على حسابك)

4) الروابط داخل المشروع:
   - /api/track    → تتبع الطلب (Netlify Function)
   - /api/content  → قراءة المحتوى (Netlify Blobs)
   - /api/media    → رفع/قراءة الوسائط (Netlify Blobs)
