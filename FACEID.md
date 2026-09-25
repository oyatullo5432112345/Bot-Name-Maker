# Face ID — maktabga kirishda yuz orqali davomat

Maxsus qurilma kerak emas: oddiy telefon (yoki planshet) kamerasi va brauzer.
Yuzni tanish **telefonning o'zida** bajariladi (`@vladmandic/face-api`, WebGL), serverga faqat natija boradi.

**Imkoniyatlar:** bir kadrda bir nechta o'quvchi (6 tagacha) bir vaqtda · tez yurib o'tsa ham · yon tomondan (~45° gacha) ·
keldi / ketdi · internet uzilsa ham ishlaydi.

## Qanday ishlaydi

1. **Ro'yxatga olish** — `Face ID → Yuzlarni ro'yxatga olish` (sinf rahbari o'z sinfini, admin hammasini)
   - Sinfni tanlang → o'quvchini bosing → **"Ota-ona roziligi olingan"** belgisini qo'ying → kamera **7 burchakdan** namuna oladi (~15 soniya):
     to'g'ri → biroz chapga → biroz o'ngga → ko'proq chapga → ko'proq o'ngga → yuqoriga → pastga (ekrandagi ko'rsatmaga amal qilinadi)
   - Shu sababli kioskda o'quvchi boshini burib yoki egib o'tsa ham taniydi
   - Avval 3 namuna bilan olinganlar ham ishlaydi, lekin ro'yxatda "yon tomondan tanishi uchun qayta oling" deb chiqadi — **qayta oling**
   - O'xshash yuz (boshqa o'quvchi / egizak) sezilsa — ogohlantiradi
2. **Kiosk** — admin `Face ID → ▶ Bugungi Face ID ni boshlash` ni bosadi va telefonni eshik yoniga qo'yadi
   - **AVTO rejim** (bitta eshik): bugun kelmagan bo'lsa → **KELDI**; kelganiga 20 daqiqadan ko'p bo'lsa → **KETDI**
   - Kirish va chiqish eshigi alohida bo'lsa — kioskda **KELDI** yoki **KETDI** rejimini tanlang
   - **Kech qoldi** — sinfning bugungi birinchi darsi boshlanganidan keyin kelsa (dars jadvalidan; 2 smena ham to'g'ri ishlaydi).
     Jadval kiritilmagan bo'lsa — sozlamadagi vaqt (standart 08:00)
   - **Erta ketdi** — sinfning bugungi oxirgi darsi tugashidan oldin chiqsa
   - Davomatga avtomatik yoziladi, o'quvchiga Telegram xabar: "Keldingiz 07:52" / "Chiqdingiz 13:35"
   - Internet uzilsa — belgilar telefonda saqlanadi va keyin avtomatik yuboriladi
3. **Boshqaruv sahifasi** (`/faceid`) — keldi / kechikdi / ketdi / erta ketdi, sinflar kesimida, oxirgi harakatlar,
   sozlamalar va **"Kelmaganlarni sinf rahbarlariga yuborish"** (Telegram)

## Bir vaqtda bir nechta o'quvchi
- Kamera kadridagi **hamma yuzlar bir vaqtda** tekshiriladi (6 tagacha). Har bir yuz ustida ism chiqadi:
  🟢 tanildi · 🔵 tekshirilmoqda · 🟠 tanilmadi · ⚪ juda uzoqda
- Pastda har bir o'quvchi uchun alohida kartochka: "KELDI · Ali Valiyev · 7-A · 07:52"
- Bir kadrda bitta o'quvchi ikki joyda "tanilib qolmaydi" (eng yaqini olinadi)

## Tez harakat
- Har bir yuz kadrdan kadrga **kuzatiladi**; ketma-ket kadrlardagi natijalar yig'iladi (1,5 soniya ichida 2 ta mos kadr
  yoki 1 ta juda aniq kadr — tasdiqlanadi). Bitta kadr xira chiqsa ham keyingisida taniydi
- Kamera 1280×720 va 60 kadr/s gacha so'raladi — tez harakatda surat kamroq xiralashadi, uzoqdagi yuz aniqroq
- Natija ekranga **darhol** chiqadi (server javobini kutmaydi), server fonda xabardor qilinadi
- Odatda tanish 0,1–0,4 soniya. Modellar kiosk ochilganda oldindan "isitiladi"
- Tanilgan o'quvchi 8 soniya qayta ko'rsatilmaydi — keyingilar darhol o'tadi

## Yon tomondan
- **Aniq rejim (SSD)** — yon tomondan va uzoqdan ham yuz topadi (standart)
- **Tez rejim (Tiny)** — sekin telefonlar uchun. Telefon sekin bo'lsa kiosk o'zi o'tadi ("Tez (avto)").
  Yuqoridagi ⚡ tugmasi bilan qo'lda almashtirish mumkin; u yerda kadr/s va kadrdagi yuzlar soni ham ko'rinadi
- ~45° gacha burilgan yuz ishonchli taniladi (7 burchakli ro'yxatga olish bilan). **To'liq profil (90°) — ishonchsiz**:
  bunday kadrda yuzning yarmi ko'rinmaydi. Shu sabab kamera o'quvchilar yuradigan yo'lga **qaratib** qo'yilishi kerak

## Aniqlik
- Eng yaqin 2 ta odam orasidagi farq ham tekshiriladi (adashmaslik uchun)
- Yon (profil) kadr hech qachon yolg'iz o'zi tasdiqlamaydi — kamida 2 ta mos kadr kerak
- Bitta yuz qisqa vaqt ichida 2 xil o'quvchiga o'xshasa — tasdiqlanmaydi, keyingi kadrlar kutiladi
- Sozlamada: Qat'iy / O'rtacha (tavsiya) / Yumshoq
- **Cheklov:** tizim rasm va tirik odamni ajratmaydi (liveness yo'q) — kiosk navbatchi nazoratida tursin

## Maxfiylik va qonun
- **Rasm saqlanmaydi** — bazada faqat yuzning raqamli izi (128 ta son). Undan rasmni tiklab bo'lmaydi.
- Biometrik ma'lumot — "Shaxsga doir ma'lumotlar to'g'risida"gi qonunga ko'ra alohida toifa: **voyaga yetmaganlar uchun
  ota-onaning yozma roziligini oling** (maktab ariza shaklida). Rozilik belgisisiz tizim yuzni saqlamaydi.
- Istalgan o'quvchining yuz ma'lumoti ro'yxatga olish sahifasida 🗑 tugmasi bilan butunlay o'chiriladi.
- Kiosk va yuz izlari faqat admin/rahbariyat tokeni bilan ochiladi.

## Kamerani qayerga qo'yish (eng muhimi)
```
        eshik
   ┌──────────────┐
   │   o'quvchilar │   ↓ yurish yo'nalishi
   │      ↓ ↓ ↓    │
   │               │
   │  [📱 telefon] │  ← yurish yo'liga QARATIB, 1–3 m oldinda,
   └──────────────┘     yuz balandligida (1,4–1,6 m), biroz yon tomonda
