import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { ModernNavbar } from '../components/ModernNavbar';
import api from '../lib/api';
import { formatCurrency, formatDate } from '../lib/formatters';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, Camera, Loader2, List
} from 'lucide-react';

interface Transaction {
  id: string; amount: string; type: 'INCOME' | 'EXPENSE';
  categoryId: string; date: string; note: string;
  category: { id: string; name: string; icon: string; color: string; type: string };
}

interface Category { id: string; name: string; icon: string; type: string }

export function TransactionsPage() {
  const { theme } = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ amount: '', type: 'EXPENSE', categoryId: '', date: new Date().toISOString().split('T')[0], note: '' });
  const [saving, setSaving] = useState(false);
 
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
 
  const isDarkMode = theme === 'dark';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txRes, catRes] = await Promise.all([
        api.get('/api/transactions?page=1&limit=50&sortBy=date&order=desc'),
        api.get('/api/categories')
      ]);
      setTransactions(txRes.data.data.transactions);
      setCategories(catRes.data.data);
    } catch {
      console.error('Failed to load transactions');
    }
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const exportToCsv = () => {
    if (transactions.length === 0) {
      toast.error('No transactions available to export.');
      return;
    }
    const headers = ['ID', 'Date', 'Type', 'Category', 'Amount (INR)', 'Note'];
    const rows = transactions.map(t => [
      t.id,
      t.date.split('T')[0],
      t.type,
      t.category.name,
      t.amount,
      t.note || ''
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `finnora_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Report downloaded successfully!');
  };

  const openCreate = () => { 
    setFormData({ amount: '', type: 'EXPENSE', categoryId: '', date: new Date().toISOString().split('T')[0], note: '' }); 
    setShowForm(true); 
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setSaving(true);
    try {
      await api.post('/api/transactions', {
        amount: parseFloat(formData.amount),
        type: formData.type,
        categoryId: formData.categoryId,
        date: new Date(formData.date).toISOString(),
        note: formData.note
      });
      setShowForm(false); 
      toast.success('Transaction logged successfully!');
      fetchData();
    } catch {
      toast.error('Could not save transaction.');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this transaction?');
    if (!confirmDelete) return;

    try {
      await api.delete(`/api/transactions/${id}`);
      toast.success('Transaction removed.');
      fetchData();
    } catch {
      toast.error('Failed to delete transaction.');
    }
  };

  const extractReceiptData = (text: string) => {
    const amountRegex = /(?:total|amount|grand\s*total|due|payable|rs\.?|inr|₹)\s*:?\s*([₹$]?\s*[\d,]+\.?\d{0,2})/gi;
    const amounts = [...text.matchAll(amountRegex)].map(m => parseFloat(m[1].replace(/[₹$,\s]/g, '')));
    const plainNumbers = [...text.matchAll(/\b(\d{1,3}(?:,\d{3})*(?:\.\d{2}))\b/g)].map(m => parseFloat(m[1].replace(/,/g, '')));
    const allAmounts = [...amounts, ...plainNumbers].filter(a => a > 0 && a < 1000000);
    const amount = allAmounts.length > 0 ? String(Math.max(...allAmounts)) : undefined;

    const datePatterns = [
      /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/,
      /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{2,4})/i,
    ];
    let date: string | undefined;
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) { date = match[0]; break; }
    }

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2 && !/^\d+$/.test(l));
    const merchant = lines.length > 0 ? lines[0].slice(0, 50) : undefined;

    return { amount, merchant, date };
  };

  const handleScanReceipt = async () => {
    if (!selectedFile) return;
    setScanning(true); 
    setOcrProgress(5);
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: (m: { status: string; progress: number }) => { 
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100)); 
          }
        },
      });
      const { data } = await worker.recognize(selectedFile);
      await worker.terminate();

      const extracted = extractReceiptData(data.text);
      
      setFormData(prev => ({
        ...prev,
        amount: extracted.amount || prev.amount,
        note: extracted.merchant || prev.note,
        date: extracted.date ? new Date(extracted.date).toISOString().split('T')[0] : prev.date
      }));
      
      toast.success('Receipt details extracted!');
      setShowScanModal(false);
      setSelectedFile(null);
    } catch { 
      toast.error('Could not parse receipt image.');
    }
    setScanning(false);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode
        ? 'bg-[#040716] text-white'
        : 'bg-[#fafbfe] text-slate-900'
    }`}>
      <ModernNavbar activeTab="transactions" />

      <main className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className={`text-3xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Transactions
            </h1>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              View and filter your income & expenditure logs
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {transactions.length > 0 && (
              <button
                onClick={exportToCsv}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer hover:scale-102 active:scale-98 ${
                  isDarkMode 
                    ? 'bg-slate-900 border-slate-800 text-slate-350 hover:bg-slate-850 hover:text-white' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
                }`}
              >
                <span>Export CSV</span>
              </button>
            )}

            <button 
              onClick={openCreate} 
              className="btn-primary flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Plus size={16}/>
              <span>Add Transaction</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 rounded-2xl bg-slate-900/40 animate-pulse border border-slate-800/20 shimmer" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-800/30 rounded-3xl bg-slate-900/5">
            <List size={48} className="mx-auto text-slate-500 mb-4 opacity-50"/>
            <p className={`text-base font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-650'}`}>No transactions yet</p>
            <p className="text-xs text-slate-500 mt-1">Start mapping your income or spending records to see charts.</p>
            <button 
              onClick={openCreate} 
              className="mt-4 text-xs font-semibold text-indigo-500 hover:text-indigo-600 cursor-pointer"
            >
              Add first entry
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {transactions.map(t => (
              <div 
                key={t.id} 
                className={`flex items-center justify-between p-4.5 rounded-2xl border transition-colors ${
                  isDarkMode
                    ? 'border-slate-850 bg-slate-900/20 hover:bg-slate-900/40 hover:border-slate-800'
                    : 'border-slate-100 bg-white hover:bg-slate-50 shadow-sm shadow-slate-100'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl filter drop-shadow">{t.category.icon}</span>
                  <div>
                    <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {t.category.name}
                    </p>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-450'}`}>
                      {formatDate(t.date)} {t.note ? `· ${t.note}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4.5">
                  <span className={`font-black tracking-tight text-sm ${
                    t.type === 'INCOME' 
                      ? 'text-emerald-500' 
                      : isDarkMode 
                        ? 'text-slate-200' 
                        : 'text-slate-800'
                  }`}>
                    {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                  </span>
                  <button 
                    onClick={() => handleDelete(t.id)} 
                    className={`p-2 rounded-xl transition-all cursor-pointer ${
                      isDarkMode 
                        ? 'text-slate-500 hover:text-red-400 hover:bg-red-500/10' 
                        : 'text-slate-400 hover:text-red-650 hover:bg-red-50'
                    }`}
                  >
                    <Trash2 size={15}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Transaction Modal */}
      {showForm && !showScanModal && (
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
                New Transaction
              </h2>
              <button 
                type="button" 
                onClick={() => setShowScanModal(true)} 
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                  isDarkMode 
                    ? 'bg-slate-800/40 border-slate-700/60 text-indigo-400 hover:bg-slate-800' 
                    : 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100/50'
                }`}
              >
                <Camera size={14}/> 
                <span>Scan Receipt</span>
              </button>
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
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600 focus:bg-white'
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

            <div className="mb-4">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-450' : 'text-slate-500'}`}>
                Date
              </label>
              <input 
                type="date" 
                value={formData.date} 
                onChange={e => setFormData(f=>({...f,date:e.target.value}))} 
                className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'bg-slate-900/60 border-slate-850 text-white focus:border-indigo-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-650 focus:bg-white'
                }`} 
                required
              />
            </div>

            <div className="mb-6">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-450' : 'text-slate-500'}`}>
                Note / Merchant
              </label>
              <input 
                type="text" 
                value={formData.note} 
                onChange={e => setFormData(f=>({...f,note:e.target.value}))} 
                className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                  isDarkMode 
                    ? 'bg-slate-900/60 border-slate-850 text-white focus:border-indigo-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-650 focus:bg-white'
                }`} 
                placeholder="e.g. Amazon Purchase"
              />
            </div>
            
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                className={`flex-1 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'border-slate-800 text-slate-400 hover:bg-slate-900' 
                    : 'border-slate-200 text-slate-600 hover:bg-slate-100/50'
                }`}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={saving} 
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg"
              >
                {saving ? 'Saving...' : 'Save Transaction'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Scan Receipt Modal */}
      {showScanModal && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md px-4" 
          onClick={() => setShowScanModal(false)}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            className={`w-full max-w-sm p-6 rounded-3xl border shadow-2xl animate-scale-in text-center ${
              isDarkMode
                ? 'bg-[#0f1225] border-slate-800'
                : 'bg-white border-slate-100'
            }`}
          >
            <h3 className={`text-lg font-black mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Scan Receipt
            </h3>
            
            {!selectedFile ? (
              <div 
                onClick={() => fileInputRef.current?.click()} 
                className={`border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all hover:border-indigo-500 ${
                  isDarkMode ? 'border-slate-800 bg-slate-900/30' : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <Camera size={32} className="mx-auto text-indigo-400 mb-3 opacity-80"/>
                <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Choose image</p>
                <p className="text-[11px] text-slate-500 mt-1">Accepts PNG, JPG or WEBP receipts</p>
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
            ) : (
              <div>
                <img 
                  src={URL.createObjectURL(selectedFile)} 
                  alt="preview" 
                  className="max-h-36 mx-auto mb-5 rounded-2xl border border-slate-750/30 shadow-md object-contain"
                />
                {scanning && (
                  <div className="mb-5 text-left">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-400 font-medium">Extracting metadata...</span>
                      <span className="text-indigo-400 font-bold">{ocrProgress}%</span>
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <div className="h-full bg-indigo-500 transition-all duration-300" style={{width:`${ocrProgress}%`}}/>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedFile(null)} 
                    disabled={scanning} 
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                      isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-650'
                    }`}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleScanReceipt} 
                    disabled={scanning} 
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  >
                    {scanning ? (
                      <>
                        <Loader2 size={13} className="animate-spin"/> 
                        <span>Extracting</span>
                      </>
                    ) : 'Extract Info'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
