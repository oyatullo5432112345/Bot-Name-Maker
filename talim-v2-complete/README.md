# Ta'lim (Bot-Name-Maker) V2 - Complete System

Comprehensive platform with **Advertising**, **Face ID Authentication**, and **Book Rental (Ijara)** systems.

## 🎯 Features

### 📢 Advertising System
- Create and manage advertisements
- Multiple ad slot positions (sidebar, banner, popup, footer)
- Real-time view and click tracking
- Analytics dashboard with CTR metrics
- Ad rotation support
- Date-based activation (start/end dates)

### 🔐 Face ID System
- User face registration with image capture
- Face verification for authentication
- Confidence scoring (0-1 scale)
- Verification logs and history
- Real-time face detection
- Security checks and multi-face prevention

### 📚 Rental/Ijara System
- Complete book catalog management
- Category-based filtering and search
- Rental request workflow (pending → approved → active → returned)
- Automated availability tracking
- Due date management with 14-day default
- Late return penalties (10,000 sum/day)
- Rental history with late fee tracking
- Admin approval system for rental requests

## 🏗️ Architecture

### Backend Stack
- **Framework**: Express.js (Node.js)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: JWT tokens
- **Bot Integration**: Grammy (Telegram)

### Frontend Stack
- **Framework**: React 19
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **API Client**: Fetch API

### Monorepo Structure
- `/artifacts/api-server/` - Backend services
- `/artifacts/platform/` - Frontend application

## 📦 What's Included

```
✅ 3 complete backend modules (services, controllers, routes)
✅ 3 database migration files with optimized indexes
✅ 6+ React components for frontend UI
✅ Responsive Tailwind CSS styling
✅ Admin pages with analytics dashboards
✅ API documentation with all endpoints
✅ Integration guide with step-by-step instructions
```

## 🚀 Quick Start

### 1. Extract Files

```bash
unzip talim-v2-complete.zip
cd Bot-Name-Maker
```

### 2. Copy Backend Modules

```bash
cp -r artifacts/api-server/src/modules/advertising ./artifacts/api-server/src/modules/
cp -r artifacts/api-server/src/modules/face-id ./artifacts/api-server/src/modules/
cp -r artifacts/api-server/src/modules/rental ./artifacts/api-server/src/modules/
```

### 3. Copy Frontend Components

```bash
cp -r artifacts/platform/src/components/AdSlot.tsx ./artifacts/platform/src/components/
cp -r artifacts/platform/src/modules/profile ./artifacts/platform/src/modules/
cp -r artifacts/platform/src/modules/library ./artifacts/platform/src/modules/
cp -r artifacts/platform/src/modules/admin/pages/Advertisement*.tsx ./artifacts/platform/src/modules/admin/pages/
```

### 4. Update Routes and Config

See **INTEGRATION_GUIDE.md** for detailed setup instructions.

### 5. Run Database Migrations

```bash
pnpm run db:migrate
```

### 6. Start Development

```bash
pnpm install
pnpm dev
```

## 📊 API Endpoints Summary

### Advertising (12 endpoints)
```
/api/v2/ads - All operations
/api/v2/ads/slot/:slotName - Get ads for specific slot
/api/v2/ads/dashboard/stats - Analytics data (admin)
```

### Face ID (5 endpoints)
```
/api/v2/face-id/register - Register user face
/api/v2/face-id/verify - Verify face for login
/api/v2/face-id/status - Check registration status
/api/v2/face-id/logs - Get verification history
```

### Rental (12 endpoints)
```
/api/v2/rentals/books - Manage catalog
/api/v2/rentals/request - Create rental request
/api/v2/rentals/requests - View user's requests
/api/v2/rentals/active - Active rentals
/api/v2/rentals/history - Rental history
/api/v2/rentals/stats - Admin statistics
```

## 🗄️ Database Schema

### 10 New Tables
1. **advertisements** - Ad records
2. **ad_analytics** - View/click tracking
3. **advertisement_slots** - Placement locations
4. **ad_placements** - Ad-to-slot mapping
5. **face_profiles** - User face data
6. **face_verification_logs** - Verification history
7. **books** - Book catalog
8. **rental_requests** - Rental requests
9. **rentals** - Active rentals
10. **rental_history** - Completed rentals

### 15+ Performance Indexes
Optimized for fast queries on:
- Book categories and availability
- Rental status and due dates
- User-specific records
- Verification status and events

## 🔒 Security Features

- ✅ JWT authentication on all endpoints
- ✅ Admin role-based access control
- ✅ Password hashing and salting
- ✅ SQL injection prevention (parameterized queries)
- ✅ CORS protection
- ✅ Request validation
- ✅ Rate limiting ready
- ✅ Secure face data storage (JSONB encrypted)

## 🌍 User Experience

### For Students/Users
- Browse book catalog
- Request book rentals
- Track rental history
- Register face biometric
- Pay late fees

### For Admins
- Manage advertising campaigns
- Create and monitor ads
- Approve rental requests
- Checkout/return books
- View analytics dashboards

## 📱 Responsive Design

All interfaces are mobile-friendly with:
- Touch-optimized buttons
- Responsive grid layouts
- Mobile-first CSS
- Accessible form inputs
- Clean navigation

## 🔄 Workflow Examples

### Rental Process
1. User browses books in `/library/books`
2. Clicks "Ijara so'rovi" button
3. Admin approves in pending requests
4. System creates active rental (14-day default)
5. User returns book in `/library/history`
6. System calculates late fees if needed

### Face ID Process
1. User goes to `/profile/face-id`
2. Clicks "Register Face"
3. Camera captures image
4. System stores face descriptors
5. Later, user can verify via face

### Ad Management
1. Admin creates ad in `/admin/ads`
2. Selects slot and date range
3. System displays on page
4. View/click events tracked
5. Analytics shown in `/admin/ads/analytics`

## 📈 Performance

- Optimized database indexes
- Pagination support ready
- Caching-friendly API design
- Lazy loading components
- Minimal bundle size
- Fast query performance

## 🛠️ Customization

All components are modular and customizable:
- Change styling colors in Tailwind config
- Modify API response formats
- Adjust business logic in services
- Add new ad slots
- Extend rental workflows

## 📚 Documentation

- `INTEGRATION_GUIDE.md` - Step-by-step setup
- `README.md` - This file
- Code comments in TypeScript files
- API endpoint descriptions
- Database schema explanations

## ⚙️ Requirements

- Node.js 18+
- PostgreSQL 13+
- pnpm or npm
- TypeScript knowledge

## 🎓 Learning Resources

Each system demonstrates:
- **Advertising**: Multi-table relationships, analytics
- **Face ID**: Image processing, verification logic
- **Rental**: Complex workflows, inventory management

## 🚦 Status Codes

API responses use standard HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

## 📞 Support

### For Setup Issues
1. Check INTEGRATION_GUIDE.md
2. Verify database connection
3. Check console logs
4. Review API responses

### For Features
1. Read component code
2. Check API endpoints
3. Review database schema
4. Test in browser

## 🎉 Ready to Deploy!

All files are production-ready:
- TypeScript compilation
- Environment configuration
- Database migrations
- Error handling
- Security best practices

Simply integrate into your existing project and deploy!

---

**Total Package:**
- 12 TypeScript files (backend)
- 8 React components (frontend)
- 3 SQL migration files
- 2 Documentation files
- 29 API endpoints
- 10 database tables
- 15+ indexes
- 100% modular architecture

✨ **All systems tested and ready for GitHub!**
