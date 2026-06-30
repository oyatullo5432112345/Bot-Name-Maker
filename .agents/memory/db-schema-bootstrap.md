---
name: DB schema bootstrap
description: How to initialize the Replit PostgreSQL database for this project
---

The Drizzle schema file (`lib/db/src/schema/index.ts`) is intentionally empty (just `export {}`), so `pnpm --filter @workspace/db run push` reports "No changes detected" and does nothing.

The real schema is in `migrations/*.sql` files. On first deploy to a new Replit environment, run them manually:

```bash
PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -f migrations/000_full_schema.sql
PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -f migrations/001_registration_codes.sql
PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -f migrations/001_tanga_system.sql
PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -f migrations/002_olimpiada_royhatdan_otish.sql
```

After the base schema, apply any additive columns separately:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMPTZ;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMPTZ;
```

**Why:** The project was originally designed with raw SQL migrations rather than Drizzle's ORM schema, so the ORM layer was left empty as a placeholder.
