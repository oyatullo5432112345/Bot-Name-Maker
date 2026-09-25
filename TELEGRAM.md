# Telegram integratsiyasi — bot, Mini App, sinf guruhlari, maktab kanali

## Nimalar qo'shildi

### 1. Telegram Mini App (platforma Telegram ichida)
- Bot menyusida **"Platforma"** tugmasi — sayt Telegram ichida ochiladi.
- Login/parolsiz **avtomatik kirish** (`POST /api/auth/telegram-webapp`, `initData` HMAC bilan tekshiriladi).
- Akkaunti hali bog'lanmagan foydalanuvchi Mini App ichida login/parol bilan kirsa — Telegram akkaunti avtomatik bog'lanadi (`POST /api/auth/telegram-link`).

### 2. Rol bo'yicha menyu (shaxsiy chat, `/menu`)
| O'quvchi | O'qituvchi | Rahbariyat |
|---|---|---|
| 📅 Darslarim (bugun/ertaga) | 📅 Jadvalim | 📊 Maktab bugun (davomat %, belgilanmagan sinflar) |
| 📊 Baholarim (oxirgi 10 + 30 kunlik o'rtacha) | ✅ Davomat qilish (tugmalar bilan, 1 daqiqa) | 📣 Kanalga e'lon (matn/rasm/video/fayl) |
| 📋 Davomatim (oylik %) | ✉️ Sinfga xabar (guruh + har bir o'quvchiga) | 🔗 Guruh va kanallar |
| 🏆 Reyting (sinfdagi haftalik o'rin) | 👥 Sinfim (o'rtacha baho, qoldirgan kunlar, botga ulanganlar) | + o'qituvchi funksiyalari |
| 📢 E'lonlar | 📢 E'lonlar | 📢 E'lonlar |

Buyruqlar: `/menu /jadval /baholar /davomat /reyting /kanal /sertifikat /yordam`

### 3. Sinf guruhlari
1. Botni sinf guruhiga qo'shing.
2. Guruhda o'qituvchi yozadi: `/boglash` (o'z sinfi) yoki `/boglash 7-A`. O'qituvchilar guruhi uchun: `/boglash ustozlar`.
3. Guruh buyruqlari: `/jadval`, `/reyting`, `/sozlamalar`, `/uzish`.

Avtomatik (O'zbekiston vaqti):
- **07:05** (Du–Sha) — sinf guruhiga bugungi dars jadvali
- **08:00** — tug'ilgan kun tabriklari (guruhga + shaxsiy)
- **15:30** (Du–Sha) — davomatni belgilamagan sinf rahbariga eslatma
- **Shanba 16:00** — haftalik TOP (maktab kanali + har bir sinf guruhi)
- Guruhga yangi o'quvchi qo'shilsa — "Botga ulanish" tugmasi

### 4. 🎮 Bilimlar jangi — sinf guruhidagi jonli bellashuv
**Boshlash (guruh admini yoki o'qituvchi):** guruhda `/oyin` yoki botda **🎮 Sinf o'yini** → savollar manbai → **🚀 BOSHLASH**.

**Savollar manbai:** 🧮 Tez hisob (bot o'zi tuzadi, 3 daraja) · ✍️ O'z savollari (oddiy matn, saqlanadi) · 📚 Saqlangan to'plamlar · 📋 Platformadagi test (ochiq testlar ko'rsatilmaydi) · 🧠 Topishmoqlar.

**O'yin qanday ko'rinadi (dizaynli rasm-kartochkalar):**
1. Kirish kartochkasi — sinf, savollar soni, vaqt, raundlar
2. Har savol — kartochka + Telegram quiz. Vaqt tugagach kartochka izohiga natija yoziladi (to'g'ri javob, nechta kishi topdi, eng tezkor, seriyalar)
3. Raund yakunida — reyting jadvali (+ shu raundda qo'shilgan ball)
4. Oxirida — G'oliblar shohsupasi (liga belgisi bilan) + to'liq ro'yxat, reyting va tanga

**Ball:** to'g'ri javob 10 + tezlik 5 gacha, raund ko'paytmasi: **I raund ×1 · II raund ×2 · Final ×3**, har 3 ta ketma-ket to'g'ri — +3.

**Liga va reyting (o'yinlar orasida saqlanadi):** Bronza (0) → Kumush (150) → Oltin (400) → Platina (800) → Olmos (1400) → Afsona (2200).
Har o'yindan keyin reyting = ball ÷ 5 + o'rin bonusi (25 / 15 / 8). `/profil` — shaxsiy kartochka, `/liga` — sinf ligasi.

**Tanga:** 15 / 10 / 5 + qatnashgani uchun 2 (maktab o'qituvchisi boshlagan o'yinda; kamida 3 qatnashchi; kuniga 30 gacha).

**Boshqaruv (boshlovchining shaxsiy chatida):** ⏭ Keyingi · ⏸ Pauza · ⏹ Tugatish. Oxirida batafsil hisobot va qatnashmaganlar ro'yxati.

### 5. Maktab kanali
- Botni kanalga **admin** qiling → bot rahbarga "🏫 Ha, maktab kanali" tugmasini yuboradi.
- Yoki shaxsiy chatda: `/kanal @kanal_nomi`.
- Saytda e'lon qo'shilganda u kanalga ham avtomatik chiqadi ("Telegram kanal va guruhlarga ham yuborish" belgisi).

## O'rnatish

1. Deploy qiling — `011_telegram_integration.sql` server ishga tushganda avtomatik bajariladi (preDeployCommand bo'lmasa ham).
2. Render → Environment: `WEBSITE_URL=https://<sizning-domen>.onrender.com` (**https bo'lishi shart** — Mini App faqat https'da ishlaydi).
3. BotFather (ixtiyoriy, lekin tavsiya):
   - `/setprivacy` → **Enable** qoldiring (bot guruhda faqat buyruqlarni o'qiydi — xavfsiz).
   - `/setjoingroups` → **Enable**.
4. Render free tarifida server 15 daqiqa so'rovsiz uxlaydi — rejalashtirilgan xabarlar o'z vaqtida chiqishi uchun
   cron-job.org yoki UptimeRobot orqali har 10 daqiqada `/api/healthz` ga ping qo'ying.

## Tuzatilgan xatolar
- `sendAccountInfo` ichida aniqlanmagan `u` o'zgaruvchisi (o'quvchi akkaunt bog'lashda qulab tushardi).
- Bot orqali login: bcrypt-xeshlangan parollar endi to'g'ri tekshiriladi.
- `/mahfiykod` buyrug'i hech qachon ishlamas edi (umumiy matn handleridan keyin ro'yxatdan o'tgan).
- Guruhga qo'shilgan bot har bir xabarga "Boshlash uchun /start yuboring" deb javob berardi.
- `attendance` jadvali migratsiyalarda yo'q edi; `announcements` jadvalida route ishlatadigan ustunlar yo'q edi.
- Staff login javobidagi MarkdownV2 escape xatosi.

## Fayllar
- `artifacts/api-server/src/bot/features.ts` — barcha yangi bot funksiyalari
- `artifacts/api-server/src/bot/games.ts` — Bilimlar jangi o'yini
- `artifacts/api-server/src/bot/game-questions.ts` — Tez hisob generatori va savol formati
- `artifacts/api-server/src/bot/game-cards.ts` — o'yin kartochkalari dizayni (SVG → PNG)
- `artifacts/api-server/assets/fonts/` — kartochkalar shriftlari (Poppins, DejaVu Sans)
- `artifacts/api-server/src/lib/tg-shared.ts` — guruh/kanal bazasi, yuborish, vaqt yordamchilari
- `artifacts/api-server/src/routes/telegram-webapp.ts` — Mini App kirish
- `artifacts/platform/src/lib/telegram-webapp.ts` — frontend Mini App SDK
- `migrations/011_telegram_integration.sql`
