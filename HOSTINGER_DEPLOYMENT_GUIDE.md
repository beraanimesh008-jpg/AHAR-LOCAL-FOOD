# AharLocal (আহার Local) - Hostinger Deployment Guide

This guide provides step-by-step instructions to deploy your React frontend and PHP backend with MySQL Database on Hostinger (`https://aharlocal.in`).

---

## 1. Architecture Overview

```
public_html/
├── api/                           <-- PHP REST API Backend
│   ├── .htaccess                  <-- URL Rewriting & Authorization Header
│   ├── index.php                  <-- Master Route Dispatcher
│   ├── database.sql               <-- Full MySQL Table & Seed Import Script
│   ├── config/
│   │   ├── db.php                 <-- PDO Connection (Credentials here)
│   │   └── cors.php               <-- CORS Headers for https://aharlocal.in
│   ├── helpers/
│   │   ├── jwt.php                <-- Native JWT Auth (Zero Composer Dependencies)
│   │   ├── geo.php                <-- Haversine & Geofence Polygon Ray-casting
│   │   └── response.php           <-- Standard JSON Output
│   ├── middleware/
│   │   └── auth.php               <-- Bearer Token & Role Verification
│   └── controllers/
│       ├── AuthController.php
│       ├── RestaurantController.php
│       ├── OrderController.php
│       ├── DeliveryController.php
│       ├── ServiceAreaController.php
│       ├── CouponController.php
│       ├── NotificationController.php
│       ├── SettingsController.php
│       └── AdminController.php
│
├── index.html                     <-- Built React SPA
├── assets/                        <-- React JS & CSS bundles
└── favicon.svg
```

---

## 2. Step 1: Import MySQL Database in Hostinger hPanel

1. Log into your **Hostinger hPanel** -> **Databases** -> **phpMyAdmin**.
2. Select your database: `u691798054_aharlocal_db`.
3. Click the **Import** tab.
4. Choose the file: `public_html/api/database.sql`.
5. Ensure Character set is `utf8mb4` and click **Go** / **Import**.
6. All 21 production tables (users, restaurants, foods, delivery_partners, orders, location_rankings, service_areas, coupons, etc.) will be created and populated with initial seed data.

---

## 3. Step 2: Configure Database Password in `config/db.php`

Open `public_html/api/config/db.php` in Hostinger File Manager and set your database user password:

```php
$host     = 'localhost';
$db_name  = 'u691798054_aharlocal_db';
$username = 'u691798054_aharlocal_user';
$password = 'YOUR_HOSTINGER_DB_PASSWORD_HERE';
```

*(Note: Never expose this password in your frontend code or Git repo)*

---

## 4. Step 3: Upload Backend to `public_html/api/`

1. Open Hostinger **File Manager**.
2. Navigate into `public_html/`.
3. Create a folder named `api` if it doesn't already exist.
4. Upload all files from the `public_html/api/` folder into `public_html/api/` on Hostinger.
5. Make sure the hidden `.htaccess` file is uploaded into `public_html/api/.htaccess`.
6. Test in your browser:
   `https://aharlocal.in/api/health`
   You should see:
   ```json
   {
     "success": true,
     "data": {
       "status": "ok",
       "app": "AharLocal Food Delivery PHP REST API",
       "domain": "https://aharlocal.in",
       "db": "u691798054_aharlocal_db"
     }
   }
   ```

---

## 5. Step 4: Build and Deploy React Frontend

1. In your local terminal or workspace, build the production bundle:
   ```bash
   npm run build
   ```
2. The compiled assets will be created in the `dist/` directory.
3. Upload the contents of `dist/` directly into Hostinger's `public_html/`:
   - `dist/index.html` -> `public_html/index.html`
   - `dist/assets/` -> `public_html/assets/`
4. In `public_html/.htaccess` (the root .htaccess for React client routing), add:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     
     # Do NOT rewrite API calls
     RewriteRule ^api/ - [L]

     # Direct existing files
     RewriteCond %{REQUEST_FILENAME} -f [OR]
     RewriteCond %{REQUEST_FILENAME} -d
     RewriteRule ^ - [L]

     # Fallback to index.html for React SPA Router
     RewriteRule ^ index.html [L]
   </IfModule>
   ```

---

## 6. Seed Accounts for Testing

| Role | Email | Password | Phone |
|---|---|---|---|
| **Admin** | `admin@aharlocal.com` | `admin123` | `+919800000001` |
| **Restaurant Owner** | `kolkatabiryani@aharlocal.com` | `password123` | `+919800000002` |
| **Delivery Rider** | `rahul.delivery@aharlocal.com` | `password123` | `+919800000005` |
| **Customer** | `customer@aharlocal.com` | `password123` | `+919800000007` |

---

## 7. Key Features Fully Supported by PHP & MySQL

1. **In-Stock & Out-of-Stock Status**: Foods table `is_available` column (1 = in stock green point, 0 = out of stock red point).
2. **Location Radius Ranking Rules**: Custom center pin (`lat`, `lng`), radius (`radius_km`), and Top 5 restaurant rankings for each zone.
3. **Geofenced Service Area Polygon**: Stores vertices JSON array with Ray-Casting Point-in-Polygon check.
4. **Escrow & Order Payouts**: Order escrow states (`holding`, `matured`, `settled`, `refunded`, `disputed`), self-delivery vs platform rider delivery, rider handover timestamps.
5. **Restaurant & Rider Bank/UPI**: Bank account, IFSC, UPI ID, passbook, and QR code storage.
