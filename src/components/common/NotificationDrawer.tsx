import React from 'react';
import { X, Bell, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { AppNotification } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { playOrderAlertChime } from './AudioAlerts';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAsRead: (id: number) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead
}) => {
  const { language } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">
                {language === 'bn' ? 'বিজ্ঞপ্তি ও নোটিফিকেশন' : 'Notifications'}
              </h3>
              <p className="text-xs text-stone-500">Live order status and dispatch updates</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => playOrderAlertChime()}
              className="text-[11px] font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-2 py-1 rounded-lg border border-orange-200"
              title="Test order sound"
            >
              🔔 Test Sound
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-16 text-stone-400">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="text-xs text-stone-400 mt-1">Updates regarding your orders will appear here</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => onMarkAsRead(n.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  n.is_read
                    ? 'bg-stone-50/60 border-stone-200 text-stone-700'
                    : 'bg-orange-50/80 border-orange-200 text-stone-900 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-stone-900">
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-orange-600" />}
                    <span>{language === 'bn' ? n.title_bn : n.title}</span>
                  </div>
                  <span className="text-[10px] text-stone-400 whitespace-nowrap">
                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  {language === 'bn' ? n.message_bn : n.message}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
