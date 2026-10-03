# Ta'lim (Bot-Name-Maker) V2 - Complete Integration Guide

This guide covers integration of three major systems:
1. **Advertising System** - Manage ads with analytics
2. **Face ID System** - Biometric authentication and verification
3. **Rental/Ijara System** - Book lending and inventory management

## 📁 Project Structure

```
Bot-Name-Maker/
├── artifacts/
│   ├── api-server/src/
│   │   ├── modules/
│   │   │   ├── advertising/
│   │   │   │   ├── index.ts
│   │   │   │   ├── service.ts
│   │   │   │   ├── controller.ts
│   │   │   │   └── routes.ts
│   │   │   ├── face-id/
│   │   │   │   ├── index.ts
│   │   │   │   ├── service.ts
│   │   │   │   ├── controller.ts
│   │   │   │   └── routes.ts
│   │   │   └── rental/
│   │   │       ├── index.ts
│   │   │       ├── service.ts
│   │   │       ├── controller.ts
│   │   │       └── routes.ts
│   │   ├── db/
│   │   │   └── migrations/
│   │   │       ├── 001_add_advertising.sql
│   │   │       ├── 002_add_face_id.sql
│   │   │       └── 003_add_rental.sql
│   │   └── app.ts
│   │
│   └── platform/src/
│       ├── components/
│       │   └── AdSlot.tsx
│       └── modules/
│           ├── admin/pages/
│           │   ├── AdvertisementsPage.tsx
│           │   └── AdAnalyticsPage.tsx
│           ├── profile/
│           │   ├── pages/FaceIDPage.tsx
│           │   └── components/FaceRegistration.tsx
│           └── library/
│               ├── pages/
│               │   ├── BooksPage.tsx
│               │   ├── RentalRequestsPage.tsx
│               │   └── RentalHistoryPage.tsx
│               └── components/
│                   ├── BookCard.tsx
│                   └── RentalForm.tsx
```

## 🔧 Backend Integration

### Step 1: Copy Backend Module Files

Copy these directories from the zip to your project:

```bash
# Copy Face ID module
cp -r artifacts/api-server/src/modules/face-id /path/to/your/project/artifacts/api-server/src/modules/

# Copy Rental module
cp -r artifacts/api-server/src/modules/rental /path/to/your/project/artifacts/api-server/src/modules/

# Copy Advertising module
cp -r artifacts/api-server/src/modules/advertising /path/to/your/project/artifacts/api-server/src/modules/
```

### Step 2: Update app.ts

Add these imports and route registrations to `artifacts/api-server/src/app.ts`:

```typescript
import advertisingRouter from "./modules/advertising/index.js";
import faceIDRouter from "./modules/face-id/index.js";
import rentalRouter from "./modules/rental/index.js";

// ... existing code ...

// Register module routes (add before error handling middleware)
app.use("/api/v2/ads", advertisingRouter);
app.use("/api/v2/face-id", faceIDRouter);
app.use("/api/v2/rentals", rentalRouter);

// ... rest of your routes ...
```

### Step 3: Run Database Migrations

```bash
# Using Drizzle ORM
pnpm run db:migrate

# Or manually with psql
psql your_database < artifacts/api-server/src/db/migrations/001_add_advertising.sql
psql your_database < artifacts/api-server/src/db/migrations/002_add_face_id.sql
psql your_database < artifacts/api-server/src/db/migrations/003_add_rental.sql
```

## 🎨 Frontend Integration

### Step 1: Copy Components

```bash
# Copy AdSlot component
cp artifacts/platform/src/components/AdSlot.tsx /path/to/your/project/artifacts/platform/src/components/

# Copy Face ID module
cp -r artifacts/platform/src/modules/profile /path/to/your/project/artifacts/platform/src/modules/

# Copy Library module
cp -r artifacts/platform/src/modules/library /path/to/your/project/artifacts/platform/src/modules/
```

### Step 2: Update Routing

Add routes to your main router (usually in `artifacts/platform/src/router.tsx` or similar):

```typescript
import { FaceIDPage } from "@/modules/profile/pages/FaceIDPage";
import { BooksPage } from "@/modules/library/pages/BooksPage";
import { RentalRequestsPage } from "@/modules/library/pages/RentalRequestsPage";
import { RentalHistoryPage } from "@/modules/library/pages/RentalHistoryPage";
import { AdvertisementsPage } from "@/modules/admin/pages/AdvertisementsPage";
import { AdAnalyticsPage } from "@/modules/admin/pages/AdAnalyticsPage";

// Add to your routes array:
{
  path: "/profile/face-id",
  element: <FaceIDPage />,
},
{
  path: "/library/books",
  element: <BooksPage />,
},
{
  path: "/library/requests",
  element: <RentalRequestsPage />,
},
{
  path: "/library/history",
  element: <RentalHistoryPage />,
},
// Admin routes (protected with isAdmin check)
{
  path: "/admin/ads",
  element: <AdvertisementsPage />,
  requiredRole: "admin",
},
{
  path: "/admin/ads/analytics",
  element: <AdAnalyticsPage />,
  requiredRole: "admin",
},
```

