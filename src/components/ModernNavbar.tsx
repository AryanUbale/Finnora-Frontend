import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme, ThemeToggle } from '../context/ThemeContext';
import api from '../lib/api';
import { 
  LogOut, LayoutDashboard, List, PiggyBank, RefreshCw, 
  Receipt, Bell, Menu, X, Check, BellRing, Sparkles, Wallet 
} from 'lucide-react';

interface ModernNavbarProps {
  activeTab?: 'dashboard' | 'transactions' | 'budgets' | 'recurring' | 'receipts' | 'accounts' | 'billing' | 'ai-assistant';
}

export function ModernNavbar({ activeTab }: ModernNavbarProps) {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDarkMode = theme === 'dark';

  const [notifications, setNotifications] = useState<{ id: string; title: string; message: string; isRead: boolean; type: string }[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, href: '/dashboard' },
    { id: 'transactions', label: 'Transactions', icon: <List size={18} />, href: '/transactions' },
    { id: 'budgets', label: 'Budgets', icon: <PiggyBank size={18} />, href: '/budgets' },
    { id: 'recurring', label: 'Recurring', icon: <RefreshCw size={18} />, href: '/recurring' },
    { id: 'receipts', label: 'Receipts', icon: <Receipt size={18} />, href: '/receipts' },
  ];

  // Fetch notifications periodically
  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications');
        if (res?.data?.data) {
          setNotifications(res.data.data.notifications || []);
          setUnreadCount(res.data.data.unreadCount || 0);
        }
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [user]);

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(n => n.map(x => ({ ...x, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const getNotificationIcon = () => {
    return <BellRing size={16} className="text-indigo-400" />;
  };

  return (
    <nav className={`sticky top-0 z-50 backdrop-blur-2xl border-b transition-all duration-300 ${
      isDarkMode
        ? 'border-slate-800/40 bg-[#090d23]/70'
        : 'border-slate-200/50 bg-white/70 shadow-sm shadow-slate-100/50'
    }`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div
          className="flex items-baseline gap-2 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => navigate('/dashboard')}
        >
          <span className="text-2xl font-black gradient-text">Finnora</span>
          {user?.subscriptionTier === 'PREMIUM' && (
            <span 
              onClick={(e) => {
                e.stopPropagation();
                navigate('/billing');
              }}
              className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-md cursor-pointer hover:scale-105 active:scale-95 transition-transform ${
                isDarkMode
                  ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
              }`}
            >Pro</span>
          )}
        </div>

        {/* Desktop Navigation */}
        <div className={`hidden md:flex items-center gap-1.5 p-1 rounded-2xl border ${
          isDarkMode
            ? 'bg-slate-900/40 border-slate-800/30'
            : 'bg-slate-100 border-slate-200/40'
        }`}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                navigate(item.href);
                setMobileMenuOpen(false);
              }}
              className={`px-4.5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === item.id
                  ? isDarkMode
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 glow-primary'
                    : 'bg-white text-indigo-600 shadow-sm border border-slate-200/30'
                  : isDarkMode
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2.5">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifs(!showNotifs);
                setMobileMenuOpen(false);
              }}
              className={`p-3 rounded-xl border transition-all relative cursor-pointer ${
                isDarkMode
                  ? 'border-slate-800/40 bg-slate-900/20 hover:bg-slate-800/40 text-slate-400 hover:text-white'
                  : 'border-slate-200/50 bg-slate-50 hover:bg-slate-100/50 text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-red-500/20 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifs && (
              <div className={`absolute right-0 mt-3.5 w-96 rounded-2xl shadow-2xl overflow-hidden animate-slide-down border z-50 ${
                isDarkMode
                  ? 'bg-[#0f172a] border-slate-800/80 shadow-slate-950/80'
                  : 'bg-white border-slate-200/80 shadow-indigo-100/80'
              }`}>
                <div className={`flex items-center justify-between px-5 py-4 border-b ${
                  isDarkMode
                    ? 'border-slate-800/60 bg-slate-900/30'
                    : 'border-slate-100 bg-slate-50/50'
                }`}>
                  <span className="font-bold text-sm">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-indigo-500 hover:text-indigo-600 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Check size={14} /> Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="text-center py-10">
                      <Bell size={28} className="mx-auto mb-2 text-slate-400 opacity-60" />
                      <p className="text-xs text-slate-400">All caught up!</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`px-5 py-3.5 border-b transition-colors ${
                          !n.isRead
                            ? isDarkMode
                              ? 'bg-indigo-500/5 border-slate-800/30'
                              : 'bg-indigo-50/30 border-slate-100'
                            : isDarkMode
                              ? 'border-slate-800/30 hover:bg-slate-900/20'
                              : 'border-slate-100 hover:bg-slate-50/40'
                        }`}
                      >
                        <div className="flex gap-2.5 items-start">
                          <div className="mt-0.5">{getNotificationIcon()}</div>
                          <div>
                            <p className="text-xs font-bold leading-normal">{n.title}</p>
                            <p className={`text-[11px] mt-0.5 leading-normal ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              {n.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bank Accounts / Wallet */}
          <button
            onClick={() => navigate('/accounts')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              isDarkMode
                ? 'border-slate-800/40 bg-slate-900/20 hover:bg-slate-800/40 text-slate-400 hover:text-white'
                : 'border-slate-200/50 bg-slate-50 hover:bg-slate-100/50 text-slate-600 hover:text-slate-900'
            }`}
            title="Manage Accounts"
          >
            <Wallet size={18} />
          </button>

          {/* AI Advisor Chat */}
          <button
            onClick={() => navigate('/ai-assistant')}
            className={`p-3 rounded-xl border transition-all cursor-pointer relative group ${
              isDarkMode
                ? 'border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400 hover:text-indigo-300'
                : 'border-indigo-100 bg-indigo-50/55 hover:bg-indigo-100/50 text-indigo-600 hover:text-indigo-700'
            }`}
            title="Finnora AI Advisor"
          >
            <Sparkles size={18} className="animate-pulse" />
          </button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Profile / Logout */}
          <div className={`hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl border transition-all ${
            isDarkMode
              ? 'bg-slate-900/20 border-slate-800/30 hover:bg-slate-800/30'
              : 'bg-slate-50 border-slate-200/50 hover:bg-slate-100/50'
          }`}>
            <div className="text-right">
              <p className="text-xs font-bold leading-tight">{user?.name}</p>
              <p className={`text-[10px] leading-tight mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {user?.email}
              </p>
            </div>
            <button
              onClick={logout}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isDarkMode
                  ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'
                  : 'text-slate-500 hover:text-red-600 hover:bg-red-50'
              }`}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => {
              setMobileMenuOpen(!mobileMenuOpen);
              setShowNotifs(false);
            }}
            className={`p-3 rounded-xl border md:hidden cursor-pointer ${
              isDarkMode
                ? 'border-slate-800/40 bg-slate-900/20 text-slate-400'
                : 'border-slate-200/50 bg-slate-50 text-slate-600'
            }`}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className={`md:hidden px-6 pb-6 border-t animate-slide-down ${
          isDarkMode ? 'bg-[#090d23] border-slate-850' : 'bg-white border-slate-100'
        }`}>
          <div className="space-y-1.5 pt-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  navigate(item.href);
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-4.5 py-3.5 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === item.id
                    ? isDarkMode
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 glow-primary'
                      : 'bg-indigo-50 text-indigo-600'
                    : isDarkMode
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className={`mt-5 pt-4 border-t flex items-center justify-between sm:hidden ${
            isDarkMode ? 'border-slate-800/50' : 'border-slate-150'
          }`}>
            <div>
              <p className="text-xs font-bold leading-tight">{user?.name}</p>
              <p className={`text-[10px] leading-tight mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-450'}`}>
                {user?.email}
              </p>
            </div>
            <button
              onClick={logout}
              className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-semibold cursor-pointer ${
                isDarkMode
                  ? 'border-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-500/10'
                  : 'border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50'
              }`}
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
