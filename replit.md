# Talim Platform Bot

Toshloq tuman 3-maktab uchun Telegram boti — o'quvchilarni ro'yxatdan o'tkazadi, xodimlarni boshqaradi va rol asosida kirish nazoratini ta'minlaydi.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API server + Telegram botni ishga tushirish (port 5000)
- `pnpm run typecheck` — to'liq typecheck
- Required env secrets: `TELEGRAM_BOT_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ADMIN_ID`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Telegram bot: Grammy.js (polling mode)
- DB: Supabase (PostgreSQL)
- API: Express 5
- Build: esbuild (CJS/ESM bundle)

## Where things live

- `artifacts/api-server/src/bot/` — Barcha bot kodi
  - `bot.ts` — Asosiy bot, /start, o'quvchi va staff oqimi
  - `admin.ts` — Admin buyruqlari va sinflarni boshqarish
  - `roles.ts` — Rollar va ruxsatlar (permissions)
  - `staff-db.ts` — Staff va Classes Supabase operatsiyalari
  - `menus.ts` — Rol bo'yicha menyular
  - `database.ts` — O'quvchilar Supabase operatsiyalari
  - `states.ts` — In-memory state machine
  - `logo.png` — Talim Platform logotipi
- `artifacts/api-server/supabase_setup.sql` — Barcha jadvallarni yaratish SQL skripti

## Supabase jadvallari

- `users` — O'quvchilar (telegram_id, full_name, phone, class_name, login, password)
- `classes` — Sinflar (id, name, teacher_id)
- `staff` — Xodimlar (id, telegram_id, full_name, role, class_id, login, password)

## Rollar

| Rol | Ko'rishi mumkin |
|-----|----------------|
| admin | Hamma narsani boshqaradi |
| director | Barcha sinflar + o'quvchilar + xodimlar (faqat ko'rish) |
| zam_direktor | Director bilan bir xil |
| zavuch | Director bilan bir xil |
| teacher | Faqat o'z sinfi |

## Bot oqimi

1. `/start` → Logotip ko'rsatiladi
2. Admin → Admin paneli
3. Xodim (telegram biriktrilgan) → Rol menyusi
4. O'quvchi (ro'yxatdan o'tgan) → Asosiy menyu
5. Yangi foydalanuvchi → Kanal a'zoligini tekshirish → Ro'yxat → Login/Parol
6. Xodim kirishi → "Xodim sifatida kirish" → Login/Parol → Rol menyusi

## Admin buyruqlari

- `/admin` — Admin panelini ochish
- `/broadcast <matn>` — Barcha o'quvchilarga xabar
- `/broadcastclass <sinf> <matn>` — Sinfga xabar
- `/broadcaststaff <matn>` — Barcha xodimlarga xabar
- `/del <telegram_id>` — O'quvchini o'chirish
- `/setclass <id> <sinf>` — Sinf o'zgartirish
- `/setpass <id> <parol>` — Parol o'zgartirish

## Gotchas

- Grammy external sifatida esbuild'dan chiqariladi (grammy, @grammyjs/*)
- Bot polling modeda ishlaydi (webhook emas)
- Staff telegram_id ni faqat login qilgandan so'ng bilinadi
- `supabase_setup.sql` ni Supabase SQL Editor'da birinchi marta ishga tushiring

## User preferences

- Uzbek tilida javob berish
- Telegraf o'rniga Grammy.js ishlatiladi (Node.js 24 bilan mos)
