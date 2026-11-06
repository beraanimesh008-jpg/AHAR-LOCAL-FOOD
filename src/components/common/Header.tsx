import React, { useState } from 'react';
import { ShoppingBag, Bell, Globe, UserCheck, ShieldAlert, Store, Bike, User, Menu, X, LogIn, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { UserRole } from '../../types';
import { AuthModal } from '../auth/AuthModal';
import { CustomerProfileModal } from '../customer/CustomerProfileModal';

interface HeaderProps {
  onOpenCart?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCart,
  onOpenNotifications,
  unreadNotificationsCount = 0
}) => {
  const { user, role, switchPersona, logout, isAuthModalOpen, authModalRole, openAuthModal, closeAuthModal } = useAuth();
  const { totalQuantity, grandTotal } = useCart();
  const { language, setLanguage, t } = useLanguage();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const personas: { role: UserRole; label: string; labelBn: string; icon: React.ReactNode; color: string }[] = [
    { role: 'customer', label: 'Buyer (Customer App)', labelBn: 'গ্রাহক / ক্রেতা', icon: <User className="w-4 h-4" />, color: 'bg-blue-600' },
    { role: 'restaurant', label: 'Seller (Restaurant Panel)', labelBn: 'রেস্তোরাঁ / বিক্রেতা', icon: <Store className="w-4 h-4" />, color: 'bg-orange-600' },
    { role: 'delivery', label: 'Delivery Partner (Rider)', labelBn: 'ডেলিভারি রাইডার', icon: <Bike className="w-4 h-4" />, color: 'bg-emerald-600' },
    { role: 'admin', label: 'Admin (Command Center)', labelBn: 'অ্যাডমিন পোর্টাল', icon: <ShieldAlert className="w-4 h-4" />, color: 'bg-purple-600' }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 font-black text-xl">
              আ
            </div>
            <div>
              <div className="font-extrabold text-lg sm:text-xl tracking-tight text-stone-950 flex items-center gap-1.5 leading-none">
                <span>AharLocal</span>
                <span className="text-xs px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 font-bold hidden sm:inline">
                  {language === 'bn' ? 'আহার লোকাল' : 'Local Food'}
                </span>
              </div>
              <p className="text-[11px] text-stone-600 font-medium hidden sm:block">
                {language === 'bn' ? 'ঘরের কাছের তাজা খাবার' : 'Fast Local Delivery'}
              </p>
            </div>
          </div>
        </div>

        {/* Persona Switcher + Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Main Google Login / Register Button */}
          <button
            onClick={() => openAuthModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold text-xs shadow-md shadow-orange-500/20 transition-all cursor-pointer transform active:scale-95"
            title="Open Login & Registration Portal"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Login / Register</span>
            <span className="sm:hidden">Login</span>
          </button>

          {/* Persona Switcher Pill */}
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-stone-200 bg-stone-50 hover:bg-stone-100 transition-all text-xs font-bold text-stone-800 shadow-2xs cursor-pointer"
              title="Switch role preview or account"
            >
              <UserCheck className="w-3.5 h-3.5 text-orange-600" />
              <span className="capitalize hidden md:inline">Role:</span>
              <span className="text-orange-700 uppercase font-black">{role}</span>
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-stone-200 py-2 z-50 animate-in fade-in">
                {/* Logged in User Profile Info */}
                {user && (
                  <div className="px-4 py-3 border-b border-stone-100 bg-stone-50/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <img
                        src={user.passport_photo || user.profile_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                        alt={user.name}
                        className="w-9 h-9 rounded-full object-cover border border-stone-300 shrink-0"
                      />
                      <div className="truncate">
                        <div className="text-xs font-extrabold text-stone-900 truncate">
                          {user.name}
                        </div>
                        <div className="text-[10px] text-stone-500 truncate">{user.email}</div>
                      </div>
                    </div>

                    {role === 'customer' && (
                      <button
                        onClick={() => {
                          setIsProfileOpen(true);
                          setRoleMenuOpen(false);
                        }}
                        className="text-[10px] font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded-lg shrink-0 cursor-pointer"
                      >
                        Profile
                      </button>
                    )}
                  </div>
                )}

                <div className="px-4 py-2 border-b border-stone-100">
                  <div className="text-xs font-bold text-stone-700">Switch System Interface</div>
                  <div className="text-[11px] text-stone-500">Explore Buyer, Seller, Rider & Admin</div>
                </div>

                <div className="p-1 space-y-1">
                  {personas.map((p) => (
                    <button
                      key={p.role}
                      onClick={() => {
                        switchPersona(p.role);
                        setRoleMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                        role === p.role ? 'bg-orange-50 text-orange-800 font-extrabold' : 'hover:bg-stone-50 text-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`p-1.5 rounded-lg text-white ${p.color}`}>{p.icon}</span>
                        <div>
                          <div>{p.label}</div>
                          <div className="text-[10px] text-stone-500 font-normal">{p.labelBn}</div>
                        </div>
                      </div>
                      {role === p.role && <span className="w-2 h-2 rounded-full bg-orange-600" />}
                    </button>
                  ))}
                </div>

                <div className="p-1.5 border-t border-stone-100 space-y-1 mt-1">
                  <button
                    onClick={() => {
                      setRoleMenuOpen(false);
                      openAuthModal();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-orange-700 hover:bg-orange-50 flex items-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Google Login / Register Portal</span>
                  </button>

                  <button
                    onClick={() => {
                      setRoleMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out Account (লগআউট)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Language Toggle (বাংলা / English) */}
          <button
            onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-stone-200 hover:border-orange-300 text-xs font-bold text-stone-700 transition-all cursor-pointer"
            title="Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-orange-600" />
            <span>{language === 'bn' ? 'বাংলা' : 'EN'}</span>
          </button>

          {/* Notifications Button */}
          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-full hover:bg-stone-100 text-stone-600 transition-all cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-orange-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          )}

          {/* Customer Cart Button (shown for customer view) */}
          {role === 'customer' && onOpenCart && (
            <button
              onClick={onOpenCart}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white px-3.5 py-2 rounded-full shadow-md text-xs font-bold transition-all transform active:scale-95 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{totalQuantity}</span>
              {grandTotal > 0 && (
                <span className="hidden sm:inline font-mono border-l border-white/20 pl-2">
                  ₹{grandTotal}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Auth Portal Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        initialRole={authModalRole}
      />

      {/* Customer Private Profile Modal */}
      <CustomerProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </header>
  );
};
