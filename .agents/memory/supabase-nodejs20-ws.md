---
name: Supabase on Node.js 20 - WebSocket fix
description: @supabase/supabase-js crashes on Node.js < 22 without ws transport
---

Node.js 20 does not have native WebSocket support. The Supabase JS client initializes a RealtimeClient eagerly on createClient(), which throws:

```
Error: Node.js 20 detected without native WebSocket support.
```

**Fix:** Pass the `ws` package as the transport option. `ws` is already in api-server dependencies.

```typescript
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: {
    transport: ws as unknown as typeof WebSocket,
  },
});
```

**Why:** The Replit environment runs Node.js 20 (v20.20.0). Native WebSocket was added in Node.js 22.

**How to apply:** Always include this when creating a Supabase client in the api-server. The `ws` package must be listed in api-server dependencies.
