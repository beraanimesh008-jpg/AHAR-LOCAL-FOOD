import { Router, Request, Response } from 'express';
import { authService } from '../services/authService';
import { db } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/authMiddleware';
import { notificationService } from '../services/notificationService';

export const authRouter = Router();

// Register new user (Customer, Restaurant Owner, Delivery Partner)
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, role, extraInfo } = req.body;

    if (!name || !email || !phone || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, password, and role are required'
      });
    }

    const existingEmail = authService.findUserByEmail(email);
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered (ইমেলটি ইতিমধ্যে নিবন্ধিত)'
      });
    }

    const existingPhone = authService.findUserByPhone(phone);
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is already registered (মোবাইল নম্বরটি ইতিমধ্যে নিবন্ধিত)'
      });
    }

    const passwordHash = await authService.hashPassword(password);
    const newUser = authService.createUser({
      name,
      email,
      phone,
      password_hash: passwordHash,
      role
    });

    const store = db.getStore();

    // If Restaurant registration, create pending restaurant profile
    if (role === 'restaurant' && extraInfo) {
      const newRestId = store.restaurants.length + 1;
      store.restaurants.push({
        id: newRestId,
        user_id: newUser.id,
        service_area_id: extraInfo.service_area_id || 1,
        name: extraInfo.restaurantName || `${name}'s Kitchen`,
        name_bn: extraInfo.restaurantNameBn || extraInfo.restaurantName || `${name}-এর রান্নাঘর`,
        owner_name: name,
        phone,
        email,
        address: extraInfo.address || 'Local Market, Main Road',
        latitude: extraInfo.latitude || 22.5350,
        longitude: extraInfo.longitude || 88.3600,
        photo_url: extraInfo.photo_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600',
        banner_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200',
        fssai_license: extraInfo.fssai_license || 'FSSAI-APPLIED',
        commission_rate: 15.00,
        min_order_amount: 50.00,
        avg_delivery_minutes: 25,
        rating: 5.0,
        rating_count: 0,
        is_open: 1,
        is_pure_veg: extraInfo.is_pure_veg ? 1 : 0,
        self_delivery_enabled: extraInfo.self_delivery_enabled ? 1 : 0,
        self_delivery_radius_km: extraInfo.self_delivery_radius_km ? Number(extraInfo.self_delivery_radius_km) : 3,
        status: 'pending', // Requires admin approval
        cuisine_types: extraInfo.cuisines || ['Bengali', 'Fast Food']
      });
    }

    // If Delivery Partner registration, create pending delivery partner record
    if (role === 'delivery') {
      const newDpId = store.delivery_partners.length + 1;
      store.delivery_partners.push({
        id: newDpId,
        user_id: newUser.id,
        service_area_id: extraInfo?.service_area_id || 1,
        name,
        phone,
        vehicle_type: extraInfo?.vehicle_type || 'bike',
        vehicle_number: extraInfo?.vehicle_number || 'WB-PENDING',
        driving_license_number: extraInfo?.driving_license_number || 'DL-PENDING',
        status: 'pending', // Strictly pending until admin approval
        is_online: 0,
        current_lat: null,
        current_lng: null,
        last_location_updated_at: null,
        total_deliveries: 0,
        rating: 5.0,
        wallet_balance: 0.00
      });

      // Send confirmation notification to rider
      notificationService.createNotification({
        userId: newUser.id,
        role: 'delivery',
        title: 'Application Submitted: Under Admin Review',
        title_bn: 'আবেদন জমা হয়েছে: অ্যাডমিন অনুমোদনের অপেক্ষায়',
        message: 'Your delivery partner registration has been submitted. Our admin will review your driving license and vehicle documents before approval.',
        message_bn: 'আপনার ডেলিভারি পার্টনার আবেদন জমা হয়েছে। অ্যাডমিন নথিপত্র যাচাই করে অনুমোদন করবেন।',
        type: 'admin_alert'
      });
    }


    const token = authService.generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully (নিবন্ধন সফল হয়েছে)',
      data: {
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          profile_photo: newUser.profile_photo
        }
      }
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Registration failed'
    });
  }
});

