# Faza 1A + 1B — Tuman platformasi poydevori + kirish/kod (KUMULYATIV)

Bu zip Faza 1A va 1B ni BIRGA o'z ichiga oladi. Faqat shuni yuklasangiz yetadi
(oldingi "faza1A" zipni alohida yuklash shart emas — bu uni ham qamraydi).

## Faza 1A (poydevor) — xavfsiz, non-breaking
- `maktablar` jadvali + hamma asosiy jadvalga `maktab_id` (default 3). Mavjud ma'lumot 3-maktabda.
- `classes.name` har maktab ichida yagona.
- Admin: "Tuman boshqaruvi → Maktablar" sahifasi — maktab qo'shish/tahrir/faollik/o'chirish.

## Faza 1B (kirish / kod / maktab yozuvi) — YANGI
- **Kirish kodi maktab bilan:** 3-maktab eski 5 xonali qoladi; boshqa maktablar — maktab raqami + 5 xona
  (1-maktab → 1xxxxx, 7-maktab → 7xxxxx). Kodlar butun tuman bo'yicha yagona.
- **Kirish ID oynasi** endi 5–8 xonali kodni qabul qiladi (avval faqat 5 edi) — "Kirish" tugmasi qo'shildi.
- **Token `maktab_id` ni oladi** (login, ID bilan kirish, yuz bilan kirish, bot orqali kirish) — bu Faza 1C
  (izolyatsiya) uchun poydevor. Admin → barcha maktablar (maktab_id yo'q).
- **Kirgach "Toshloq tumani · N-maktab" yozuvi** chap menyuda ism ostida ko'rinadi.

## Nimani hali O'ZGARTIRMADI
- Ma'lumot filtrlash (to'liq izolyatsiya) hali YO'Q — hozir hammasi 3-maktab, muammosiz. → Faza 1C.
  Faza 1C da har bir ro'yxat/qo'shish/o'chirish so'rovi `maktab_id` bo'yicha filtrlanadi.

## Fayllar
Migration: `migrations/018_multi_maktab.sql`
Server: `migrate.mjs`, `routes/maktablar.ts` (+/mine), `routes/index.ts`, `routes/auth.ts`, `routes/auth-login.ts`
Frontend: `App.tsx`, `components/layout.tsx`, `components/login-id.tsx`, `pages/admin/maktablar.tsx`

## Deploy
1. `artifacts/` va `migrations/` ni GitHub'ga joylang (ustiga).
2. Render build + migration 018 avtomatik.
3. Tekshiring: admin "Maktablar" ishlaydi; kirgach maktab nomi ko'rinadi; 3-maktab eski 5 xonali kod bilan kiradi.

## Keyingi — Faza 1C (eng ehtiyotkor)
Har so'rov maktab bo'yicha filtrlanadi: direktor/zavuch/MMTB faqat o'z maktabini ko'radi,
yangi o'quvchi/xodim yaratilganda yaratuvchining maktabiga biriktiriladi, admin hammasini ko'radi.
