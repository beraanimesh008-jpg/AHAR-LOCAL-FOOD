import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { apiRequest } from '../services/api';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  token: string | null;
  isLoading: boolean;
  roleDetails: any;
  isAuthModalOpen: boolean;
  authModalRole: UserRole | null;
  openAuthModal: (initialRole?: UserRole) => void;
  closeAuthModal: () => void;
  switchPersona: (role: UserRole, email?: string) => Promise<void>;
  login: (emailOrPhone: string, pass: string) => Promise<void>;
  googleAuth: (googleEmail: string, googleName: string, googlePhoto: string, targetRole: UserRole) => Promise<{ isNewUser: boolean; googleUser?: any }>;
  registerRole: (formData: any) => Promise<void>;
  adminLogin: (usernameOrEmail: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'customer',
  token: null,
  isLoading: true,
  roleDetails: null,
  isAuthModalOpen: false,
  authModalRole: null,
  openAuthModal: () => {},
  closeAuthModal: () => {},
  switchPersona: async () => {},
  login: async () => {},
  googleAuth: async () => ({ isNewUser: false }),
  registerRole: async () => {},
  adminLogin: async () => {},
  logout: () => {},
  refreshUser: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('aharlocal_token'));
  const [role, setRole] = useState<UserRole>('customer');
  const [roleDetails, setRoleDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalRole, setAuthModalRole] = useState<UserRole | null>(null);

  const openAuthModal = (initialRole?: UserRole) => {
    setAuthModalRole(initialRole || null);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthModalRole(null);
  };

  const refreshUser = async () => {
    try {
      if (!localStorage.getItem('aharlocal_token')) {
        // Default to demo customer if no session
        await switchPersona('customer');
        return;
      }
      const data = await apiRequest('/api/auth/me');
      setUser(data.user);
      setRole(data.user.role);
      setRoleDetails(data.roleDetails);
    } catch {
      // Fallback switch to demo customer
      await switchPersona('customer');
    } finally {
      setIsLoading(false);
    }
  };

  const switchPersona = async (targetRole: UserRole, email?: string) => {
    setIsLoading(true);
    try {
      const data = await apiRequest('/api/auth/demo-switch', {
        method: 'POST',
        body: JSON.stringify({ role: targetRole, email })
      });
      localStorage.setItem('aharlocal_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setRole(data.user.role);
      setRoleDetails(data.roleDetails);
    } catch (err) {
      console.error('Switch persona error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (emailOrPhone: string, pass: string) => {
    setIsLoading(true);
    try {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ emailOrPhone, password: pass })
      });
      localStorage.setItem('aharlocal_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setRole(data.user.role);
      await refreshUser();
    } finally {
      setIsLoading(false);
    }
  };

  const googleAuth = async (googleEmail: string, googleName: string, googlePhoto: string, targetRole: UserRole) => {
    setIsLoading(true);
    try {
      const res = await apiRequest('/api/auth/google-auth', {
        method: 'POST',
        body: JSON.stringify({ googleEmail, googleName, googlePhoto, role: targetRole })
      });

      if (!res.isNewUser && res.token) {
        localStorage.setItem('aharlocal_token', res.token);
        setToken(res.token);
        setUser(res.user);
        setRole(res.user.role);
        setRoleDetails(res.roleDetails);
        closeAuthModal();
        return { isNewUser: false };
      }

      return { isNewUser: true, googleUser: res.googleUser };
    } finally {
      setIsLoading(false);
    }
  };

  const registerRole = async (formData: any) => {
    setIsLoading(true);
    try {
      const res = await apiRequest('/api/auth/register-role', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (res && res.token) {
        localStorage.setItem('aharlocal_token', res.token);
        setToken(res.token);
        setUser(res.user);
        setRole(res.user.role);
        setRoleDetails(res.roleDetails);
        closeAuthModal();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const adminLogin = async (usernameOrEmail: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await apiRequest('/api/auth/admin-login', {
        method: 'POST',
        body: JSON.stringify({ usernameOrEmail, password: pass })
      });
      if (res && res.token) {
        localStorage.setItem('aharlocal_token', res.token);
        setToken(res.token);
        setUser(res.user);
        setRole('admin');
        closeAuthModal();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('aharlocal_token');
    setToken(null);
    setUser(null);
    setRole('customer');
    setRoleDetails(null);
    openAuthModal('customer');
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        isLoading,
        roleDetails,
        isAuthModalOpen,
        authModalRole,
        openAuthModal,
        closeAuthModal,
        switchPersona,
        login,
        googleAuth,
        registerRole,
        adminLogin,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
