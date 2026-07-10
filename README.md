# نظام إتلاف الوثائق — Records Destruction System

نظام داخلي لإدارة طلبات إتلاف الوثائق، مُعاد بناؤه وفق دليل المكتب الفني لتطوير المواقع الإلكترونية.

## التقنيات
| الطبقة | التقنية |
|---|---|
| الواجهة الأمامية | Angular 21 + Bootstrap 5 (ثنائي اللغة عربي/إنجليزي مع RTL/LTR) |
| الواجهة الخلفية | .NET 10 Web API — Clean Architecture |
| قاعدة البيانات | SQL Server 2025 |
| المصادقة | ASP.NET Identity + JWT |
| التقارير | QuestPDF (نموذج الإتلاف) + ClosedXML (كشف Excel) |

## هيكل المشروع
```
backend/
  RecordsDestruction.sln
  src/
    RecordsDestruction.Domain/          # الكيانات وقواعد العمل (بدون تبعيات)
    RecordsDestruction.Application/     # الواجهات، DTOs، خدمات حالات الاستخدام
    RecordsDestruction.Infrastructure/  # EF Core، Identity، PDF/Excel، JWT
    RecordsDestruction.Api/             # Controllers، Middleware، الإعدادات
frontend/                               # تطبيق Angular 21
docs/                                   # وثائق المشروع (BRD/TAD/HLD/LLD)
```

## التشغيل محليًا

### المتطلبات
- .NET 10 SDK
- Node.js 22+ و npm
- SQL Server (نسخة محلية أو Developer Edition)

### 1) إعداد الأسرار (لا تُكتب أي أسرار داخل الملفات)
```bash
cd backend/src/RecordsDestruction.Api
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "<سلسلة الاتصال>"
dotnet user-secrets set "Jwt:Key" "<مفتاح عشوائي 64+ حرف>"
dotnet user-secrets set "Seed:AdminEmail" "<بريد المدير>"
dotnet user-secrets set "Seed:AdminPassword" "<كلمة مرور قوية>"
```

### 2) قاعدة البيانات
```bash
cd backend
dotnet tool install --global dotnet-ef
dotnet ef migrations add InitialCreate --project src/RecordsDestruction.Infrastructure --startup-project src/RecordsDestruction.Api
# الترحيل يتم تلقائيًا عند تشغيل الـ API (MigrateAsync)
```

### 3) تشغيل الواجهة الخلفية
```bash
dotnet run --project src/RecordsDestruction.Api
```

### 4) تشغيل الواجهة الأمامية
```bash
cd frontend
npm install
npm start   # http://localhost:4200
```

## الأمان
- Soft delete فقط — لا يوجد حذف فعلي لأي سجل (متوافق مع قانون حماية البيانات الشخصية).
- CORS مقيّد بالنطاقات المصرّح بها في الإعدادات.
- Rate limiting عام + حد أشد صرامة على تسجيل الدخول.
- ترويسات أمنية (CSP، X-Frame-Options، nosniff...) على كل استجابة.
- سياسة كلمات مرور متوافقة مع OWASP + قفل الحساب بعد 5 محاولات فاشلة.
- لا توجد أي أسرار أو بيانات اعتماد داخل المستودع.

## ملاحظات
- صور الشعار (`wwwroot/images/Ministrylogo.png` وغيرها) غير مضمّنة في المستودع؛ أضفها محليًا لتظهر في ملفات PDF.
- وثائق المشروع (BRD/TAD/HLD/LLD وقاموس البيانات) تُعد بالتنسيق مع مشرف المكتب الفني — راجع `docs/README.md`.
