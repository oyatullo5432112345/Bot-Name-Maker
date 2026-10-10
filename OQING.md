# Tuzatish: Majburiy kanal + Face ID (tezlik va aniqlik)

`artifacts/` papkasining O'ZINI GitHub'ga joylang (o'rovchi papka yo'q). Render o'zi build qiladi.
Baza migratsiyasi YO'Q — faqat kod. Hech narsa buzilmaydi.

## 1) Majburiy kanalga a'zolik — endi ishlaydi
Muammo: kanal "ulash" (e'lonlar uchun) va "majburiy a'zolik" ikki alohida tizim edi —
kanalni ulasangiz ham u majburiy bo'lmasdi. Ustiga, kanal noto'g'ri bo'lsa yoki bot unda
admin bo'lmasa, tekshiruv HAMMANI bloklab, botni "o'lik" qilardi (bari bekor).

Tuzatildi:
- **Kanalni "maktab kanali" qilib ulasangiz — u avtomatik MAJBURIY a'zolikka aylanadi.**
  (features.ts: bot kanalga admin qilinganda chiqadigan "ulash" tugmasi ham, `/kanal @nomi` ham.)
- Uzganingizda — majburiy ro'yxatdan ham chiqadi.
- **Bot kanalni tekshira olmasa (admin emas/topilmadi) — endi foydalanuvchini BLOKLAMAYDI** (log yoziladi).
  Ya'ni noto'g'ri sozlama butun botni to'xtatib qo'ymaydi.
- Obuna tugmasi endi to'g'ri havola bilan (ochiq kanal → t.me/username; yopiq → invite link).

**Ishlatish:** botni kanalga ADMIN qiling → bot "ulaymizmi?" deb so'raydi → "Ha, maktab kanali" bosing.
Yoki rahbar botda `/kanal @kanal_nomi` yuboradi. Shu zahoti majburiy bo'ladi.
(Eski usul — admin panel → "Kanallar sozlamasi" — ham ishlaydi.)
⚠️ Bot kanalda ADMIN bo'lishi SHART — aks holda Telegram a'zolikni tekshira olmaydi.

## 2) Face ID — tez va o'xshash yuzlarsiz
Yuz ma'lumotlari allaqachon bazada (`face_profiles`) saqlanadi va endi **maktab bo'yicha**
solishtiriladi (kam yuz = tezroq + kam chalkashlik). Qo'shimcha:
- **Aniqlik darajasi endi tezlikni ham boshqaradi:** Yumshoq = eng tez (kichik tasvir),
  Standart = muvozanat, Qattiq = eng aniq. Kiosk sozlamasidan tanlanadi.
- **Yuz bilan kirishda o'xshash yuz chegarasi kuchaytirildi** (margin 0.06 → 0.10) —
  o'quvchilar ko'paygan sari xato kirishni oldini oladi.
- Ro'yxatga olishda boshqa o'quvchiga juda o'xshash yuz allaqachon rad etiladi (0.4 chegara, o'z maktabi ichida).

## Fayllar
- `bot/settings.ts`, `bot/bot.ts`, `bot/features.ts` — majburiy kanal tuzatishi
- `routes/auth-login.ts` — yuz bilan kirish aniqligi
- `pages/faceid/kiosk.tsx` — kiosk tezlik/aniqlik darajasi

## Eslatma
- Ma'lumot saqlanishi uchun Render Postgres'ni pullik qiling (oldingi xabardagi $6/oy) — aks holda 30 kunda o'chadi.
- Yarim qilingan "Bek va Lola" (Duolingo) yangilanishi bu zipga KIRMAGAN — u keyin alohida tugatiladi.
