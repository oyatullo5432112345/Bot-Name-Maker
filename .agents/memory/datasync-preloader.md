---
name: DataSync startup preloader pattern
description: How startup data prefetching overlay works in the platform
---

Component: `artifacts/platform/src/components/data-sync.tsx`

**Pattern:** After user logs in, `DataSync` component is rendered in `Router()` function in `App.tsx`:
```tsx
{user && <DataSync userId={String(user.id)} userRole={user.role} />}
```

**Behavior:**
- Shows a full-screen overlay with globe background + spinning loader + progress bar
- Prefetches: dashboard-stats, classes, students (admin only), staff (admin only)
- Uses `queryClient.prefetchQuery()` with 5-minute staleTime
- Tracks completion in `sessionStorage` key `data_sync_v1_{userId}` — runs once per session
- Fades out when done

**Why:** Navigation between pages previously showed loading spinners because React Query had no cached data. Prefetching at startup fills the cache so pages render instantly.

**How to apply:** If more data needs preloading, add tasks to the `tasks` array in DataSync. Role-based tasks prevent over-fetching.
