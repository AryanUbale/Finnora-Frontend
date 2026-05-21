import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { ModernNavbar } from '../components/ModernNavbar';
import api from '../lib/api';
import { formatCurrency } from '../lib/formatters';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, Edit2, Play, Pause, Check,
  X, RefreshCw
} from 'lucide-react';


interface RecurringPayment {
  id: string; name: string; amount: string; type: string;
  frequency: string; dueDay: number; isActive: boolean;
  nextDueDate: string; reminderDaysBefore: number;
  category: { id: string; name: string; icon: string; color: string };
}

interface Category { id: string; name: string; icon: string; type: string }

export function RecurringPage() {
  const { theme } = useTheme();
  const [payments, setPayments] = useState<RecurringPayment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editPayment, setEditPayment] = useState<RecurringPayment | null>(null);
  const [formData, setFormData] = useState({ name: '', amount: '', type: 'EXPENSE', categoryId: '', frequency: 'MONTHLY', dueDay: '1', reminderDaysBefore: '3' });
  const [saving, setSaving] = useState(false);

  const isDarkMode = theme === 'dark';

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/recurring${filter ? `?status=${filter}` : ''}`);
      setPayments(res.data.data);
    } catch { 
      setPayments([]); 
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { 
    const timer = setTimeout(() => {
      fetchPayments(); 
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchPayments]);

  useEffect(() => { 
    api.get('/api/categories')
      .then(res => setCategories(res.data.data))
      .catch(() => {}); 
  }, []);

  const getDaysUntil = (dateStr: string) => {
    const due = new Date(dateStr); 
    const today = new Date();
    today.setHours(0,0,0,0); 
    due.setHours(0,0,0,0);
    return Math.ceil((due.getTime() - today.getTime()) / (1000*60*60*24));
  };

  const isOverdue = (p: RecurringPayment) => p.isActive && getDaysUntil(p.nextDueDate) < 0;

  const openCreate = () => { 
    setEditPayment(null); 
    setFormData({ name: '', amount: '', type: 'EXPENSE', categoryId: '', frequency: 'MONTHLY', dueDay: '1', reminderDaysBefore: '3' }); 
    setShowForm(true); 
  };
  
  const openEdit = (p: RecurringPayment) => { 
    setEditPayment(p); 
    setFormData({ 
      name: p.name, 
      amount: String(p.amount), 
      type: p.type, 
      categoryId: p.category.id, 
      frequency: p.frequency, 
      dueDay: String(p.dueDay), 
      reminderDaysBefore: String(p.reminderDaysBefore) 
    }); 
    setShowForm(true); 
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setSaving(true);
    const payload = { 
      name: formData.name, 
      amount: parseFloat(formData.amount), 
      type: formData.type as 'INCOME'|'EXPENSE', 
      categoryId: formData.categoryId, 
      frequency: formData.frequency as 'MONTHLY'|'WEEKLY'|'YEARLY', 
      dueDay: parseInt(formData.dueDay), 
      reminderDaysBefore: parseInt(formData.reminderDaysBefore) 
    };
    try {
      if (editPayment) { 
        await api.put(`/api/recurring/${editPayment.id}`, payload); 
        toast.success('Subscription updated successfully.');
      } else { 
        await api.post('/api/recurring', payload); 
        toast.success('Recurring payment added.');
      }
      setShowForm(false); 
      fetchPayments();
    } catch { 
      toast.error('Failed to save recurring item.');
    }
    setSaving(false);
  };

  const handleMarkPaid = async (id: string) => { 
    try {
      await api.patch(`/api/recurring/${id}/mark-paid`); 
      toast.success('Marked as paid!');
      fetchPayments(); 
    } catch {
      toast.error('Failed to log payment.');
    }
  };

  const handleToggle = async (id: string, active: boolean) => { 
    try {
      await api.patch(`/api/recurring/${id}/toggle`); 
      toast.success(active ? 'Subscription resumed.' : 'Subscription paused.');
      fetchPayments(); 
    } catch {
      toast.error('Could not toggle status.');
    }
  };

  const handleDelete = async (id: string) => { 
    const confirmDelete = window.confirm('Delete this recurring payment?');
    if (!confirmDelete) return; 
    try {
      await api.delete(`/api/recurring/${id}`); 
      toast.success('Recurring item deleted.');
      fetchPayments(); 
    } catch {
      toast.error('Failed to delete payment.');
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode
        ? 'bg-[#040716] text-white'
        : 'bg-[#fafbfe] text-slate-900'
    }`}>
      <ModernNavbar activeTab="recurring" />

      <main className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className={`text-3xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Recurring Payments
            </h1>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-550'}`}>
              Manage active subscriptions, utility bills, and repeat transfers
            </p>
          </div>
          <button 
            onClick={openCreate} 
            className="btn-primary flex items-center gap-2 cursor-pointer shadow-lg"
          >
            <Plus size={16}/>
            <span>Add Payment</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2.5 mb-8 overflow-x-auto pb-1">
          {[
            { v: '', l: 'All Payments' },
            { v: 'active', l: 'Active' },
            { v: 'overdue', l: 'Overdue' },
            { v: 'paused', l: 'Paused' }
          ].map(f => (
            <button 
              key={f.v} 
              onClick={() => setFilter(f.v)} 
              className={`px-4.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filter === f.v 
                  ? 'bg-indigo-650 text-white shadow-md shadow-indigo-500/20' 
                  : isDarkMode
                    ? 'bg-slate-900/40 text-slate-400 hover:text-white border border-slate-800/60' 
                    : 'bg-slate-100 text-slate-655 hover:text-slate-900 border border-slate-200/50'
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3.5">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-2xl bg-slate-900/40 animate-pulse border border-slate-800/20 shimmer" />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-800/30 rounded-3xl bg-slate-900/5">
            <RefreshCw size={48} className="mx-auto text-slate-500 mb-4 opacity-50"/>
            <p className={`text-base font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-655'}`}>No recurring payments</p>
            <p className="text-xs text-slate-500 mt-1">Map your monthly bills or media streaming accounts to keep tabs.</p>
            <button 
              onClick={openCreate} 
              className="mt-4 text-xs font-semibold text-indigo-500 hover:text-indigo-600 cursor-pointer"
            >
              Add a recurring bill
            </button>
          </div>
        ) : (
          <div className="space-y-3.5 stagger-children">
            {payments.map((p, i) => {
              const days = getDaysUntil(p.nextDueDate);
              const overdue = isOverdue(p);
              return (
                <div 
                  key={p.id} 
                  className={`rounded-2xl border p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                    overdue 
                      ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/30' 
                      : !p.isActive 
                        ? isDarkMode
                          ? 'bg-slate-900/10 border-slate-850 opacity-55'
                          : 'bg-slate-50/70 border-slate-100 opacity-60'
                        : isDarkMode
                          ? 'bg-slate-900/20 border-slate-850 hover:bg-slate-900/30 hover:border-slate-800'
                          : 'bg-white border-slate-100 hover:bg-slate-50 shadow-sm shadow-slate-100'
                  }`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl filter drop-shadow">{p.category.icon}</span>
                    <div>
                      <h3 className={`font-bold text-sm flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {p.name}
                        {overdue && <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">Overdue</span>}
                        {!p.isActive && <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-600/10 text-slate-400 border border-slate-600/20">Paused</span>}
                      </h3>
                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-450'}`}>
                        {p.frequency.charAt(0) + p.frequency.slice(1).toLowerCase()} · Day {p.dueDay} · {p.category.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5">
                    <div className="text-left sm:text-right">
                      <p className={`font-black text-base ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                        {formatCurrency(Number(p.amount))}
                      </p>
                      <p className={`text-[11px] mt-0.5 font-medium ${
                        overdue 
                          ? 'text-red-450' 
                          : days <= 3 && p.isActive
                            ? 'text-amber-400' 
                            : isDarkMode
                              ? 'text-slate-500'
                              : 'text-slate-400'
                      }`}>
                        {overdue ? `${Math.abs(days)} days overdue` : days === 0 ? 'Due today' : `Due in ${days} day${days !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1 border-l pl-4 border-slate-700/30">
                      {p.isActive && (
                        <button 
                          onClick={() => handleMarkPaid(p.id)} 
                          className={`p-2 rounded-xl transition-all cursor-pointer ${
                            isDarkMode 
                              ? 'text-slate-500 hover:text-emerald-450 hover:bg-emerald-500/10' 
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`} 
                          title="Mark as paid"
                        >
                          <Check size={16}/>
                        </button>
                      )}
                      <button 
                        onClick={() => handleToggle(p.id, !p.isActive)} 
                        className={`p-2 rounded-xl transition-all cursor-pointer ${
                          isDarkMode 
                            ? 'text-slate-500 hover:text-slate-200 hover:bg-slate-800' 
                            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                        }`} 
                        title={p.isActive ? 'Pause subscription' : 'Resume subscription'}
                      >
                        {p.isActive ? <Pause size={16}/> : <Play size={16}/>}
                      </button>
                      <button 
                        onClick={() => openEdit(p)} 
                        className={`p-2 rounded-xl transition-all cursor-pointer ${
                          isDarkMode 
                            ? 'text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10' 
                            : 'text-slate-400 hover:text-indigo-650 hover:bg-indigo-50'
                        }`}
                      >
                        <Edit2 size={14}/>
                      </button>
                      <button 
                        onClick={() => handleDelete(p.id)} 
                        className={`p-2 rounded-xl transition-all cursor-pointer ${
                          isDarkMode 
                            ? 'text-slate-500 hover:text-red-400 hover:bg-red-500/10' 
                            : 'text-slate-400 hover:text-red-655 hover:bg-red-50'
                        }`}
                      >
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      {showForm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md px-4" 
          onClick={() => setShowForm(false)}
        >
          <form 
            onClick={e => e.stopPropagation()} 
            onSubmit={handleSubmit} 
            className={`w-full max-w-md p-6.5 rounded-3xl border shadow-2xl animate-scale-in ${
              isDarkMode
                ? 'bg-[#0f1225] border-slate-800'
                : 'bg-white border-slate-100'
            }`}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {editPayment ? 'Edit Payment' : 'Add Recurring Payment'}
              </h2>
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDarkMode ? 'text-slate-400 hover:bg-slate-900 hover:text-white' : 'text-slate-505 hover:bg-slate-100'
                }`}
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-450' : 'text-slate-500'}`}>
                Name
              </label>
              <input 
                value={formData.name} 
                onChange={e => setFormData(f=>({...f,name:e.target.value}))} 
                className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                  isDarkMode 
                    ? 'bg-slate-900/60 border-slate-850 text-white focus:border-indigo-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-650 focus:bg-white'
                }`} 
                placeholder="Netflix" 
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-450' : 'text-slate-500'}`}>
                  Amount (₹)
                </label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0.01" 
                  value={formData.amount} 
                  onChange={e => setFormData(f=>({...f,amount:e.target.value}))} 
                  className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                    isDarkMode 
                      ? 'bg-slate-900/60 border-slate-850 text-white focus:border-indigo-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-650 focus:bg-white'
                  }`} 
                  required
                />
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-450' : 'text-slate-500'}`}>
                  Type
                </label>
                <select 
                  value={formData.type} 
                  onChange={e => setFormData(f=>({...f,type:e.target.value, categoryId: ''}))} 
                  className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer ${
                    isDarkMode 
                      ? 'bg-slate-900/60 border-slate-850 text-white focus:border-indigo-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-650 focus:bg-white'
                  }`}
                >
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-450' : 'text-slate-500'}`}>
                Category
              </label>
              <select 
                value={formData.categoryId} 
                onChange={e => setFormData(f=>({...f,categoryId:e.target.value}))} 
                className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'bg-slate-900/60 border-slate-850 text-white focus:border-indigo-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-650 focus:bg-white'
                }`} 
                required
              >
                <option value="">Select category</option>
                {categories.filter(c => c.type === formData.type).map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-450' : 'text-slate-500'}`}>
                  Frequency
                </label>
                <select 
                  value={formData.frequency} 
                  onChange={e => setFormData(f=>({...f,frequency:e.target.value}))} 
                  className={`w-full px-3 py-3 rounded-xl border text-xs focus:outline-none transition-all cursor-pointer ${
                    isDarkMode 
                      ? 'bg-slate-900/60 border-slate-850 text-white focus:border-indigo-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-650 focus:bg-white'
                  }`}
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-450' : 'text-slate-500'}`}>
                  Due Day
                </label>
                <input 
                  type="number" 
                  min="1" 
                  max="31" 
                  value={formData.dueDay} 
                  onChange={e => setFormData(f=>({...f,dueDay:e.target.value}))} 
                  className={`w-full px-3 py-3 rounded-xl border text-xs focus:outline-none transition-all ${
                    isDarkMode 
                      ? 'bg-slate-900/60 border-slate-850 text-white focus:border-indigo-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-650 focus:bg-white'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-450' : 'text-slate-500'}`}>
                  Reminder
                </label>
                <select 
                  value={formData.reminderDaysBefore} 
                  onChange={e => setFormData(f=>({...f,reminderDaysBefore:e.target.value}))} 
                  className={`w-full px-3 py-3 rounded-xl border text-xs focus:outline-none transition-all cursor-pointer ${
                    isDarkMode 
                      ? 'bg-slate-900/60 border-slate-850 text-white focus:border-indigo-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-650 focus:bg-white'
                  }`}
                >
                  <option value="0">Off</option>
                  <option value="1">1 day</option>
                  <option value="3">3 days</option>
                  <option value="7">7 days</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                className={`flex-1 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'border-slate-800 text-slate-400 hover:bg-slate-900' 
                    : 'border-slate-200 text-slate-655 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={saving} 
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-500/10"
              >
                {saving ? 'Saving...' : editPayment ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
