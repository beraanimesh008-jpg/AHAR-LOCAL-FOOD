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

  findUserByEmail(email: string) {
    const store = db.getStore();
    return store.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  },

  findUserByPhone(phone: string) {
    const store = db.getStore();
    return store.users.find((u: any) => u.phone === phone);
  },

  findUserById(id: number) {
    const store = db.getStore();
    return store.users.find((u: any) => u.id === id);
  },

  createUser(userData: {
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
  }
};
