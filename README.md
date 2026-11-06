# AharLocal (আহার লোকাল) - Local Food Delivery Platform

Production-ready local food delivery platform similar in workflow to Zomato, featuring 100% original branding, clean modern UI, bilingual Bengali + English interface, and high accessibility for local/rural users.

---

## 🌟 Key Features

1. **Four Interconnected Systems**:
   - **Customer App**: Hyperlocal restaurant browsing, menu ordering, saved addresses, instant coupon discounts, cash on delivery / online payments, live Google Maps road-following order tracking.
   - **Restaurant Panel**: Store open/close toggle, incoming order audio chimes, prep time acceptance (15/25/40 mins), cooking progress, menu management (add/edit dishes, price, veg/non-veg), gross sales & net earnings ledger with commission deduction.
   - **Delivery Partner App**: Online/Offline toggle, privacy-first GPS tracking (only when online), trip request alert with distance & earning, turn-by-turn Google Maps street navigation, step-by-step delivery workflow (Navigate to Store -> Picked Up -> Deliver to Customer -> Cash Collection).
   - **Admin Ops Console**: Strict **NO GPS** architecture, KPI overview metrics, restaurant approvals/rejections with map location pin inspect, delivery rider document verification, live orders radar, service area polygon geofence manager.

2. **Location & Privacy Architecture**:
   - **Google Maps JavaScript API & Advanced Markers**: Road-following routes, delivery pins, restaurant pins, and service area polygons.
   - **Customer**: GPS requested strictly when user taps "Detect My GPS Location". Fallback manual map pin picker and address input if denied.
   - **Restaurant**: Fixed coordinates stored in database. Zero continuous tracking.
   - **Delivery Partner**: GPS active only while "Online". Completely turns off when "Offline". Ephemeral live location updates during active deliveries.
   - **Admin**: **Zero GPS calls**. Admin interface works without browser location permissions.

3. **Backend & Database**:
   - Node.js + Express REST APIs with JWT Bearer authentication and role-based access control.
   - MySQL database schema (`database/schema.sql`) covering 23 comprehensive tables: users, restaurants, foods, orders, payments, coupons, service_areas, wallets, notifications, delivery_assignments, etc.
   - Seed data (`database/seed.sql`) featuring authentic Kolkata & local cuisine (Biryani, Bengali sweets, Thali, Kachori).
   - Dual-mode connection engine: Connects directly to MySQL in production (`mysql2/promise`) while maintaining high-fidelity relational state in development.

---

## 🚀 Quick Start (Development)

```bash
# 1. Install dependencies
npm install

# 2. Start the full-stack development server
npm run dev
```

Visit `http://localhost:3000`.

---

## 🛠️ Production Deployment Guide (Hostinger / cPanel / Ubuntu VPS)

### 1. Database Setup (MySQL)
1. In Hostinger / cPanel, open **MySQL Databases** and create a new database `aharlocal_db` and user.
2. Open **phpMyAdmin**, select `aharlocal_db`.
3. Import `/database/schema.sql`.
4. Import `/database/seed.sql` for initial categories, demo restaurants, and admin accounts.

### 2. Environment Variables (.env)
Create a `.env` file in the root directory:
```env
DATABASE_HOST="localhost"
DATABASE_PORT="3306"
DATABASE_NAME="aharlocal_db"
DATABASE_USER="your_db_user"
DATABASE_PASSWORD="your_db_password"

JWT_SECRET="your_production_secret_key"
JWT_REFRESH_SECRET="your_refresh_secret_key"

GOOGLE_MAPS_API_KEY="your_google_maps_api_key"
VITE_GOOGLE_MAPS_API_KEY="your_google_maps_api_key"

PORT=3000
```

### 3. Build & Run
```bash
npm run build
npm start
```
