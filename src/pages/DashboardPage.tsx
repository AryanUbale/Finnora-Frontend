import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ModernNavbar } from '../components/ModernNavbar';
import api from '../lib/api';
import { formatCurrency } from '../lib/formatters';
import {
  TrendingUp, Wallet, PiggyBank,
  RefreshCw, ChevronRight, ArrowUpRight, ArrowDownLeft, 
  Sparkles, AlertCircle, Activity, ArrowUp, ArrowDown
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

interface BudgetStatus {
  id: string;
  category: { name: string; icon: string; color: string };
  limitAmount: number;
  spent: number;
  percentUsed: number;
  status: string;
}

interface UpcomingPayment {
  id: string;
  name: string;
  amount: string;
  nextDueDate: string;
  category: { name: string; icon: string };
}

interface DashboardSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savingsRate: number;
  momIncome: number | null;
  momExpense: number | null;
}

interface MonthlyDataPoint {
  month: string;
  income: number | null;
  expense: number | null;
  name?: string;
  forecastIncome?: number | null;
  forecastExpense?: number | null;
}

interface CategoryDataPoint {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  value: number;
  color?: string;
  icon?: string;
  percentage?: number;
  amount?: number;
}

interface DashboardAccount {
  id: string;
  name: string;
  type: string;
  balance: string;
  color: string;
  bankName?: string;
}

