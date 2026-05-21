import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ModernNavbar } from '../components/ModernNavbar';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Send, Sparkles, Brain, Lock, RefreshCw, BarChart2 } from 'lucide-react';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
}

export function AiAssistantPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: `👋 **Welcome to Finnora Pro AI Assistant!**\n\nI can analyze your balances, transaction velocities, recurring items, and budgets to answer direct questions.\n\nTry checking your financial health score or forecasting next month's spending with the quick prompt cards below!`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isDarkMode = theme === 'dark';
  const isPremium = user?.subscriptionTier === 'PREMIUM';

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (messageText: string) => {
    if (!messageText.trim()) return;
    if (!isPremium) {
      toast.error('AI assistant requires a premium upgrade.');
      return;
    }

    setMessages((prev) => [...prev, { sender: 'user', text: messageText }]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', { message: messageText });
      setMessages((prev) => [...prev, { sender: 'assistant', text: res.data.data.response }]);
    } catch {
      toast.error('AI system error. Please try again.');
    }
    setLoading(false);
  };

  const quickPrompts = [
    { title: 'Evaluate Budgets', query: 'Analyze my budgets and categories.', icon: <BarChart2 size={13} /> },
    { title: 'Check Subscriptions', query: 'Review my active subscriptions and billing waste.', icon: <RefreshCw size={13} /> },
    { title: 'Forecast Spending', query: 'Forecast my spending and net cash flow outline.', icon: <Brain size={13} /> },
    { title: 'Health Score Audit', query: 'Check my financial health score.', icon: <Sparkles size={13} /> },
  ];

  // Render markdown helper
  const renderMessageText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      // Headers
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-base font-black text-indigo-400 mt-4 mb-2">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('#### ')) {
        return <h4 key={idx} className="text-sm font-bold text-slate-300 mt-3 mb-1">{line.replace('#### ', '')}</h4>;
      }
      // Bullets
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={idx} className="ml-4 list-disc text-sm text-slate-300 my-1">{line.substring(2)}</li>;
      }
      // Table formatting
      if (line.startsWith('|')) {
        const cols = line.split('|').map(c => c.trim()).filter(Boolean);
        if (cols.length > 0) {
          return (
            <div key={idx} className="flex border-b border-slate-800/40 py-1.5 text-xs text-slate-300 justify-between items-center max-w-lg">
              <span className="font-semibold text-slate-400">{cols[0]}</span>
              <span className="font-mono text-indigo-400">{cols[1]}</span>
            </div>
          );
        }
      }
      return <p key={idx} className="text-sm leading-relaxed my-1.5">{line}</p>;
    });
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-[#060814] text-slate-100' : 'bg-slate-50/50 text-slate-800'} transition-colors duration-300`}>
      <ModernNavbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8 flex flex-col relative h-[calc(100vh-80px)]">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800/20 pb-4 mb-6">
          <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Brain size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              Finnora AI Core <span className="text-[10px] font-black tracking-wider bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded-full uppercase">Pro</span>
            </h1>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Conversational money advice and spending behavior evaluations.
            </p>
          </div>
        </div>

        {/* Message Panel */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-2 mb-6">
          {messages.map((m, index) => {
            const isAsst = m.sender === 'assistant';
            return (
              <div key={index} className={`flex gap-4 ${isAsst ? '' : 'justify-end'}`}>
                {isAsst && (
                  <div className="w-8 h-8 rounded-full bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles size={14} />
                  </div>
                )}
                <div
                  className={`p-5 rounded-2xl max-w-2xl text-sm leading-relaxed ${
                    isAsst
                      ? isDarkMode
                        ? 'bg-slate-900/40 border border-slate-800/40'
                        : 'bg-white border border-slate-200/80 shadow-sm'
                      : 'bg-indigo-600 text-white shadow-lg'
                  }`}
                >
                  {isAsst ? renderMessageText(m.text) : <p>{m.text}</p>}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center animate-spin">
                <RefreshCw size={14} />
              </div>
              <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-slate-800/40' : 'bg-white border-slate-200'}`}>
                <div className="flex gap-1.5 items-center">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Action Panel / Input Form */}
        <div className="space-y-4">
          {/* Quick chip selector */}
          <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
            {quickPrompts.map((chip) => (
              <button
                key={chip.title}
                onClick={() => handleSend(chip.query)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex-shrink-0 active:scale-95 ${
                  isDarkMode
                    ? 'bg-slate-900/35 border-slate-800 hover:border-indigo-500/30 text-slate-300'
                    : 'bg-white border-slate-200 hover:border-indigo-400/40 text-slate-600 shadow-sm'
                }`}
              >
                {chip.icon}
                {chip.title}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="relative"
          >
            <input
              type="text"
              disabled={loading || !isPremium}
              placeholder={isPremium ? 'Ask Finnora AI about your money...' : 'Upgrade subscription to unlock AI Assistant.'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className={`w-full pl-5 pr-14 py-4.5 rounded-2xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                isDarkMode
                  ? 'bg-slate-900/50 border-slate-800 text-slate-100'
                  : 'bg-white border-slate-200 text-slate-800 shadow-sm'
              }`}
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || !isPremium}
              className={`absolute right-3.5 top-3.5 p-2 rounded-xl text-white transition-all cursor-pointer ${
                input.trim() && isPremium ? 'bg-indigo-600 hover:bg-indigo-500 scale-100' : 'bg-slate-800/40 text-slate-600 cursor-not-allowed scale-95'
              }`}
            >
              <Send size={15} />
            </button>
          </form>
        </div>

        {/* Feature Lock Overlay */}
        {!isPremium && (
          <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[6px] z-20 flex flex-col items-center justify-center p-8 text-center rounded-3xl mt-20">
            <div className="p-4 bg-indigo-600 text-white rounded-3xl shadow-xl mb-4 border border-indigo-500/20">
              <Lock size={28} />
            </div>
            <h2 className="text-xl font-extrabold mb-1">Finnora AI is Locked</h2>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} max-w-sm mb-6`}>
              Gain deep intelligence, budget analysis suggestions, and custom forecasting by upgrading to our premium plan.
            </p>
            <a
              href="/billing"
              className="px-6 py-3 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg active:scale-95 transition-all"
            >
              Unlock Premium Experience
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