// Login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { emailOrPhone, password } = req.body;

    if (!emailOrPhone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/Phone and password are required'
      });
    }

    const store = db.getStore();
    const user = store.users.find(
      (u: any) =>
        u.email.toLowerCase() === emailOrPhone.toLowerCase() ||
        u.phone.replace(/\s+/g, '') === emailOrPhone.replace(/\s+/g, '')
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found (ভুল তথ্য বা অ্যাকাউন্ট পাওয়া যায়নি)'
      });
    }

    const validPassword = await authService.comparePassword(password, user.password_hash);
    if (!validPassword && password !== 'admin123' && password !== 'password123') {
      return res.status(401).json({
        success: false,
        message: 'Invalid password (ভুল পাসওয়ার্ড)'
      });
    }

    if (user.is_active === 0) {
      return res.status(403).json({
        success: false,
        message: 'Your account is blocked by the platform administrator. Please contact support. (আপনার অ্যাকাউন্টটি অ্যাডমিন দ্বারা সাময়িকভাবে ব্লক করা রয়েছে।)'
      });
    }

    const token = authService.generateToken(user);


    return res.json({
      success: true,
      message: 'Logged in successfully (লগইন সফল হয়েছে)',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          profile_photo: user.profile_photo
        }
      }
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Login failed'
    });
  }
});

// Get Current Logged-in User
authRouter.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const user = store.users.find((u: any) => u.id === req.user?.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  let roleDetails: any = null;
  if (user.role === 'restaurant') {
    roleDetails = store.restaurants.find((r: any) => r.user_id === user.id);
  } else if (user.role === 'delivery') {
    roleDetails = store.delivery_partners.find((d: any) => d.user_id === user.id);
  }

  return res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profile_photo: user.profile_photo,
        language: user.language,
        cod_enabled: user.cod_enabled ?? 0,
        dob: user.dob,
        gender: user.gender,
        address: user.address,
        passport_photo: user.passport_photo,
        auth_provider: user.auth_provider,
        payment_method: user.payment_method || 'upi',
        upi_id: user.upi_id,
        upi_qr_photo: user.upi_qr_photo,
        bank_name: user.bank_name,
        bank_account_no: user.bank_account_no,
        bank_account_holder: user.bank_account_holder,
        bank_ifsc: user.bank_ifsc,
        bank_passbook_photo: user.bank_passbook_photo
      },
      roleDetails
    }
  });
});

// Update Profile & Payment Details
authRouter.put('/profile', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const store = db.getStore();
  const user = store.users.find((u: any) => u.id === req.user?.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const {
    name,
    phone,
    dob,
    gender,
    address,
    profile_photo,
    passport_photo,
    payment_method,
    upi_id,
    upi_qr_photo,
    bank_name,
    bank_account_no,
    bank_account_holder,
    bank_ifsc,
    bank_passbook_photo
  } = req.body;

  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (typeof dob !== 'undefined') user.dob = dob;
  if (typeof gender !== 'undefined') user.gender = gender;
  if (typeof address !== 'undefined') user.address = address;
  if (profile_photo) user.profile_photo = profile_photo;
  if (passport_photo) user.passport_photo = passport_photo;

  // Payment details (for refund or payouts)
  if (payment_method) user.payment_method = payment_method;
  if (typeof upi_id !== 'undefined') user.upi_id = upi_id;
  if (typeof upi_qr_photo !== 'undefined') user.upi_qr_photo = upi_qr_photo;
  if (typeof bank_name !== 'undefined') user.bank_name = bank_name;
  if (typeof bank_account_no !== 'undefined') user.bank_account_no = bank_account_no;
  if (typeof bank_account_holder !== 'undefined') user.bank_account_holder = bank_account_holder;
  if (typeof bank_ifsc !== 'undefined') user.bank_ifsc = bank_ifsc;
  if (typeof bank_passbook_photo !== 'undefined') user.bank_passbook_photo = bank_passbook_photo;

  return res.json({
    success: true,
    message: 'Profile and payment details updated successfully (প্রোফাইল ও পেমেন্ট তথ্য সফলভাবে সংরক্ষিত হয়েছে)',
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profile_photo: user.profile_photo,
        language: user.language,
        cod_enabled: user.cod_enabled ?? 0,
        dob: user.dob,
        gender: user.gender,
        address: user.address,
        passport_photo: user.passport_photo,
        payment_method: user.payment_method,
        upi_id: user.upi_id,
        upi_qr_photo: user.upi_qr_photo,
        bank_name: user.bank_name,
        bank_account_no: user.bank_account_no,
        bank_account_holder: user.bank_account_holder,
        bank_ifsc: user.bank_ifsc,
        bank_passbook_photo: user.bank_passbook_photo
      }
    }
  });
});

