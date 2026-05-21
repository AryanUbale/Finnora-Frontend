import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ModernNavbar } from '../components/ModernNavbar';
import toast from 'react-hot-toast';
import { Check, Sparkles, Shield, Zap } from 'lucide-react';

export function BillingPage() {
  const { user, upgradeTier } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);

  const isDarkMode = theme === 'dark';
  const currentTier = user?.subscriptionTier || 'FREE';

  const handleSubscriptionToggle = async (targetTier: 'FREE' | 'PREMIUM') => {
    setLoading(true);
    try {
      await upgradeTier(targetTier);
      toast.success(
        targetTier === 'PREMIUM'
          ? 'Successfully upgraded to Finnora Pro Premium! ✨'
          : 'Downgraded to Free Tier.'
      );
    } catch {
      toast.error('Transaction simulation failed.');
    }
    setLoading(false);
  };

  const plans = [
    {
      name: 'Free Starter',
      price: '$0',
      period: 'forever',
      description: 'Ideal for basic budgeting and personal transaction logs.',
      features: [
        'Up to 3 Budget limits per month',
        'Basic Transaction ledger logging',
        'Offline PDF report printer formatting',
        '5 Receipt scans OCR uploads per month',
        'Standard notifications',
      ],
      cta: 'Current Plan',
      tier: 'FREE',
    },
    {
      name: 'Finnora Pro Premium',
      price: '$9.99',
      period: 'month',
      description: 'Unlock complete AI financial intelligence, forecasting, and accounts.',
      features: [
        'Unlimited Budgets with anomaly alerts',
        'Conversational AI Chat Financial Assistant',
        'AI insights summary & optimization cards',
        'Interactive expense forecasting & cash flow charts',
        'Infinite receipt OCR & auto-logged transactions',
        'Multi-Account banking switcher & Raycast Command Palette',
        'Priority premium notifications',
      ],
      cta: 'Upgrade to Pro Premium',
      tier: 'PREMIUM',
    },
  ];

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#060814] text-slate-100' : 'bg-slate-50/50 text-slate-800'} transition-colors duration-300`}>
      <ModernNavbar />

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-4 animate-pulse">
            <Sparkles size={13} />
            SaaS Plan Gating & Billing
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-4">
            Select Your financial <span className="gradient-text">Freedom Level</span>
          </h1>
          <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-600'} text-base`}>
            Empower your money with startup-quality automation. Upgrade to unlock Raycast palettes, AI chat, and expense forecasting.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
          {plans.map((plan) => {
            const isCurrent = currentTier === plan.tier;
            const isPremiumPlan = plan.tier === 'PREMIUM';

            return (
              <div
                key={plan.name}
                className={`relative flex flex-col justify-between p-8 rounded-3xl border transition-all duration-300 ${
                  isCurrent
                    ? 'border-indigo-500/80 bg-indigo-500/[0.02] shadow-[0_0_30px_-5px_rgba(99,102,241,0.2)]'
                    : isDarkMode
                    ? 'border-slate-800/40 bg-slate-900/20 hover:border-slate-700/60'
                    : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                }`}
              >
                {isPremiumPlan && (
                  <div className="absolute -top-3 right-8 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-indigo-600 text-white shadow-lg flex items-center gap-1">
                    <Sparkles size={10} /> Popular
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-6`}>
                    {plan.description}
                  </p>

                  <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-4xl font-black">{plan.price}</span>
                    <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      /{plan.period}
                    </span>
                  </div>

                  <div className="space-y-4 mb-8 border-t pt-6 border-slate-800/30">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3">
                        <div className={`mt-0.5 rounded-full p-0.5 flex-shrink-0 ${
                          isPremiumPlan 
                            ? 'bg-indigo-500/10 text-indigo-400' 
                            : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          <Check size={14} />
                        </div>
                        <span className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  disabled={loading || isCurrent}
                  onClick={() => handleSubscriptionToggle(plan.tier as 'FREE' | 'PREMIUM')}
                  className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${
                    isCurrent
                      ? isDarkMode
                        ? 'bg-slate-800 text-slate-400 border border-slate-700/50 cursor-not-allowed'
                        : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      : isPremiumPlan
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-[0.98]'
                      : isDarkMode
                      ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700/50 active:scale-[0.98]'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 active:scale-[0.98]'
                  }`}
                >
                  {loading ? 'Processing...' : isCurrent ? 'Active Subscription' : plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        {/* Security / FAQ Banner */}
        <div className={`mt-16 p-6 rounded-3xl border max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 ${
          isDarkMode ? 'bg-slate-900/10 border-slate-800/30' : 'bg-slate-100/50 border-slate-200'
        }`}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl">
              <Shield size={24} />
            </div>
            <div>
              <h4 className="font-bold text-sm">Secure Sandbox Stripe Simulator</h4>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
                All upgrades are 100% simulated locally in the SQLite layer for developer review. No charges apply.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border border-slate-800/20 bg-slate-500/5 text-slate-400">
            <Zap size={12} /> Sandbox Mode Active
          </div>
        </div>
      </main>
    </div>
  );
}