export const DashboardPage = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary>({ 
    totalIncome: 0, 
    totalExpense: 0, 
    balance: 0, 
    savingsRate: 0,
    momIncome: null,
    momExpense: null
  });
  const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingPayment[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyDataPoint[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryDataPoint[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [generatingAi, setGeneratingAi] = useState(false);

  // New Phase 4 states
  const [accounts, setAccounts] = useState<DashboardAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [healthScore, setHealthScore] = useState<number>(70);

  const isDarkMode = theme === 'dark';
  const isPremium = user?.subscriptionTier === 'PREMIUM';

  const getDaysUntil = (dateStr: string) => {
    const d = new Date(dateStr);
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.ceil((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
  };

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setChartsLoading(true);
    setGeneratingAi(true);

    const accountParam = selectedAccountId !== 'all' ? `?accountId=${selectedAccountId}` : '';
    
    try {
      const [sumRes, budRes, upRes, monthlyRes, categoryRes, insightsRes, accountsRes] = await Promise.all([
        api.get(`/dashboard/summary${accountParam}`).catch(() => null),
        api.get('/budgets/status').catch(() => null),
        api.get('/recurring/upcoming').catch(() => null),
        api.get(`/dashboard/monthly${accountParam}`).catch(() => null),
        api.get(`/dashboard/by-category${accountParam}`).catch(() => null),
        api.get('/ai/insights').catch(() => null),
        api.get('/accounts').catch(() => null),
      ]);

      if (sumRes?.data?.data) {
        const d = sumRes.data.data;
        setSummary({
          totalIncome: Number(d.thisMonthIncome || 0),
          totalExpense: Number(d.thisMonthExpense || 0),
          balance: Number(d.totalBalance || 0),
          savingsRate: Number(d.savingsRate || 0),
          momIncome: d.momIncome,
          momExpense: d.momExpense
        });
      }

      if (budRes?.data?.data) {
        setBudgets(budRes.data.data.slice(0, 5));
      }

      if (upRes?.data?.data) {
        setUpcoming(upRes.data.data);
      }

      if (monthlyRes?.data?.data) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const formatted = monthlyRes.data.data.map((m: { month: string; income: number; expense: number }) => {
          const [year, monthVal] = m.month.split('-');
          return {
            ...m,
            name: `${months[parseInt(monthVal) - 1]} '${year.slice(2)}`,
          };
        });
        setMonthlyData(formatted);
      }

      if (categoryRes?.data?.data) {
        setCategoryData(categoryRes.data.data);
      }

      if (insightsRes?.data?.data) {
        setHealthScore(insightsRes.data.data.healthScore);
        setAiInsights(insightsRes.data.data.suggestions);
      }

      if (accountsRes?.data?.data) {
        setAccounts(accountsRes.data.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }

    setLoading(false);
    setChartsLoading(false);
    setGeneratingAi(false);
  }, [selectedAccountId, setLoading, setChartsLoading, setGeneratingAi, setSummary, setBudgets, setUpcoming, setMonthlyData, setCategoryData, setHealthScore, setAiInsights, setAccounts]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadDashboardData();
    }, 0);
    return () => clearTimeout(t);
  }, [loadDashboardData]);

  const getForecastedData = () => {
    if (monthlyData.length === 0) return [];
    if (!isPremium) {
      return monthlyData.map(m => ({ ...m, forecastIncome: null, forecastExpense: null }));
    }

    const formatted = monthlyData.map((m, idx) => {
      const isLastHistorical = idx === monthlyData.length - 1;
      return {
        ...m,
        forecastIncome: isLastHistorical ? m.income : null,
        forecastExpense: isLastHistorical ? m.expense : null,
      };
    });

    const incomes = monthlyData.map(m => m.income ?? 0);
    const expenses = monthlyData.map(m => m.expense ?? 0);
    const avgIncome = incomes.reduce((a, b) => a + b, 0) / incomes.length;
    const avgExpense = expenses.reduce((a, b) => a + b, 0) / expenses.length;

    const lastEntry = monthlyData[monthlyData.length - 1];
    let nextMonthVal = 1;
    let nextYearVal = new Date().getFullYear();
    
    if (lastEntry && lastEntry.month) {
      const [yearStr, monthStr] = lastEntry.month.split('-');
      nextYearVal = parseInt(yearStr);
      nextMonthVal = parseInt(monthStr) + 1;
      if (nextMonthVal > 12) {
        nextMonthVal = 1;
        nextYearVal += 1;
      }
    }
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const forecastMonthName = `${months[nextMonthVal - 1]} '${String(nextYearVal).slice(2)}`;

    formatted.push({
      month: `${nextYearVal}-${String(nextMonthVal).padStart(2, '0')}`,
      name: `${forecastMonthName} (AI Forecast)`,
      income: null,
      expense: null,
      forecastIncome: Math.round(avgIncome * 1.05),
      forecastExpense: Math.round(avgExpense * 0.95),
    });

    return formatted;
  };

  const getStatusColor = (s: string) => {
    if (s === 'exceeded') return 'bg-red-500';
    if (s === 'warning') return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getMomBadge = (val: number | null, isExpense: boolean = false) => {
    if (val === null) return null;
    const isPositive = val > 0;
    const isGood = isExpense ? !isPositive : isPositive;
    
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
        isGood 
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
      }`}>
        {isPositive ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
        {Math.abs(val)}% MoM
      </span>
    );
  };

  const stats = [
    {
      label: 'Net Balance',
      value: formatCurrency(summary.balance),
      icon: <Wallet size={20} />,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      gradient: 'from-indigo-600/15 to-transparent',
      mom: null
    },
    {
      label: 'Monthly Spending',
      value: formatCurrency(summary.totalExpense),
      icon: <ArrowDownLeft size={20} />,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      gradient: 'from-red-600/15 to-transparent',
      mom: getMomBadge(summary.momExpense, true)
    },
    {
      label: 'Monthly Income',
      value: formatCurrency(summary.totalIncome),
      icon: <ArrowUpRight size={20} />,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      gradient: 'from-emerald-600/15 to-transparent',
      mom: getMomBadge(summary.momIncome, false)
    },
    {
      label: 'Savings Rate',
      value: `${summary.savingsRate}%`,
      icon: <Activity size={20} />,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      gradient: 'from-amber-600/15 to-transparent',
      mom: summary.balance > 0 ? (
        <span className="text-[11px] font-semibold text-emerald-400">On Track</span>
      ) : summary.balance < 0 ? (
        <span className="text-[11px] font-semibold text-red-400">Warning</span>
      ) : null
    }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode
        ? 'bg-[#040716]'
        : 'bg-[#fafbfe]'
    }`}>
      <ModernNavbar activeTab="dashboard" />

      {/* ─── Main Content ─── */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        
        {/* Welcome Header */}
        <div className="mb-10 animate-slide-down flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className={`text-4xl font-extrabold tracking-tight mb-2 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Welcome, {user?.name?.split(' ')[0]}
            </h1>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Here's your smart financial performance dashboard for this month.
            </p>
          </div>
          
          <div className="flex items-center gap-3.5 flex-wrap">
            {/* Account Switcher */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-555'}`}>Account:</span>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className={`text-xs font-bold px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-slate-100'
                    : 'bg-white border-slate-200 text-slate-800 shadow-sm'
                }`}
              >
                <option value="all">All Accounts</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.bankName || 'Wallet'})
                  </option>
                ))}
              </select>
            </div>

            <button 
              onClick={() => navigate('/transactions')}
              className="btn-primary flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <span>Log Transactions</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Dynamic AI Insights Widget */}
        <div className={`glass-card p-6.5 mb-10 relative overflow-hidden border border-indigo-500/15 animate-fade-in ${
          isDarkMode 
            ? 'bg-gradient-to-r from-indigo-950/20 via-slate-900/40 to-slate-900/20' 
            : 'bg-gradient-to-r from-indigo-50/40 via-white/50 to-indigo-50/10'
        }`}>
          {/* Subtle neon glowing gradient background */}
          <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/10 animate-pulse">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className={`text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                Finnora AI Financial Advisor
                <span className="text-[10px] font-bold tracking-wider uppercase bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">Pro</span>
              </h2>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Real-time recommendations and safety audits powered by Gemini AI</p>
            </div>

            {isPremium && (
              <button 
                onClick={loadDashboardData}
                disabled={generatingAi}
                className={`ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border cursor-pointer ${
                  isDarkMode 
                    ? 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {generatingAi ? 'Analyzing...' : 'Refresh AI'}
              </button>
            )}
          </div>

          <div className="relative z-10">
            {generatingAi && isPremium ? (
              <div className="space-y-2 py-2">
                <div className="h-4 w-3/4 rounded bg-slate-800 animate-pulse shimmer" />
                <div className="h-4 w-5/6 rounded bg-slate-800 animate-pulse shimmer" />
                <div className="h-4 w-2/3 rounded bg-slate-800 animate-pulse shimmer" />
              </div>
            ) : isPremium ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Circular Score Gauge */}
                <div className="md:col-span-3 flex flex-col items-center justify-center border-r border-slate-800/20 pr-4">
                  <div className="relative flex flex-col items-center justify-center">
                    <svg className="w-28 h-28 transform -rotate-90">
                      <circle cx="56" cy="56" r="45" stroke={isDarkMode ? '#1e293b' : '#e2e8f0'} strokeWidth="8" fill="transparent" />
                      <circle
                        cx="56"
                        cy="56"
                        r="45"
                        stroke="url(#healthGradient)"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 45}
                        strokeDashoffset={(2 * Math.PI * 45) - ((healthScore / 100) * (2 * Math.PI * 45))}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                      <defs>
                        <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-2.5xl font-black tracking-tight">{healthScore}</span>
                      <span className="text-[10px] uppercase tracking-widest font-black text-slate-500">Score</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400 mt-2.5">
                    {healthScore >= 80 ? '🟢 Excellent Shape' : healthScore >= 60 ? '🟡 Moderate Risk' : '🔴 Needs Attention'}
                  </span>
                </div>

                {/* Suggestions List */}
                <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {aiInsights.map((insight, idx) => {
                    const formattedText = insight.split('**').map((part, i) => 
                      i % 2 === 1 ? <strong key={i} className="text-indigo-400 font-bold">{part}</strong> : part
                    );
                    return (
                      <div 
                        key={idx} 
                        className={`flex gap-3 p-3.5 rounded-xl border ${
                          isDarkMode 
                            ? 'bg-slate-900/30 border-slate-800/40 text-slate-300' 
                            : 'bg-white/60 border-slate-200/50 text-slate-600'
                        }`}
                      >
                        <AlertCircle size={16} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs leading-relaxed">{formattedText}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Gated lock state for FREE tier */
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3.5 border border-indigo-500/20">
                  <Sparkles size={20} />
                </div>
                <h3 className="text-sm font-bold mb-1">Financial Health Scoring & AI Recommendations</h3>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} max-w-md mb-4`}>
                  Get an audit of your cash flow velocities, budget optimization metrics, and safety flags compiled by Gemini Pro.
                </p>
                <a
                  href="/billing"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all rounded-xl active:scale-95 shadow-lg shadow-indigo-600/10"
                >
                  Unlock Advisor Premium
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Stat Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10 stagger-children">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`group glass-card relative overflow-hidden p-6 ${
                isDarkMode ? '' : 'bg-white/80 border-slate-200/80 shadow-sm'
              }`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Card gradient effect on hover */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-br ${stat.gradient} pointer-events-none`} />

              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className={`w-11 h-11 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    {stat.icon}
                  </div>
                  {stat.mom}
                </div>
                <p className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {stat.label}
                </p>
                <p className={`text-2.5xl font-extrabold tracking-tight mt-1.5 ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                  {loading ? (
                    <span className="inline-block h-6 w-24 bg-slate-800 animate-pulse shimmer rounded" />
                  ) : stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          
          {/* Budget Status Widget */}
          <div className={`glass-card p-6 md:p-8 animate-slide-up ${isDarkMode ? '' : 'bg-white/80 border-slate-200/80'}`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Budget Tracker
                </h3>
                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-550'}`}>
                  Overview of spending vs budget limits
                </p>
              </div>
              <button
                onClick={() => navigate('/budgets')}
                className="group flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                Manage <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 rounded-xl bg-slate-900/40 animate-pulse shimmer border border-slate-800/20" />
                ))}
              </div>
            ) : budgets.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-800/30 rounded-2xl">
                <PiggyBank size={36} className={`mx-auto mb-2 opacity-40 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  No active budgets found for this month.
                </p>
                <button 
                  onClick={() => navigate('/budgets')} 
                  className="mt-3.5 text-xs text-indigo-400 hover:text-indigo-500 font-bold cursor-pointer"
                >
                  Create your first budget
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {budgets.map((b) => (
                  <div
                    key={b.id}
                    className={`p-4 rounded-2xl border transition-colors ${
                      isDarkMode
                        ? 'border-slate-800/40 bg-slate-900/20 hover:bg-slate-900/40'
                        : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{b.category.icon}</span>
                        <div>
                          <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                            {b.category.name}
                          </p>
                          <p className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {formatCurrency(b.spent)} of {formatCurrency(b.limitAmount)}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-black ${
                        b.status === 'exceeded'
                          ? 'text-red-500'
                          : b.status === 'warning'
                            ? 'text-amber-500'
                            : 'text-emerald-500'
                      }`}>
                        {Math.round(b.percentUsed)}%
                      </span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${
                      isDarkMode ? 'bg-slate-800' : 'bg-slate-200'
                    }`}>
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${getStatusColor(b.status)}`}
                        style={{ width: `${Math.min(b.percentUsed, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Payments Widget */}
          <div className={`glass-card p-6 md:p-8 animate-slide-up ${isDarkMode ? '' : 'bg-white/80 border-slate-200/80'}`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Upcoming Subscriptions
                </h3>
                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-550'}`}>
                  Active recurring bills due in 30 days
                </p>
              </div>
              <button
                onClick={() => navigate('/recurring')}
                className="group flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                View calendar <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 rounded-xl bg-slate-900/40 animate-pulse shimmer border border-slate-800/20" />
                ))}
              </div>
            ) : upcoming.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-800/30 rounded-2xl">
                <RefreshCw size={36} className={`mx-auto mb-2 opacity-40 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  No upcoming subscription payments.
                </p>
                <button 
                  onClick={() => navigate('/recurring')} 
                  className="mt-3.5 text-xs text-indigo-400 hover:text-indigo-500 font-bold cursor-pointer"
                >
                  Add subscription / bill
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((p) => {
                  const days = getDaysUntil(p.nextDueDate);
                  const overdue = days < 0;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-colors ${
                        isDarkMode
                          ? 'border-slate-800/40 bg-slate-900/20 hover:bg-slate-900/40'
                          : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl flex-shrink-0">{p.category.icon}</span>
                        <div className="min-w-0">
                          <p className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                            {p.name}
                          </p>
                          <p className={`text-[11px] ${
                            overdue
                              ? 'text-red-400'
                              : days <= 3
                                ? 'text-amber-400 font-medium'
                                : isDarkMode
                                  ? 'text-slate-500'
                                  : 'text-slate-400'
                          }`}>
                            {overdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `Due in ${days}d`}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm font-extrabold flex-shrink-0 ml-2 ${
                        isDarkMode ? 'text-slate-200' : 'text-slate-900'
                      }`}>
                        {formatCurrency(Number(p.amount))}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recharts Graphics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Monthly Spending Area Chart */}
          <div className={`glass-card p-6 md:p-8 animate-slide-up ${isDarkMode ? '' : 'bg-white/80 border-slate-200/80'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Cashflow Analysis
              </h3>
              {isPremium && (
                <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase flex items-center gap-1 animate-pulse">
                  🔮 AI Forecast Active
                </span>
              )}
            </div>
            
            {chartsLoading ? (
              <div className="h-60 rounded-xl bg-slate-900/40 animate-pulse shimmer flex items-center justify-center">
                <span className="text-xs text-slate-500">Loading cashflow records...</span>
              </div>
            ) : monthlyData.length === 0 ? (
              <div className="h-60 flex flex-col items-center justify-center border border-dashed border-slate-800/30 rounded-2xl">
                <TrendingUp size={36} className={`mb-2 opacity-40 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                <p className="text-xs text-slate-500 font-medium">Add transactions to visualize cashflow history.</p>
              </div>
            ) : (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={getForecastedData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? 'rgba(71, 85, 105, 0.15)' : 'rgba(226, 232, 240, 0.5)'} />
                    <XAxis 
                      dataKey="name" 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 500 }}
                    />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 500 }}
                    />
                    <Tooltip 
                      contentStyle={{ background: 'transparent', border: 'none' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="custom-recharts-tooltip">
                              <p className="text-xs font-bold mb-1.5">{payload[0].payload.name || payload[0].payload.month}</p>
                              {payload.map((entry) => {
                                if (entry.value === null || entry.value === undefined) return null;
                                const val = Number(entry.value);
                                return (
                                  <p key={String(entry.name)} className="text-[11px] font-semibold leading-relaxed flex items-center gap-1.5" style={{ color: entry.color }}>
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                    {entry.name === 'income' ? 'Income' : entry.name === 'expense' ? 'Expense' : entry.name === 'forecastIncome' ? 'AI Projected Income' : 'AI Projected Expense'}: {formatCurrency(val)}
                                  </p>
                                );
                              })}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {/* Historical Series */}
                    <Area type="monotone" dataKey="income" name="income" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIncome)" />
                    <Area type="monotone" dataKey="expense" name="expense" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExpense)" />
                    {/* Forecast Series */}
                    {isPremium && (
                      <>
                        <Area type="monotone" dataKey="forecastIncome" name="forecastIncome" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" fill="transparent" dot={{ r: 3 }} />
                        <Area type="monotone" dataKey="forecastExpense" name="forecastExpense" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" fill="transparent" dot={{ r: 3 }} />
                      </>
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Expense Categories Donut Chart */}
          <div className={`glass-card p-6 md:p-8 animate-slide-up ${isDarkMode ? '' : 'bg-white/80 border-slate-200/80'}`}>
            <h3 className={`text-lg font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Top Categories
            </h3>

            {chartsLoading ? (
              <div className="h-60 rounded-xl bg-slate-900/40 animate-pulse shimmer flex items-center justify-center">
                <span className="text-xs text-slate-500">Calculating distributions...</span>
              </div>
            ) : categoryData.length === 0 ? (
              <div className="h-60 flex flex-col items-center justify-center border border-dashed border-slate-800/30 rounded-2xl">
                <span className="text-2xl mb-2">📊</span>
                <p className="text-xs text-slate-500 font-medium">No expense records found for distributions.</p>
              </div>
            ) : (
              <div className="h-60 w-full flex flex-col sm:flex-row items-center justify-center gap-6">
                <div className="h-44 w-44 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="amount"
                        nameKey="categoryName"
                        innerRadius={52}
                        outerRadius={70}
                        paddingAngle={4}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: 'transparent', border: 'none' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="custom-recharts-tooltip">
                                <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: data.color }}>
                                  <span>{data.icon}</span>
                                  {data.categoryName}
                                </p>
                                <p className="text-[11px] mt-1 font-semibold text-slate-300">
                                  Amount: {formatCurrency(data.amount)} ({data.percentage}%)
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Custom Legend List */}
                <div className="flex-1 overflow-y-auto max-h-48 w-full">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {categoryData.slice(0, 6).map((cat) => (
                      <div key={cat.categoryId} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-900/10 transition-colors">
                        <span className="w-2.5 h-2.5 rounded-md flex-shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="truncate max-w-[80px] font-medium leading-none">{cat.icon} {cat.categoryName}</span>
                        <span className={`ml-auto font-extrabold text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {cat.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};
