import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ModernNavbar } from '../components/ModernNavbar';
import api from '../lib/api';
import { formatCurrency } from '../lib/formatters';
import toast from 'react-hot-toast';
import { Plus, Trash2, Wallet, CreditCard, Landmark, Check, X } from 'lucide-react';

interface Account {
  id: string;
  name: string;
  type: string;
  balance: string;
  color: string;
  createdAt: string;
}

export function AccountsPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'BANK', balance: '0', color: '#6366f1' });
  const [saving, setSaving] = useState(false);

  const isDarkMode = theme === 'dark';
  const isPremium = user?.subscriptionTier === 'PREMIUM';

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data.data);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAccounts();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/accounts', {
        name: formData.name,
        type: formData.type,
        balance: parseFloat(formData.balance),
        color: formData.color,
      });
      setShowForm(false);
      setFormData({ name: '', type: 'BANK', balance: '0', color: '#6366f1' });
      toast.success('Account registered!');
      fetchAccounts();
    } catch {
      toast.error('Could not create account.');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const confirm = window.confirm('Delete this account? Associated transactions will remain unassigned.');
    if (!confirm) return;

    try {
      await api.delete(`/accounts/${id}`);
      toast.success('Account removed.');
      fetchAccounts();
    } catch {
      toast.error('Failed to delete account.');
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'CREDIT':
        return <CreditCard size={20} />;
      case 'CASH':
        return <Wallet size={20} />;
      default:
        return <Landmark size={20} />;
    }
  };

  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6'];

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#060814] text-slate-100' : 'bg-slate-50/50 text-slate-800'} transition-colors duration-300`}>
      <ModernNavbar />

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Title Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              Banking & <span className="gradient-text">Accounts</span>
            </h1>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
              Manage multiple checking, credit card, and digital wallets in one workspace.
            </p>
          </div>

          <button
            onClick={() => {
              if (!isPremium) {
                toast.error('Multi-Account switcher requires Finnora Pro Premium plan.');
                return;
              }
              setShowForm(true);
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md shadow-indigo-600/10"
          >
            <Plus size={14} /> Add Account
          </button>
        </div>

        {/* Feature Gating Alert */}
        {!isPremium && (
          <div className="mb-8 p-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.03] flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">🔒</span>
              <div>
                <h4 className="text-sm font-bold text-indigo-400">Unlock Workspace Account Switching</h4>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mt-0.5`}>
                  You are currently on the Free tier. Free tier is locked to one default cash account.
                </p>
              </div>
            </div>
            <a
              href="/billing"
              className="px-4 py-2 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-[0.97]"
            >
              Upgrade Plan
            </a>
          </div>
        )}

        {/* List of Accounts */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((x) => (
              <div key={x} className={`h-40 rounded-3xl border animate-pulse ${isDarkMode ? 'bg-slate-900/30 border-slate-800/40' : 'bg-slate-100 border-slate-200'}`} />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className={`p-16 rounded-3xl border text-center ${isDarkMode ? 'border-slate-800/40 bg-slate-900/10' : 'border-slate-200 bg-white'}`}>
            <Wallet size={48} className="mx-auto text-indigo-400 mb-4 animate-bounce" />
            <h3 className="text-lg font-bold mb-1">No Accounts Registered</h3>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} max-w-sm mx-auto mb-6`}>
              Add checking or credit card accounts to partition and filter your transactions list.
            </p>
            {isPremium && (
              <button
                onClick={() => setShowForm(true)}
                className="px-4.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-all"
              >
                Add Account Now
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                style={{ borderLeftColor: acc.color }}
                className={`relative p-6 rounded-3xl border-l-[6px] border transition-all duration-300 ${
                  isDarkMode
                    ? 'border-slate-800/40 bg-slate-900/25 shadow-sm hover:border-slate-700/60'
                    : 'border-slate-200 bg-white shadow-sm hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    style={{ color: acc.color, backgroundColor: `${acc.color}15` }}
                    className="p-3 rounded-2xl"
                  >
                    {getAccountIcon(acc.type)}
                  </div>
                  <button
                    onClick={() => handleDelete(acc.id)}
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${
                      isDarkMode ? 'text-slate-500 hover:text-red-400 hover:bg-slate-800/40' : 'text-slate-400 hover:text-red-500 hover:bg-slate-100'
                    }`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <h3 className="font-bold text-base mb-1 truncate">{acc.name}</h3>
                <p className={`text-[10px] uppercase font-bold tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-4`}>
                  {acc.type}
                </p>

                <div className="text-2xl font-black">{formatCurrency(Number(acc.balance))}</div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Form */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
            <div
              className={`w-full max-w-md p-8 rounded-3xl border shadow-2xl scale-in ${
                isDarkMode ? 'bg-[#090d23] border-slate-800/80 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Register Account</h3>
                <button
                  onClick={() => setShowForm(false)}
                  className={`p-1.5 rounded-xl cursor-pointer ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2">Account Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chase Checkings"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <option value="BANK">Checking/Bank</option>
                      <option value="CREDIT">Credit Card</option>
                      <option value="CASH">Cash Wallet</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2">Balance ($)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="0.00"
                      value={formData.balance}
                      onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2">Theme Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {colors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: c })}
                        style={{ backgroundColor: c }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-transform ${
                          formData.color === c ? 'scale-110 border-2 border-white' : 'opacity-80 hover:opacity-100'
                        }`}
                      >
                        {formData.color === c && <Check size={14} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-slate-800/10">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className={`flex-1 py-3 rounded-xl font-bold text-xs cursor-pointer ${
                      isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                  >
                    {saving ? 'Creating...' : 'Save Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
