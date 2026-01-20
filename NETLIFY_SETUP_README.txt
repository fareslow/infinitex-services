INFINITEX Services — Netlify (GitHub) + لوحة تحكم Live

1) ارفع هذا المجلد إلى GitHub Repo (كل الملفات كما هي).

2) على Netlify:
   - New site from Git → اختر الريبو → Deploy

3) Netlify → Site configuration → Environment variables (مهم)
   - POPCORN_API_KEY = مفتاح Popcorn (لتتبع الطلب)
   - JWT_SECRET = سر لتوقيع التوكن (اقترح 32+ حرف عشوائي)
   - ADMIN_PASSWORD_HASH = هاش bcrypt لكلمة مرور الأدمن
     (ملاحظة: كلمة المرور الحقيقية لا تُحفظ في الكود ولا في المتصفح)

   قيم جاهزة (كما طلبت) لضبط كلمة مرور الأدمن على: AdminFares
   - ADMIN_PASSWORD_HASH = $2b$12$GUL/IsxxLy4M7LDykFXvn.0eb1Eklg42CGDV8tNZxZ5igH2qgSbf6
   - JWT_SECRET (مثال جاهز) = YDmu7zV3o84GPdfs-Esr63fMTy_PC9Zc8EbWZFFW6ag
     (تقدر تغيّره لأي قيمة عشوائية أخرى في أي وقت)

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
   - /api/content  → قراءة/تحديث المحتوى (Netlify Blobs)
   - /api/media    → رفع/قراءة الوسائط (Netlify Blobs)
   - /admin        → لوحة التحكم (تسجيل دخول)

اختبار سريع بعد النشر:
- افتح /admin وسجّل الدخول
- عدّل نص/صورة واضغط (حفظ ونشر)
- افتح returns.html أو index.html وراقب التغيير (خلال ثواني)
