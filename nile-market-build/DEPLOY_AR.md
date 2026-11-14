# سوق النيل — تعليمات النشر والاستضافة

## ما الذي يحتويه هذا الملف؟
هذا أرشيف المشروع المصدري بعد إضافة إعدادات نشر جاهزة لـ Netlify وVercel واستضافة Apache/cPanel. المنصة مبنية باستخدام React وVite، لذلك يجب تنفيذ عملية البناء أولاً لإنتاج مجلد `dist`.

## المتطلبات
- Node.js 22 أو إصدار LTS حديث متوافق مع Vite 8.
- حساب Firebase صالح للمصادقة وقاعدة Firestore.

## النشر على Netlify
1. ارفع هذا المجلد إلى مستودع GitHub.
2. من Netlify اختر Add new site ثم Import an existing project واربط المستودع.
3. استخدم إعدادات البناء التالية (موجودة مسبقاً في `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `dist`
4. ابدأ النشر.

## النشر على Vercel
1. ارفع المشروع إلى GitHub.
2. استورد المستودع من Vercel.
3. Framework: Vite، وأمر البناء `npm run build`، ومجلد الإخراج `dist`.
4. ملف `vercel.json` يضبط إعادة توجيه المسارات إلى تطبيق React تلقائياً.

## النشر على cPanel أو Apache
1. على جهازك أو بيئة البناء شغّل:
   ```bash
   npm install
   npm run build
   ```
2. ارفع **محتويات** مجلد `dist` إلى `public_html`، وليس مجلد المشروع كله.
3. إذا كان الخادم Apache، أنشئ ملف `.htaccess` داخل `public_html` بالمحتوى التالي:
   ```apache
   Options -MultiViews
   RewriteEngine On
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule ^ index.html [L]
   ```

## التشغيل محلياً
```bash
npm install
npm run dev
```
ثم افتح العنوان الذي يظهر في الطرفية.

## قاعدة البيانات وتسجيل الدخول — مهم
الكود الحالي مربوط بـ **Firebase Authentication وCloud Firestore** عبر `firebase-applet-config.json`، وليس بقاعدة MySQL. لا تضع بيانات اتصال MySQL داخل ملفات الواجهة الأمامية أو داخل مستودع عام؛ أي كلمة مرور أو اتصال قاعدة بيانات يجب أن يكون في خادم خلفي آمن ومتغيرات بيئة على الخادم.

قبل الإطلاق:
- راجع قواعد Firestore الموجودة في `firestore.rules` وانشرها على مشروع Firebase الصحيح.
- فعّل Google sign-in في Firebase Authentication.
- أضف نطاق الموقع المنشور إلى Authorized domains في Firebase Authentication.
- اختبر إنشاء الحساب/تسجيل الدخول، إضافة إعلان، الصور، المفضلة ولوحة الإدارة.
- لا تعتمد على إخفاء عناصر لوحة الإدارة في الواجهة كوسيلة حماية؛ يجب أن تفرض قواعد Firestore الصلاحيات على الخادم.

## ملاحظة عن ملف البناء
هذا الأرشيف يحتوي على المصدر وإعدادات الاستضافة. لم أرفق مجلد `dist` جاهزاً لأن تثبيت حزم المشروع تعذّر في بيئة التجهيز بسبب انتهاء مهلة الاتصال بمستودع الحزم. عند استيراد المشروع إلى Netlify أو Vercel ستُثبت المنصة الاعتماديات وتنفذ `npm run build` تلقائياً.
