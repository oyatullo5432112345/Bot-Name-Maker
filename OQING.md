# Faza 1A — Ko'p maktabli POYDEVOR (tuman platformasi, 1-qadam)

Bu tuman platformasiga aylantirishning BIRINCHI qadami. **Xavfsiz va non-breaking** —
hozirgi hamma narsa avvalgidek ishlaydi, chunki mavjud ma'lumot avtomatik 3-maktabga tegishli bo'ladi.

## Nima qo'shildi
- `maktablar` jadvali (migration 018) — har maktab: raqam(id), nom, tuman, manzil, direktor, faollik.
- HAMMA asosiy jadvalga `maktab_id` ustuni (default 3) — o'quvchi, xodim, sinf, davomat, baho, Face ID,
  tanga, kutubxona, monitoring, lab... Mavjud satrlar 3-maktabga biriktirildi (hech narsa yo'qolmadi).
- `classes.name` endi HAR MAKTAB ichida yagona (tumanda emas) — turli maktabda "5-A" bo'laveradi.
- Admin uchun yangi sahifa: **Tuman boshqaruvi → Maktablar** — maktab qo'shish/tahrir/faollik/o'chirish.
- API: `/api/maktablar` (faqat admin).

## Nimani hali O'ZGARTIRMADI (keyingi qadamlar)
- Kirish kodi hali maktab raqamsiz (3-maktab kabi). → Faza 1B.
- Ma'lumot filtrlash (izolyatsiya) hali kodda yoqilmagan — hozir hammasi 3-maktab, shuning uchun muammosiz.
  → Faza 1C da har so'rov maktab bo'yicha filtrlanadi.
- "Toshloq tumani N-maktab" yozuvi kirishda → Faza 1B.

## Fayllar
Yangi: `migrations/018_multi_maktab.sql`, `artifacts/api-server/src/routes/maktablar.ts`,
`artifacts/platform/src/pages/admin/maktablar.tsx`
O'zgargan: `artifacts/api-server/migrate.mjs`, `artifacts/api-server/src/routes/index.ts`,
`artifacts/platform/src/App.tsx`, `artifacts/platform/src/components/layout.tsx`

## Deploy
1. `artifacts/` va `migrations/` ni GitHub'ga joylang (ustiga).
2. Render build + migration 018 avtomatik ishlaydi (xavfsiz, qo'shimcha).
3. Admin bo'lib kiring → chap menyu → "Tuman boshqaruvi → Maktablar" → maktab qo'shib ko'ring.

## Keyingi: Faza 1B
Kirish kodini maktab raqami bilan (1-maktab → 1xxxxx), 3-maktab eski 5 xonali qoladi;
kirgach "Toshloq tumani N-maktab" ko'rinadi; token maktab_id ni oladi.
