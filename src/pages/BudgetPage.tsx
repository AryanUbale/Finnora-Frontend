import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { ModernNavbar } from '../components/ModernNavbar';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '../lib/formatters';
import {
  Plus, Copy, Trash2, Edit2, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight,
  PiggyBank, X
} from 'lucide-react';

interface BudgetStatus {
  id: string;
  category: { id: string; name: string; icon: string; color: string };
  month: number;
  year: number;
  limitAmount: number;
  alertThreshold: number;
  spent: number;
  percentUsed: number;
  status: 'good' | 'caution' | 'warning' | 'exceeded';
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function BudgetPage() {
  const { theme } = useTheme();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editBudget, setEditBudget] = useState<BudgetStatus | null>(null);
  const [formData, setFormData] = useState({ categoryId: '', limitAmount: '', alertThreshold: '80' });
  const [saving, setSaving] = useState(false);

  const isDarkMode = theme === 'dark';
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      if (isCurrentMonth) {
        const res = await api.get('/api/budgets/status');
        setBudgets(res.data.data);
      } else {
        const res = await api.get(`/api/budgets?month=${month}&year=${year}`);
        setBudgets(res.data.data.map((b: {
          id: string;
          limitAmount: string | number;
          alertThreshold: number;
          category: { id: string; name: string; icon: string; color: string };
          month: number;
          year: number;
        }) => ({
          ...b,
          spent: 0,
          percentUsed: 0,
          status: 'good' as const,
          limitAmount: Number(b.limitAmount)
        })));
      }
    } catch {
      setBudgets([]);
    }
    setLoading(false);
  }, [month, year, isCurrentMonth, setLoading, setBudgets]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchBudgets();
    }, 0);
    return () => clearTimeout(t);
  }, [fetchBudgets]);

  useEffect(() => {
    api.get('/api/categories')
      .then(res => setCategories(res.data.data.filter((c: Category) => c.type === 'EXPENSE')))
      .catch(() => {});
  }, []);

  const goMonth = (dir: number) => {
    let m = month + dir,
      y = year;
    if (m > 12) {
      m = 1;
      y++;
    } else if (m < 1) {
      m = 12;
      y--;
    }
    setMonth(m);
    setYear(y);
  };

  const openCreateForm = () => {
    setEditBudget(null);
    setFormData({ categoryId: '', limitAmount: '', alertThreshold: '80' });
    setShowForm(true);
  };

  const openEditForm = (b: BudgetStatus) => {
    setEditBudget(b);
    setFormData({
      categoryId: b.category.id,
      limitAmount: String(b.limitAmount),
      alertThreshold: String(b.alertThreshold)
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editBudget) {
        await api.put(`/api/budgets/${editBudget.id}`, {
          limitAmount: parseFloat(formData.limitAmount),
          alertThreshold: parseInt(formData.alertThreshold)
        });
        toast.success('Budget updated successfully!');
      } else {
        await api.post('/api/budgets', {
          categoryId: formData.categoryId,
          limitAmount: parseFloat(formData.limitAmount),
          month,
          year,
          alertThreshold: parseInt(formData.alertThreshold)
        });
        toast.success('Budget created successfully!');
      }
      setShowForm(false);
      fetchBudgets();
    } catch {
      toast.error('Failed to save budget.');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm('Delete this budget?');
    if (!confirmDelete) return;
    try {
      await api.delete(`/api/budgets/${id}`);
      toast.success('Budget deleted.');
      fetchBudgets();
    } catch {
      toast.error('Could not remove budget.');
    }
  };

  const handleCopy = async () => {
    try {
      await api.post('/api/budgets/copy-from-last-month');
      toast.success('Copied budgets from previous month!');
      fetchBudgets();
    } catch {
      toast.error('No budgets found to copy from last month.');
    }
  };

  const getStatusColor = (s: string) => {
    if (s === 'exceeded') return 'bg-red-500';
    if (s === 'warning') return 'bg-amber-500';
    if (s === 'caution') return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const getStatusBg = (s: string) => {
    if (s === 'exceeded') return isDarkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200/50';
    if (s === 'warning') return isDarkMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200/50';
    return isDarkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200';
  };

  const budgetStats = [
    {
      label: 'Total Budgets',
      value: budgets.length,
      icon: '📊',
      color: 'text-indigo-400'
    },
    {
      label: 'Over Budget',
      value: budgets.filter(b => b.status === 'exceeded').length,
      icon: '⚠️',
      color: 'text-red-400'
    },
    {
      label: 'Near Limit',
      value: budgets.filter(b => b.status === 'warning').length,
      icon: '🟡',
      color: 'text-amber-400'
    },
    {
      label: 'On Track',
      value: budgets.filter(b => b.status === 'good').length,
      icon: '✅',
      color: 'text-emerald-400'
    }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
        : 'bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50'
    }`}>
      <ModernNavbar activeTab="budgets" />

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12 animate-slide-down">
          <h1 className={`text-4xl md:text-5xl font-bold tracking-tight mb-3 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            Budget Management
          </h1>
          <p className={`text-lg ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Set spending limits and track progress for {MONTHS[month - 1]} {year}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12 stagger-children">
          {budgetStats.map((stat, i) => (
            <div
              key={stat.label}
              className={`glass-card ${isDarkMode ? '' : 'bg-white/70 border-slate-200'} p-6`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {stat.label}
                  </p>
                  <p className={`text-3xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {stat.value}
                  </p>
                </div>
                <span className="text-4xl">{stat.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className={`flex items-center gap-2 p-1 rounded-xl ${
            isDarkMode ? 'bg-slate-800/30' : 'bg-slate-200/50'
          }`}>
            <button
              onClick={() => goMonth(-1)}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'hover:bg-slate-700/50 text-slate-400 hover:text-white'
                  : 'hover:bg-white/50 text-slate-600 hover:text-slate-900'
              }`}
            >
              <ChevronLeft size={20} />
            </button>
            <span className={`text-lg font-semibold min-w-[180px] text-center ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              {MONTHS[month - 1]} {year}
            </span>
            <button
              onClick={() => goMonth(1)}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'hover:bg-slate-700/50 text-slate-400 hover:text-white'
                  : 'hover:bg-white/50 text-slate-600 hover:text-slate-900'
              }`}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className={`group flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${
                isDarkMode
                  ? 'border border-slate-700 text-slate-300 hover:bg-slate-800/50'
                  : 'border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Copy size={18} className="group-hover:-rotate-12 transition-transform" />
              <span className="hidden sm:inline">Copy Last Month</span>
            </button>
            <button
              onClick={openCreateForm}
              className="group flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95"
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform" />
              <span className="hidden sm:inline">New Budget</span>
            </button>
          </div>
        </div>

        {/* Budget Cards Grid */}
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className={`glass-card ${isDarkMode ? '' : 'bg-white/70'} h-48 animate-pulse`}
              />
            ))}
          </div>
        ) : budgets.length === 0 ? (
          <div className={`glass-card ${isDarkMode ? '' : 'bg-white/70 border-slate-200'} rounded-2xl p-16 text-center`}>
            <PiggyBank size={64} className={`mx-auto mb-4 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />
            <h3 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              No budgets yet
            </h3>
            <p className={`text-base mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Create your first budget to start tracking spending
            </p>
            <button
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-medium rounded-xl hover:shadow-lg transition-all"
            >
              <Plus size={20} />
              Create Budget
            </button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 stagger-children">
            {budgets.map((b, i) => (
              <div
                key={b.id}
                className={`glass-card ${getStatusBg(b.status)} p-6 transition-all hover:shadow-lg`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{b.category.icon}</span>
                    <div>
                      <h3 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {b.category.name}
                      </h3>
                      <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-600'}`}>
                        Alert at {b.alertThreshold}%
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditForm(b)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDarkMode
                          ? 'hover:bg-slate-700/50 text-slate-400 hover:text-white'
                          : 'hover:bg-white/50 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDarkMode
                          ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400'
                          : 'hover:bg-red-100 text-slate-600 hover:text-red-600'
                      }`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Amount Display */}
                <div className="mb-4">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {formatCurrency(b.spent)}
                    </span>
                    <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      of {formatCurrency(b.limitAmount)}
                    </span>
                  </div>
                  <div className={`w-full h-2.5 rounded-full overflow-hidden ${
                    isDarkMode ? 'bg-slate-800' : 'bg-slate-200'
                  }`}>
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${getStatusColor(b.status)} ${
                        b.status === 'exceeded' 
                          ? 'shadow-[0_0_12px_rgba(239,68,68,0.7)]' 
                          : b.status === 'warning' 
                            ? 'shadow-[0_0_12px_rgba(245,158,11,0.7)]' 
                            : 'shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                      }`}
                      style={{ width: `${Math.min(b.percentUsed, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {b.percentUsed.toFixed(1)}% used
                  </span>
                  {b.status === 'exceeded' ? (
                    <span className="text-sm text-red-400 flex items-center gap-1 font-medium">
                      <AlertTriangle size={14} />
                      Over limit
                    </span>
                  ) : b.status === 'warning' ? (
                    <span className="text-sm text-amber-400 flex items-center gap-1 font-medium">
                      <AlertTriangle size={14} />
                      Near limit
                    </span>
                  ) : (
                    <span className="text-sm text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle size={14} />
                      On track
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      {showForm && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xl transition-colors ${
            isDarkMode ? 'bg-black/60' : 'bg-black/30'
          }`}
          onClick={() => setShowForm(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
            className={`glass-card ${isDarkMode ? '' : 'bg-white/90 border-slate-200'} w-full max-w-md p-8 animate-scale-in`}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {editBudget ? 'Edit Budget' : 'Create Budget'}
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'hover:bg-slate-700/50 text-slate-400 hover:text-white'
                    : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                <X size={20} />
              </button>
            </div>

            {!editBudget && (
              <div className="mb-6">
                <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                  Category
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData((f) => ({ ...f, categoryId: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                  } focus:outline-none`}
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-6">
              <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                Monthly Limit (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={formData.limitAmount}
                onChange={(e) => setFormData((f) => ({ ...f, limitAmount: e.target.value }))}
                className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                } focus:outline-none`}
                placeholder="5000"
                required
              />
            </div>

            <div className="mb-8">
              <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                Alert Threshold (%)
              </label>
              <select
                value={formData.alertThreshold}
                onChange={(e) => setFormData((f) => ({ ...f, alertThreshold: e.target.value }))}
                className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                } focus:outline-none`}
              >
                {[50, 60, 70, 75, 80, 90, 100].map((v) => (
                  <option key={v} value={v}>
                    {v}%{v === 80 ? ' (default)' : v === 100 ? ' (only when exceeded)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                  isDarkMode
                    ? 'border border-slate-700 text-slate-300 hover:bg-slate-800'
                    : 'border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-medium hover:shadow-lg transition-all disabled:opacity-60"
              >
                {saving ? 'Saving...' : editBudget ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