```
- Kamera o'quvchilarga **yuzma-yuz** qarasin (yon devorga qaratib qo'ymang — faqat profil ko'rinadi)
- Yo'lak torroq bo'lsa yaxshi: bir vaqtda 2–4 kishi o'tadi, hammasining yuzi kadrga tushadi
- Yorug' joy, orqa fonda deraza / quyosh bo'lmasin (yuz qorong'i chiqadi)
- Quvvatga ulab qo'ying — sahifa ekranni o'chirmaydi (Wake Lock)
- Chrome (Android) yoki Safari (iPhone) — **https** manzil orqali (Telegram ichidagi brauzerda kamera ishlamasligi mumkin)
- Birinchi ochilishda ~12 MB model yuklanadi, keyin tez ochiladi
- O'rta darajadagi telefon (2020+) Aniq rejimda ~6–12 kadr/s beradi; eski telefon avtomatik Tez rejimga o'tadi

## Fayllar
- `artifacts/api-server/src/routes/faceid.ts` — API (ro'yxatga olish, kiosk, davomat, sozlamalar)
- `artifacts/platform/src/lib/face.ts` — kamera, face-api yuklash, ko'p yuzni aniqlash, tez qidiruv
- `artifacts/platform/src/lib/face-track.ts` — yuzlarni kadrdan kadrga kuzatish va ovoz berish (tez harakat uchun)
- `artifacts/platform/src/pages/faceid/index.tsx` — boshqaruv sahifasi
- `artifacts/platform/src/pages/faceid/enroll.tsx` — yuzlarni ro'yxatga olish
- `artifacts/platform/src/pages/faceid/kiosk.tsx` — eshikdagi kiosk (to'liq ekran)
- `migrations/012_faceid.sql` — jadvallar (server ishga tushganda ham avtomatik yaratiladi)
