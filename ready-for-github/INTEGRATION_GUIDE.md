# Advertising System Integration Guide

## 📁 File Structure

```
Bot-Name-Maker/
├── artifacts/
│   ├── api-server/src/
│   │   ├── modules/
│   │   │   └── advertising/
│   │   │       ├── index.ts
│   │   │       ├── service.ts
│   │   │       ├── controller.ts
│   │   │       └── routes.ts
│   │   ├── db/
│   │   │   └── migrations/
│   │   │       └── 001_add_advertising.sql
│   │   └── app.ts (modify)
│   │
│   └── platform/src/
│       ├── components/
│       │   └── AdSlot.tsx
│       └── modules/
│           └── admin/pages/
│               ├── AdvertisementsPage.tsx
│               └── AdAnalyticsPage.tsx
```

## 🔧 Integration Steps

### 1. Copy Backend Files

Copy these files to your Bot-Name-Maker repository:

```bash
# Backend module files
artifacts/api-server/src/modules/advertising/
  ├── index.ts
  ├── service.ts
  ├── controller.ts
  └── routes.ts

# Database migration
artifacts/api-server/src/db/migrations/
  └── 001_add_advertising.sql
```

### 2. Update app.ts

Add this to `artifacts/api-server/src/app.ts`:

```typescript
import advertisingRouter from "./modules/advertising/index.js";

// ... other imports and setup ...

// Register advertising routes
app.use("/api/v2/ads", advertisingRouter);

// ... rest of your routes ...
```

### 3. Update Database Schema

Add these tables to `artifacts/api-server/src/db/schema.ts`:

```typescript
export const advertisements = pgTable("advertisements", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: varchar("image_url", { length: 500 }).notNull(),
  linkUrl: varchar("link_url", { length: 500 }),
  advertiserName: varchar("advertiser_name", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }),
  position: varchar("position", { length: 50 }).default("sidebar"),
  status: varchar("status", { length: 20 }).default("active"),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  viewsCount: integer("views_count").default(0),
  clicksCount: integer("clicks_count").default(0),
  createdBy: uuid("created_by").notNull(),
  updatedBy: uuid("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const adAnalytics = pgTable("ad_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  advertisementId: uuid("advertisement_id").notNull(),
  userId: uuid("user_id"),
  eventType: varchar("event_type", { length: 50 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const advertisementSlots = pgTable("advertisement_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  slotName: varchar("slot_name", { length: 100 }).notNull().unique(),
  slotType: varchar("slot_type", { length: 50 }),
  maxAds: integer("max_ads").default(1),
  width: integer("width"),
  height: integer("height"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const adPlacements = pgTable("ad_placements", {
  id: uuid("id").primaryKey().defaultRandom(),
  advertisementId: uuid("advertisement_id").notNull(),
  advertisementSlotId: uuid("advertisement_slot_id").notNull(),
  priority: integer("priority").default(0),
  rotationEnabled: boolean("rotation_enabled").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
```

### 4. Copy Frontend Files

Copy these files to your Bot-Name-Maker repository:

```bash
# Frontend component
artifacts/platform/src/components/
  └── AdSlot.tsx

# Admin pages
artifacts/platform/src/modules/admin/pages/
  ├── AdvertisementsPage.tsx
  └── AdAnalyticsPage.tsx
```

### 5. Update Dashboard

Add AdSlot to `artifacts/platform/src/modules/dashboard/pages/Dashboard.tsx`:

```typescript
import { AdSlot } from "@/components/AdSlot";

// Inside your Dashboard component JSX:
<div className="lg:col-span-1 space-y-4">
  <AdSlot slotName="sidebar_dashboard" className="bg-white p-4 rounded-lg" />
  {/* Other sidebar content */}
</div>
```

### 6. Register Admin Routes

Add these routes to your admin routing (usually in `artifacts/platform/src/modules/admin/routes.ts` or similar):

```typescript
import { AdvertisementsPage } from "./pages/AdvertisementsPage";
import { AdAnalyticsPage } from "./pages/AdAnalyticsPage";

// In your admin routes:
{
  path: "/admin/ads",
  element: <AdvertisementsPage />,
},
{
  path: "/admin/ads/analytics",
  element: <AdAnalyticsPage />,
}
```

### 7. Run Database Migration

```bash
# If using Drizzle ORM
npm run db:migrate

# Or run SQL directly
psql your_database < artifacts/api-server/src/db/migrations/001_add_advertising.sql
```

### 8. Install Dependencies (if needed)

```bash
pnpm install uuid
```

### 9. Build and Test

```bash
pnpm build
pnpm start
```

## 📍 API Endpoints

- `GET /api/v2/ads` - List all active ads
- `GET /api/v2/ads/slot/:slotName` - Get ads for specific slot
- `GET /api/v2/ads/:id` - Get single ad
- `POST /api/v2/ads` - Create ad (admin)
- `PUT /api/v2/ads/:id` - Update ad (admin)
- `DELETE /api/v2/ads/:id` - Delete ad (admin)
- `PATCH /api/v2/ads/:id/status` - Change ad status (admin)
- `POST /api/v2/ads/:id/track-view` - Track view
- `POST /api/v2/ads/:id/track-click` - Track click
- `GET /api/v2/ads/:id/analytics` - Get ad analytics (admin)
- `GET /api/v2/ads/dashboard/stats` - Get dashboard stats (admin)

## 🎯 Available Ad Slots

- `sidebar_dashboard` - Dashboard right sidebar
- `banner_home` - Home page banner
- `popup_modal` - Popup modal
- `footer_page` - Page footer
- `telegram_menu` - Telegram bot menu

## ✅ Testing

1. Navigate to `/admin/ads` to create test advertisements
2. View analytics at `/admin/ads/analytics`
3. Check ads display with `<AdSlot slotName="sidebar_dashboard" />`
4. Verify view/click tracking in analytics

## 📝 Notes

- All admin routes require authentication (check `authenticateToken` middleware)
- Ads only display if status is "active" AND current date is between start_date and end_date
- Click-through rate (CTR) is automatically calculated as: (clicks / views) * 100
- Ad rotation works when multiple ads are in the same slot

---

Questions? Check ADVERTISING_COMPLETE_STRUCTURE.md for full implementation details.