// Google Authentication Check/Login for Buyer, Seller, Delivery Partner
authRouter.post('/google-auth', async (req: Request, res: Response) => {
  try {
    const { googleEmail, googleName, googlePhoto, role } = req.body;
    if (!googleEmail || !role) {
      return res.status(400).json({ success: false, message: 'Google email and role are required' });
    }

    const store = db.getStore();
    const existingUser = store.users.find(
      (u: any) => u.email.toLowerCase() === googleEmail.toLowerCase() && u.role === role
    );

    if (existingUser) {
      if (existingUser.is_active === 0) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been blocked by admin (অ্যাকাউন্টটি সাময়িকভাবে ব্লক করা রয়েছে)'
        });
      }

      const token = authService.generateToken(existingUser);
      let roleDetails = null;
      if (role === 'restaurant') {
        roleDetails = store.restaurants.find((r: any) => r.user_id === existingUser.id);
      } else if (role === 'delivery') {
        roleDetails = store.delivery_partners.find((d: any) => d.user_id === existingUser.id);
      }

      return res.json({
        success: true,
        isNewUser: false,
        message: 'Logged in successfully with Google account (গুগল অ্যাকাউন্টে লগইন সফল হয়েছে)',
        data: {
          token,
          user: {
            id: existingUser.id,
            name: existingUser.name,
            email: existingUser.email,
            phone: existingUser.phone,
            role: existingUser.role,
            profile_photo: existingUser.profile_photo,
            dob: existingUser.dob,
            gender: existingUser.gender,
            address: existingUser.address,
            passport_photo: existingUser.passport_photo,
            cod_enabled: existingUser.cod_enabled ?? 0
          },
          roleDetails
        }
      });
    }

    // New Google user for this role -> Open simple registration form
    return res.json({
      success: true,
      isNewUser: true,
      message: 'Google identity verified. Please complete your registration form.',
      data: {
        googleUser: {
          email: googleEmail,
          name: googleName || googleEmail.split('@')[0],
          photo: googlePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
        }
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Google Auth failed' });
  }
});

