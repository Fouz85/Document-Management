# CLAUDE.md — قواعد العمل على هذا المشروع

هذا الملف يعرّف أدوات الذكاء الاصطناعي (Claude Code وغيرها) بقواعد المشروع الإلزامية المستمدة من دليل المكتب الفني.

## التقنيات المعتمدة (لا تُستبدل)
- Backend: .NET 10 / C#، معمارية Clean Architecture (Domain → Application → Infrastructure → Api).
- Frontend: Angular 21 (standalone components + signals + zoneless)، Bootstrap 5.
- Database: SQL Server 2025 عبر EF Core (بدون SQL خام إلا للضرورة القصوى).

## قواعد إلزامية
1. **الحذف الناعم فقط (Soft Delete):** ممنوع أي حذف فعلي من قاعدة البيانات. كل الكيانات ترث `BaseEntity` وفيها `IsDeleted/DeletedAt`، ويوجد `SoftDeleteInterceptor` كشبكة أمان و`HasQueryFilter` على كل كيان. لا تتجاوز هذه الآلية.
2. **ممنوع الأسرار في الكود أو Git:** لا connection strings حقيقية، لا مفاتيح JWT، لا كلمات مرور — حتى في الأمثلة. استخدم user-secrets محليًا ومتغيرات البيئة في الإنتاج. `appsettings.json` يحتوي على قيم فارغة فقط.
3. **ثنائية اللغة من البداية:** كل نص واجهة يُضاف في `frontend/public/i18n/ar.json` و`en.json` معًا ويُستدعى عبر `I18nService.t()`. ممنوع أي نص عربي أو إنجليزي مكتوب مباشرة في القوالب. الاتجاه RTL/LTR يتبدل تلقائيًا مع اللغة.
4. **الأمان بالتصميم:** أي endpoint جديد يجب أن يكون `[Authorize]` افتراضيًا، مع تحقق من ملكية البيانات (المستخدم يرى بياناته فقط ما لم يكن Admin). التحقق من صحة المدخلات على الطرفين (DataAnnotations + Angular Validators).
5. **الهوية البصرية:** اللون الأساسي عنابي `#8a1538` (متغيرات CSS في `styles.css`). الشعار يطابق لغة الواجهة (عربي في RTL، إنجليزي في LTR).
6. **Git:** فرع لكل ميزة (`feature/<name>`)، رسائل commit واضحة وموجزة، ممنوع الدمج المباشر في `main` بدون مراجعة.



## أوامر شائعة
```bash
# Backend
dotnet build backend/RecordsDestruction.sln
dotnet run --project backend/src/RecordsDestruction.Api
dotnet ef migrations add <Name> --project backend/src/RecordsDestruction.Infrastructure --startup-project backend/src/RecordsDestruction.Api

# Frontend
cd frontend && npm start
cd frontend && npm run build
```

## بنية النطاق (Domain)
`DestructionRequest` (طلب الإتلاف) → `DestructionRecord[]` (سطور الوثائق) + 4 كتل توقيع (الوحدة المنشئة، الشؤون القانونية، التدقيق الداخلي، إدارة الوثائق) محفوظة كصور base64. الحالات: Draft / Submitted / Approved / Rejected. الإدارات هرمية: `Department` → `SubDepartment` (ذاتية التداخل عبر ParentId).
