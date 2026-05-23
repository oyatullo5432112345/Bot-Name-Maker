# Talim Platform

Toshloq tuman 3-maktab uchun to'liq ta'lim boshqaruvi platformasi — Telegram bot + React veb-sayt.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API server + Telegram bot (port 8080)
- `pnpm --filter @workspace/platform run dev` — React veb-sayt (port 23633)
- `pnpm run typecheck` — to'liq typecheck
- Required env secrets: `TELEGRAM_BOT_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ADMIN_ID`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Telegram bot: Grammy.js (polling mode)
- DB: Supabase (PostgreSQL)
- API: Express 5, OpenAPI spec → Orval codegen
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + TanStack Query
- Build: esbuild (API server)

## Where things live

### API Server (`artifacts/api-server/src/`)
- `bot/bot.ts` — Telegram bot (kanal a'zoligini tekshirish + veb-sayt havolasi)
- `routes/auth.ts` — Login/me/logout API
- `routes/students.ts` — O'quvchilar CRUD
- `routes/classes.ts` — Sinflar CRUD
- `routes/staff.ts` — Xodimlar CRUD
- `routes/dashboard.ts` — Dashboard statistikasi
- `lib/supabase.ts` — Supabase client

### Frontend (`artifacts/platform/src/`)
- `pages/login.tsx` — Login sahifasi
- `pages/dashboard.tsx` — Rol bo'yicha dashboard
- `pages/students/` — O'quvchilar ro'yxati va yangi qo'shish
- `pages/classes/` — Sinflar ro'yxati
- `pages/staff/` — Xodimlar ro'yxati va yangi qo'shish
- `lib/auth.tsx` — AuthProvider (token-based localStorage)
- `lib/auth-context.ts` — Auth context type
- `lib/use-auth.ts` — useAuth hook
- `components/auth-guard.tsx` — Rol bo'yicha himoya
- `components/layout.tsx` — Sidebar layout

### Shared libraries
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)
- `lib/api-client-react/` — Generated React Query hooks (codegen)
- `lib/api-zod/` — Generated Zod validation schemas (codegen)

## Supabase jadvallari

- `users` — O'quvchilar (telegram_id, full_name, phone_number, class_name, login, password, registration_date)
- `classes` — Sinflar (id, name, teacher_id, created_at)
- `staff` — Xodimlar (id, telegram_id, full_name, role, class_id, login, password, created_at)

## Rollar

| Rol | Ko'rishi mumkin |
|-----|----------------|
| admin | Hamma narsani boshqaradi |
| director | Barcha sinflar + o'quvchilar + xodimlar (faqat ko'rish) |
| zam_direktor | Director bilan bir xil |
| zavuch | Director bilan bir xil |
| teacher | Faqat o'z sinfi |
| student | Faqat o'z ma'lumotlari |

## Auth oqimi

- Login: `POST /api/auth/login` → `{ login, password }` → JWT token (base64 payload)
- Token: `localStorage.getItem("talim_auth_token")` orqali saqlanadi
- Admin: `login="admin"`, `password=ADMIN_ID` secret
- Staff/Student: Supabase'dagi login/password

## Bot oqimi

1. `/start` → Logo + kanal tugmasi
2. Kanal a'zoligini tekshirish
3. A'zo → Veb-sayt havolasi

## Codegen

OpenAPI spec'ni o'zgartirganidan keyin:
```
pnpm --filter @workspace/api-spec run codegen
```

## User preferences

- Uzbek tilida javob berish
- Grammy.js ishlatiladi (Node.js 24 bilan mos)