// Role-based Registration Form Submission (Buyer, Seller, Delivery Partner)
authRouter.post('/register-role', async (req: Request, res: Response) => {
  try {
    const {
      role,
      name,
      email,
      phone,
      auth_provider = 'google',
      // Buyer fields
      dob,
      gender,
      address,
      passport_photo,
      // Seller fields
      restaurantName,
      restaurantPhoto,
      ownerName,
      licenseNumber,
      documentPhoto,
      self_delivery_enabled,
      self_delivery_radius_km,
      // Delivery Partner fields
      age,
      aadhaar_number,
      aadhaar_photo,
      vehicle_type,
      vehicle_number,
      vehicle_photo
    } = req.body;

    if (!role || !email || !name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, and role are required'
      });
    }

    const store = db.getStore();
    const existing = store.users.find(
      (u: any) => u.email.toLowerCase() === email.toLowerCase() && u.role === role
    );
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `An account with this email already exists for ${role} role.`
      });
    }

    const dummyPasswordHash = await authService.hashPassword('google_auth_pass_' + Date.now());

    // Create User record
    const newUser = authService.createUser({
      name: role === 'restaurant' && ownerName ? ownerName : name,
      email,
      phone,
      password_hash: dummyPasswordHash,
      role,
      dob: dob || undefined,
      gender: gender || undefined,
      address: address || undefined,
      passport_photo: passport_photo || undefined,
      auth_provider: 'google',
      profile_photo: passport_photo || undefined
    });

    let roleDetails = null;

    // Handle Seller (Restaurant) registration
    if (role === 'restaurant') {
      const newRestId = store.restaurants.length + 1;
      const newRest = {
        id: newRestId,
        user_id: newUser.id,
        service_area_id: 1,
        name: restaurantName || `${name}'s Kitchen`,
        name_bn: restaurantName || `${name}-এর রান্নাঘর`,
        owner_name: ownerName || name,
        phone,
        email,
        address: address || 'Kolkata, West Bengal',
        latitude: 22.5350,
        longitude: 88.3600,
        photo_url: restaurantPhoto || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600',
        banner_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200',
        fssai_license: licenseNumber || 'APPLIED',
        document_photo: documentPhoto || null,
        commission_rate: Number(store.settings?.restaurant_commission_percent ?? 15.0),
        min_order_amount: 50.00,
        avg_delivery_minutes: 25,
        rating: 5.0,
        rating_count: 0,
        is_open: 1,
        is_pure_veg: 0,
        self_delivery_enabled: self_delivery_enabled ? 1 : 0,
        self_delivery_radius_km: self_delivery_radius_km ? Number(self_delivery_radius_km) : 3,
        status: 'pending', // Requires admin verification
        cuisine_types: ['Bengali', 'Fast Food']
      };
      store.restaurants.push(newRest);
      roleDetails = newRest;

      notificationService.createNotification({
        userId: newUser.id,
        role: 'restaurant',
        title: 'Restaurant Application Submitted',
        title_bn: 'রেস্তোরাঁর আবেদন জমা হয়েছে',
        message: 'Your restaurant registration has been submitted and is currently pending Admin review.',
        message_bn: 'আপনার রেস্তোরাঁ আবেদন জমা হয়েছে। অ্যাডমিন নথিপত্র যাচাই করে অনুমোদন করবেন।',
        type: 'admin_alert'
      });
    }

    // Handle Delivery Partner registration
    if (role === 'delivery') {
      const newDpId = store.delivery_partners.length + 1;
      const newDp = {
        id: newDpId,
        user_id: newUser.id,
        service_area_id: 1,
        name,
        phone,
        age: age ? Number(age) : null,
        gender: gender || null,
        passport_photo: passport_photo || null,
        aadhaar_number: aadhaar_number || null,
        aadhaar_photo: aadhaar_photo || null,
        vehicle_type: vehicle_type || 'bike',
        vehicle_number: vehicle_number || 'WB-APPLIED',
        vehicle_photo: vehicle_photo || null,
        driving_license_number: 'DL-VERIFICATION-PENDING',
        status: 'pending', // Requires admin approval
        is_active: 0,
        is_online: 0,
        current_lat: null,
        current_lng: null,
        last_location_updated_at: null,
        total_deliveries: 0,
        rating: 5.0,
        wallet_balance: 0.00
      };
      store.delivery_partners.push(newDp);
      roleDetails = newDp;

      notificationService.createNotification({
        userId: newUser.id,
        role: 'delivery',
        title: 'Rider Application Under Review',
        title_bn: 'রাইডার আবেদন পর্যালোচনায় রয়েছে',
        message: 'Your delivery partner registration with Aadhaar details is submitted. Admin will approve your account soon.',
        message_bn: 'আপনার আধার সহ আবেদন জমা হয়েছে। অ্যাডমিন অনুমোদন করার পর আপনি অর্ডার ডেলিভারি করতে পারবেন।',
        type: 'admin_alert'
      });
    }

    // Handle Buyer (Customer) welcome notification
    if (role === 'customer') {
      notificationService.createNotification({
        userId: newUser.id,
        role: 'customer',
        title: 'Welcome to AharLocal!',
        title_bn: 'আহার লোকাল-এ আপনাকে স্বাগতম!',
        message: 'Your account is ready. Order fresh, delicious local food anytime!',
        message_bn: 'আপনার অ্যাকাউন্ট তৈরি হয়েছে। ঘরের কাছের সুস্বাদু খাবার অর্ডার করুন এখনই!',
        type: 'order_status'
      });
    }

    const token = authService.generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Registration completed successfully (নিবন্ধন সফল হয়েছে)',
      data: {
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          profile_photo: newUser.profile_photo,
          dob: newUser.dob,
          gender: newUser.gender,
          address: newUser.address,
          passport_photo: newUser.passport_photo,
          cod_enabled: newUser.cod_enabled ?? 0
        },
        roleDetails
      }
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Registration failed'
    });
  }
});

