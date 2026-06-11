---
name: Supabase credentials setup
description: How Supabase URL and anon key are stored for this project
---

Supabase project: `saodkjnjskghqqktcxkj.supabase.co`

The anon key starts with `sb_publishable_` — this is the public/anon key, designed for client-side use. It is stored as a **shared env var** (not a secret) using `setEnvVars`.

- `SUPABASE_URL` — env var
- `SUPABASE_ANON_KEY` — env var (publishable key, safe for env var)

**Why:** The `sb_publishable_` prefix means Supabase designates this as a safe public key. Saving as a secret would require `requestEnvVar` which blocks execution. Since it's publishable, `setEnvVars` is appropriate.

**Tables in Supabase:**
- `users` — students (telegram_id PK, full_name, phone_number, class_name, login, password, registration_date)
- `classes` — (id UUID, name, teacher_id, created_at)
- `staff` — (id UUID, telegram_id, full_name, role, class_id, login, password, created_at, subjects, can_teach)

RLS: assumed disabled (anon key can read/write all rows).
