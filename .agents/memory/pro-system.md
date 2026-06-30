---
name: Pro system
description: How the Pro versiya (3-month Pro status) system works across DB, backend, and frontend
---

## DB columns
- `users.pro_expires_at TIMESTAMPTZ` — nullable, set on registration
- `staff.pro_expires_at TIMESTAMPTZ` — nullable, set on registration

## Backend (artifacts/api-server/src/routes/auth.ts)
- `POST /auth/register` — inserts `pro_expires_at = now() + 90 days` into `users`
- `POST /auth/register-staff` — inserts `pro_expires_at = now() + 90 days` into `staff`
- Login (`POST /auth/login`) — selects `pro_expires_at` from DB and includes it in the token payload for both staff and student paths

## Zod schemas (must stay in sync)
- `lib/api-zod/src/generated/api.ts` — `LoginResponse` and `GetMeResponse` both have `"pro_expires_at": zod.string().nullish()`
- `lib/api-zod/src/generated/types/authResult.ts` — `AuthResult` interface has `pro_expires_at?: string | null`
- `lib/api-client-react/src/generated/api.schemas.ts` — `AuthResult` interface has `pro_expires_at?: string | null`

These are generated files that were edited manually. Next codegen run will overwrite them — re-apply the field.

## Frontend components
- `artifacts/platform/src/components/layout.tsx` — sidebar footer shows "⭐ Pro versiya — X kun qoldi" badge when `user.pro_expires_at` is in the future
- `artifacts/platform/src/components/pro-welcome-modal.tsx` — full-screen modal shown once per user (localStorage key `pro_welcome_shown_{userId}`) when pro is active on first login
- `artifacts/platform/src/App.tsx` — `<ProWelcomeModal />` rendered inside `<WouterRouter>`

**Why:** Purely motivational/status feature — no access gating. Gives users a "special" feel without restricting functionality.