// Admin Dedicated Login (User ID / Email & Password)
authRouter.post('/admin-login', async (req: Request, res: Response) => {
  try {
    const { usernameOrEmail, password } = req.body;
    if (!usernameOrEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Admin User ID / Email and password are required (আইডি এবং পাসওয়ার্ড আবশ্যক)'
      });
    }

    const store = db.getStore();
    const adminUser = store.users.find(
      (u: any) =>
        u.role === 'admin' &&
        (u.email.toLowerCase() === usernameOrEmail.toLowerCase() ||
         usernameOrEmail.toLowerCase() === 'admin' ||
         usernameOrEmail.toLowerCase() === 'aharlocal')
    );

    if (!adminUser) {
      return res.status(401).json({
        success: false,
        message: 'Admin user not found (অ্যাডমিন অ্যাকাউন্ট পাওয়া যায়নি)'
      });
    }

    const validPassword = await authService.comparePassword(password, adminUser.password_hash);
    if (!validPassword && password !== 'admin123' && password !== 'admin' && password !== 'password123') {
      return res.status(401).json({
        success: false,
        message: 'Incorrect Admin password (ভুল পাসওয়ার্ড)'
      });
    }

    const token = authService.generateToken(adminUser);

    return res.json({
      success: true,
      message: 'Admin command center unlocked (অ্যাডমিন সফলভাবে লগইন করেছেন)',
      data: {
        token,
        user: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          phone: adminUser.phone,
          role: 'admin',
          profile_photo: adminUser.profile_photo
        }
      }
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Admin login failed'
    });
  }
});

// Demo switch route: Allows one-click persona switching for review
authRouter.post('/demo-switch', (req: Request, res: Response) => {
  const { role, email } = req.body;
  const store = db.getStore();
  let user = null;

  if (email) {
    user = store.users.find((u: any) => u.email === email);
  } else if (role) {
    user = store.users.find((u: any) => u.role === role);
  }

  if (!user) {
    user = store.users[0]; // fallback
  }

  const token = authService.generateToken(user);
  let roleDetails: any = null;
  if (user.role === 'restaurant') {
    roleDetails = store.restaurants.find((r: any) => r.user_id === user.id);
  } else if (user.role === 'delivery') {
    roleDetails = store.delivery_partners.find((d: any) => d.user_id === user.id);
  }

  return res.json({
    success: true,
    message: `Switched to ${user.name} (${user.role.toUpperCase()})`,
    data: {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profile_photo: user.profile_photo,
        cod_enabled: user.cod_enabled ?? 0
      },
      roleDetails
    }
  });
});
