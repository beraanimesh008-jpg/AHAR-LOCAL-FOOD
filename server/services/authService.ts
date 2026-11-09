import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'aharlocal_jwt_super_secret_production_key_2026';

export interface UserTokenPayload {
  id: number;
  email: string;
  name: string;
  role: 'customer' | 'restaurant' | 'delivery' | 'admin';
  phone: string;
}

export const authService = {
  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  },

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  generateToken(user: UserTokenPayload): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  },

  verifyToken(token: string): UserTokenPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as UserTokenPayload;
    } catch {
      return null;
    }
  },

  async findUserByEmail(email: string) {
    if (db.isUsingMysql()) {
      const res = await db.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
      return res.rows[0] || null;
    }
    const store = db.getStore();
    return store.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async findUserByPhone(phone: string) {
    if (db.isUsingMysql()) {
      const res = await db.query('SELECT * FROM users WHERE phone = ? LIMIT 1', [phone]);
      return res.rows[0] || null;
    }
    const store = db.getStore();
    return store.users.find((u: any) => u.phone === phone) || null;
  },

  async findUserById(id: number) {
    if (db.isUsingMysql()) {
      const res = await db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
      return res.rows[0] || null;
    }
    const store = db.getStore();
    return store.users.find((u: any) => u.id === id) || null;
  },

  async createUser(userData: {
    name: string;
    email: string;
    phone: string;
    password_hash: string;
    role: 'customer' | 'restaurant' | 'delivery' | 'admin';
    language?: string;
    dob?: string;
    gender?: string;
    address?: string;
    passport_photo?: string;
    auth_provider?: 'google' | 'local';
    profile_photo?: string;
  }) {
    if (db.isUsingMysql()) {
      const existingEmail = await this.findUserByEmail(userData.email);
      if (existingEmail) {
        throw new Error('Email is already registered (ইমেলটি ইতিমধ্যে নিবন্ধিত)');
      }
      const existingPhone = await this.findUserByPhone(userData.phone);
      if (existingPhone) {
        throw new Error('Phone number is already registered (মোবাইল নম্বরটি ইতিমধ্যে নিবন্ধিত)');
      }

      const profilePhoto = userData.profile_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
      const language = userData.language || 'bn';
      const authProvider = userData.auth_provider || 'local';

      const query = `
        INSERT INTO users (name, email, phone, password_hash, role, profile_photo, passport_photo, language, dob, gender, address, auth_provider, is_active, cod_enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
      `;
      const params = [
        userData.name,
        userData.email,
        userData.phone,
        userData.password_hash,
        userData.role,
        profilePhoto,
        userData.passport_photo || null,
        language,
        userData.dob || null,
        userData.gender || null,
        userData.address || null,
        authProvider
      ];

      const result = await db.query(query, params);
      const insertId = result.insertId || 1;

      return {
        id: insertId,
        ...userData,
        profile_photo: profilePhoto,
        language,
        auth_provider: authProvider,
        is_active: 1,
        cod_enabled: 0,
        created_at: new Date().toISOString()
      };
    }

    // Fallback to in-memory store
    const store = db.getStore();
    const newId = store.users.length + 1;
    const user = {
      id: newId,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      password_hash: userData.password_hash,
      role: userData.role,
      profile_photo: userData.profile_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      language: userData.language || 'bn',
      dob: userData.dob || null,
      gender: userData.gender || null,
      address: userData.address || null,
      passport_photo: userData.passport_photo || null,
      auth_provider: userData.auth_provider || 'local',
      is_active: 1,
      cod_enabled: 0,
      created_at: new Date().toISOString()
    };
    store.users.push(user);
    return user;
  },

  async updateUser(id: number, updateData: any) {
    if (db.isUsingMysql()) {
      const fields: string[] = [];
      const params: any[] = [];
      for (const [key, value] of Object.entries(updateData)) {
        fields.push(`\`${key}\` = ?`);
        params.push(value);
      }
      if (fields.length === 0) return await this.findUserById(id);
      params.push(id);
      await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
      return await this.findUserById(id);
    }

    const store = db.getStore();
    const user = store.users.find((u: any) => u.id === id);
    if (user) {
      Object.assign(user, updateData);
    }
    return user;
  },

  async getUserAddresses(userId: number) {
    if (db.isUsingMysql()) {
      const res = await db.query('SELECT * FROM addresses WHERE user_id = ?', [userId]);
      return res.rows;
    }
    const store = db.getStore();
    return (store.addresses || []).filter((a: any) => a.user_id === userId);
  },

  async addUserAddress(addressData: {
    user_id: number;
    type?: string;
    label?: string;
    address_line: string;
    landmark?: string;
    latitude: number;
    longitude: number;
    is_default?: number;
  }) {
    if (db.isUsingMysql()) {
      if (addressData.is_default) {
        await db.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [addressData.user_id]);
      }
      const query = `
        INSERT INTO addresses (user_id, type, label, address_line, landmark, latitude, longitude, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        addressData.user_id,
        addressData.type || 'home',
        addressData.label || null,
        addressData.address_line,
        addressData.landmark || null,
        addressData.latitude,
        addressData.longitude,
        addressData.is_default ? 1 : 0
      ];
      const res = await db.query(query, params);
      return { id: res.insertId || 1, ...addressData };
    }

    const store = db.getStore();
    if (!store.addresses) store.addresses = [];
    const newId = store.addresses.length + 1;
    const addr = { id: newId, ...addressData };
    store.addresses.push(addr);
    return addr;
  }
};
