# Face ID — maktabga kirishda yuz orqali davomat

Maxsus qurilma kerak emas: oddiy telefon (yoki planshet) kamerasi va brauzer.
Yuzni tanish **telefonning o'zida** bajariladi (`@vladmandic/face-api`, WebGL), serverga faqat natija boradi.

## Qanday ishlaydi

1. **Ro'yxatga olish** — `Face ID → Yuzlarni ro'yxatga olish` (sinf rahbari o'z sinfini, admin hammasini)
   - Sinfni tanlang → o'quvchini bosing → **"Ota-ona roziligi olingan"** belgisini qo'ying → kamera 3 ta namuna oladi (~10 soniya)
   - Bot o'xshash yuzni (boshqa o'quvchi / egizak) sezsa — ogohlantiradi
2. **Ertalab** — admin `Face ID → ▶ Bugungi Face ID ni boshlash` ni bosadi va telefonni eshik yoniga qo'yadi
   - O'quvchi kameraga qaraydi → ekranda ismi, sinfi, vaqti chiqadi, ovozli signal
   - Davomatga avtomatik **"keldi"** yoki **"kech qoldi"** (sozlamadagi vaqtdan keyin) yoziladi
   - O'quvchiga Telegram bot orqali "Maktabga keldingiz: 07:52" xabari boradi
   - Internet uzilsa — belgilar telefonda saqlanadi va keyin avtomatik yuboriladi
3. **Boshqaruv sahifasi** (`/faceid`) — bugun kim keldi (sinflar kesimida), kechikkanlar, oxirgi kelganlar,
   sozlamalar va **"Kelmaganlarni sinf rahbarlariga yuborish"** (Telegram)

## Aniqlik
- Bir odam **3 ta ketma-ket kadrda** tanilgandan keyingina belgilanadi
- Eng yaqin 2 ta odam orasidagi farq ham tekshiriladi (adashmaslik uchun)
- Sozlamada: Qat'iy / O'rtacha (tavsiya) / Yumshoq
- **Cheklov:** tizim rasm va tirik odamni ajratmaydi (liveness yo'q) — kiosk navbatchi nazoratida tursin

## Maxfiylik va qonun
- **Rasm saqlanmaydi** — bazada faqat yuzning raqamli izi (128 ta son). Undan rasmni tiklab bo'lmaydi.
- Biometrik ma'lumot — "Shaxsga doir ma'lumotlar to'g'risida"gi qonunga ko'ra alohida toifa: **voyaga yetmaganlar uchun
  ota-onaning yozma roziligini oling** (maktab ariza shaklida). Rozilik belgisisiz tizim yuzni saqlamaydi.
- Istalgan o'quvchining yuz ma'lumoti ro'yxatga olish sahifasida 🗑 tugmasi bilan butunlay o'chiriladi.
- Kiosk va yuz izlari faqat admin/rahbariyat tokeni bilan ochiladi.

## Qurilma bo'yicha maslahatlar
- Chrome (Android) yoki Safari (iPhone) — **https** manzil orqali (Telegram ichidagi brauzerda kamera ishlamasligi mumkin)
- Telefonni yuz balandligida, yorug' joyga qo'ying; orqa fonda deraza bo'lmasin
- Quvvatga ulab qo'ying — sahifa ekranni o'chirmaydi (Wake Lock)
- Birinchi ochilishda ~7 MB model yuklanadi, keyin tez ochiladi

## Fayllar
- `artifacts/api-server/src/routes/faceid.ts` — API (ro'yxatga olish, kiosk, davomat, sozlamalar)
- `artifacts/platform/src/lib/face.ts` — kamera, face-api yuklash, moslashtirish
- `artifacts/platform/src/pages/faceid/index.tsx` — boshqaruv sahifasi
- `artifacts/platform/src/pages/faceid/enroll.tsx` — yuzlarni ro'yxatga olish
- `artifacts/platform/src/pages/faceid/kiosk.tsx` — eshikdagi kiosk (to'liq ekran)
- `migrations/012_faceid.sql` — jadvallar (server ishga tushganda ham avtomatik yaratiladi)