### Step 3: Add Ads to Dashboard

Update your dashboard to include ad slots:

```typescript
import { AdSlot } from "@/components/AdSlot";

// In your Dashboard component:
<div className="lg:col-span-1 space-y-4">
  <AdSlot slotName="sidebar_dashboard" className="bg-white p-4 rounded-lg" />
  {/* Other sidebar content */}
</div>
```

### Step 4: Add Navigation Links

Add menu items to your navigation:

```typescript
// Profile section
{
  label: "Yuz ID Tasdiqlanishi",
  path: "/profile/face-id",
  icon: "face-icon"
}

// Library section
{
  label: "Kutubxona",
  path: "/library/books",
  icon: "book-icon",
  children: [
    { label: "Kitoblar", path: "/library/books" },
    { label: "Ijara so'rovlari", path: "/library/requests" },
    { label: "Ijara tarixi", path: "/library/history" }
  ]
}

// Admin section
{
  label: "Reklamalar",
  path: "/admin/ads",
  icon: "ads-icon",
  requiredRole: "admin",
  children: [
    { label: "Reklamalar", path: "/admin/ads" },
    { label: "Analitika", path: "/admin/ads/analytics" }
  ]
}
```

## 📊 API Endpoints

### Advertising System

```
GET    /api/v2/ads
GET    /api/v2/ads/:id
GET    /api/v2/ads/slot/:slotName
POST   /api/v2/ads                 (admin only)
PUT    /api/v2/ads/:id             (admin only)
DELETE /api/v2/ads/:id             (admin only)
PATCH  /api/v2/ads/:id/status      (admin only)
POST   /api/v2/ads/:id/track-view
POST   /api/v2/ads/:id/track-click
GET    /api/v2/ads/:id/analytics   (admin only)
GET    /api/v2/ads/dashboard/stats (admin only)
```

### Face ID System

```
POST   /api/v2/face-id/register
POST   /api/v2/face-id/verify
GET    /api/v2/face-id/status
DELETE /api/v2/face-id
GET    /api/v2/face-id/logs
```

### Rental System

```
# Books
GET    /api/v2/rentals/books
GET    /api/v2/rentals/books/:id
GET    /api/v2/rentals/books?category=:category
POST   /api/v2/rentals/books       (admin only)
PUT    /api/v2/rentals/books/:id   (admin only)
DELETE /api/v2/rentals/books/:id   (admin only)

# Rental Requests
GET    /api/v2/rentals/requests
POST   /api/v2/rentals/request
PATCH  /api/v2/rentals/requests/:id/approve  (admin only)
PATCH  /api/v2/rentals/requests/:id/reject   (admin only)

# Active Rentals
GET    /api/v2/rentals/active
POST   /api/v2/rentals/:requestId/checkout   (admin only)
PATCH  /api/v2/rentals/:id/return

# History
GET    /api/v2/rentals/history
GET    /api/v2/rentals/stats       (admin only)
```

## 🚀 Build and Deploy

```bash
# Install dependencies
pnpm install

# Build backend and frontend
pnpm build

# Start development server
pnpm dev

# Start production server
pnpm start
```

## 📝 Database Schema Summary

### Advertising Tables
- `advertisements` - Main ad records
- `ad_analytics` - Track views and clicks
- `advertisement_slots` - Define ad placement locations
- `ad_placements` - Link ads to slots

### Face ID Tables
- `face_profiles` - User face data and descriptors
- `face_verification_logs` - Verification attempt history

### Rental Tables
- `books` - Book catalog
- `rental_requests` - Pending/approved rental requests
- `rentals` - Active rentals
- `rental_history` - Completed rentals with late fees

## 🔐 Authentication & Authorization

All endpoints require authentication via `authenticateToken` middleware.

Admin-only endpoints additionally check `(req as any).user?.isAdmin` flag.

Make sure your user table has:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
```

## ✅ Testing

1. **Advertising**: Navigate to `/admin/ads` to create test ads
2. **Face ID**: Go to `/profile/face-id` to register face
3. **Rental**: Visit `/library/books` to browse and request books
4. **Ad Tracking**: View analytics at `/admin/ads/analytics`

## 🐛 Troubleshooting

### Routes not found
- Ensure all routes are registered in `app.ts`
- Check that module files are in correct paths

### Database errors
- Run migrations in order (001, 002, 003)
- Ensure PostgreSQL is running
- Check database connection string

### Authentication errors
- Verify JWT token is being sent in Authorization header
- Check token expiration
- Ensure user exists in database

### CORS issues
- Check CORS configuration in `app.ts`
- Ensure frontend URL is whitelisted

## 📞 Support

For issues or questions, check:
1. Backend logs in console
2. Browser console for frontend errors
3. Database logs for SQL errors
4. API response messages for specific errors

---

**All three systems are now integrated and ready to use!**
