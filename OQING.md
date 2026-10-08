# Bek va Lola: Sayohat v2 — TO'LIQ (server baholaydi, savollar bazada)

Bu zip o'yinni **to'liq v2** ga o'tkazadi. Ichidagi `artifacts/` va `migrations/` papkalarining
O'ZINI GitHub'ga joylang (o'rovchi papka YO'Q).

## ⚠️ Eng muhim 2 narsa
1. **Sizning eski "v2" `015_sayohat.sql` ni ISHLATMANG.** U chala edi (faqat SQL, kod yo'q, eski
   jadvallar bilan to'qnashardi). Bu zipdagi `015_sayohat.sql` — ASLIDAGI (v1) versiya, uni saqlang.
   Barcha v2 jadvallari YANGI `017_sayohat_v2.sql` da — eski bazangizni buzmaydi.
2. Shundan keyin **savollar admin paneldan qo'shiladi** (kodda emas): «Sayohat → Boshqaruv → Savollarni boshqarish».

## v2 da nima o'zgardi (haqiqatan ishlaydi)
- **Savollar bazada** (`sayohat_questions`) — kodga tegmasdan admin paneldan qo'shasiz/tahrirlaysiz/o'chirasiz.
- **Serverda baholash + anti-cheat:** to'g'ri javob o'quvchiga HECH QACHON yuborilmaydi. O'quvchi variant
  tanlaydi → server tekshiradi → natija va tushuntirish qaytadi. Tanga har viloyatdan FAQAT bir marta beriladi.
- **Admin savol boshqaruvi:** `/sayohat/admin/savollar` — viloyat tanlanadi, daraja (oson/o'rta/qiyin),
  2–6 variant, to'g'risini belgilash, ball, maslahat, tushuntirish.
- **Statistika:** `/sayohat/admin` — o'yinchilar soni, savollar soni, tanga, har viloyat bo'yicha
  tugatganlar, eng faol o'yinchilar.
- **Ochilish vaqti + ko'rinish:** har viloyatni admin vaqt bilan ochadi yoki butunlay yashiradi.
- **Offline:** holat localStorage'da zaxira, internet qaytganda sinxron.
- Xarita ko'rinishi, qahramon tanlash, daraja, qulf (SAYOHAT_LOCKED) — avvalgidek.

## Ichidagi fayllar
Yangi:
- `migrations/017_sayohat_v2.sql` — v2 jadvallari (regions, questions, user_progress, awards) + 14 viloyat + namuna savollar
- `artifacts/platform/src/pages/sayohat/admin-questions.tsx` — savol boshqaruvi sahifasi

O'zgargan:
- `migrations/015_sayohat.sql` — ASLIGA qaytarilgan (v1) — sizdagi noto'g'ri v2 ni bosib yozadi
- `artifacts/api-server/migrate.mjs` — 017 ro'yxatga qo'shildi
- `artifacts/api-server/src/routes/sayohat.ts` — v2 API (server baholash + admin CRUD + stats)
- `artifacts/platform/src/lib/sayohat-progress.ts` — yangi API chaqiruvlari + offline
- `artifacts/platform/src/pages/sayohat/sayohatData.ts` — faqat xarita metasi (savollar bazadan)
- `artifacts/platform/src/pages/sayohat/index.tsx` — serverdagi viloyat/vaqt/savol sonidan foydalanadi
- `artifacts/platform/src/pages/sayohat/play.tsx` — serverdan savol, serverga javob, natija+tahlil
- `artifacts/platform/src/pages/sayohat/admin.tsx` — vaqt + ko'rinish + statistika
- `artifacts/platform/src/App.tsx` — `/sayohat/admin/savollar` route

## Deploy
1. `artifacts/` va `migrations/` papkalarini GitHub'ga joylang (ustiga yoziladi).
2. Render build qiladi; migratsiyalar (015, 016, 017) o'zi ishga tushadi.
3. Admin bo'lib kiring → «Sayohat → Boshqaruv → Savollarni boshqarish» → savollar qo'shing.
4. O'yinni ochish: `sayohatData.ts` dagi `SAYOHAT_LOCKED = true` → `false`, qayta deploy.

## Eslatma
- Namuna savollar (Farg'ona, Andijon) 017 da bor — sinab ko'rish uchun. Qolganini o'zingiz qo'shasiz.
- Bot token / baza parollari YANGI bo'lsin (oldin ochilganlarini ishlatmang).
