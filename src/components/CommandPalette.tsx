import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { 
  Search, Terminal, Sparkles, LayoutDashboard, Wallet, CreditCard, 
  TrendingUp, RefreshCw, Sun, Moon, LogOut, UserPlus 
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isDarkMode = theme === 'dark';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle palette: Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
      // Close: Esc
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        setSearch('');
        setActiveIndex(0);
        inputRef.current?.focus();
      }, 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  const commands: CommandItem[] = [
    {
      id: 'dashboard',
      title: 'Go to Dashboard',
      subtitle: 'View your net worth, expenses, and savings',
      shortcut: 'G D',
      icon: <LayoutDashboard size={16} />,
      action: () => { navigate('/'); setIsOpen(false); }
    },
    {
      id: 'transactions',
      title: 'View Transactions',
      subtitle: 'Analyze your cash flows and add manual receipts',
      shortcut: 'G T',
      icon: <TrendingUp size={16} />,
      action: () => { navigate('/transactions'); setIsOpen(false); }
    },
    {
      id: 'budgets',
      title: 'Manage Budgets',
      subtitle: 'Set spending limits and view categories',
      shortcut: 'G B',
      icon: <Wallet size={16} />,
      action: () => { navigate('/budgets'); setIsOpen(false); }
    },
    {
      id: 'subscriptions',
      title: 'Track Subscriptions',
      subtitle: 'Review recurring bills and calendar',
      shortcut: 'G R',
      icon: <RefreshCw size={16} />,
      action: () => { navigate('/recurring'); setIsOpen(false); }
    },
    {
      id: 'ai-assistant',
      title: 'Ask Finnora AI',
      subtitle: 'Start a chat session with your money assistant',
      shortcut: 'G A',
      icon: <Sparkles size={16} className="text-indigo-400" />,
      action: () => { navigate('/ai-assistant'); setIsOpen(false); }
    },
    {
      id: 'accounts',
      title: 'Manage Bank Accounts',
      subtitle: 'Link multiple wallets or bank accounts',
      shortcut: 'G M',
      icon: <UserPlus size={16} />,
      action: () => { navigate('/accounts'); setIsOpen(false); }
    },
    {
      id: 'billing',
      title: 'Subscription & Billing',
      subtitle: 'Upgrade to premium or manage membership',
      shortcut: 'G P',
      icon: <CreditCard size={16} />,
      action: () => { navigate('/billing'); setIsOpen(false); }
    },
    {
      id: 'theme',
      title: `Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`,
      subtitle: `Toggle UI visual theme mode`,
      shortcut: 'T T',
      icon: isDarkMode ? <Sun size={16} /> : <Moon size={16} />,
      action: () => { toggleTheme(); setIsOpen(false); }
    },
    {
      id: 'logout',
      title: 'Log Out Session',
      subtitle: 'Securely sign out of your account',
      shortcut: 'S O',
      icon: <LogOut size={16} className="text-red-400" />,
      action: () => { logout(); setIsOpen(false); }
    }
  ];

  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.subtitle.toLowerCase().includes(search.toLowerCase())
  );

  // Keyboard navigation inside list
  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[activeIndex]) {
        filtered[activeIndex].action();
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const listElement = listRef.current;
    if (!listElement) return;
    const activeElement = listElement.children[activeIndex] as HTMLElement;
    if (activeElement) {
      const listHeight = listElement.clientHeight;
      const activeTop = activeElement.offsetTop;
      const activeHeight = activeElement.clientHeight;

      if (activeTop + activeHeight > listElement.scrollTop + listHeight) {
        listElement.scrollTop = activeTop + activeHeight - listHeight;
      } else if (activeTop < listElement.scrollTop) {
        listElement.scrollTop = activeTop;
      }
    }
  }, [activeIndex]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-slate-950/40 backdrop-blur-[5px] z-50 flex items-start justify-center pt-[15vh] px-4 animate-fade-in"
      onClick={() => setIsOpen(false)}
    >
      <div 
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col scale-100 transition-all duration-300 animate-scale-up ${
          isDarkMode
            ? 'bg-[#0b0f19]/95 border-slate-800 text-slate-100 shadow-slate-950/80'
            : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-200/50'
        }`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleListKeyDown}
      >
        {/* Search Input bar */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800/10">
          <Search size={18} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search shortcuts..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActiveIndex(0);
            }}
            className="w-full text-sm font-semibold bg-transparent border-none outline-none focus:ring-0 placeholder-slate-500"
          />
          <span className="text-[10px] font-black bg-slate-500/10 px-2 py-1 rounded text-slate-400 border border-slate-500/20">ESC</span>
        </div>

        {/* Action list */}
        <div 
          ref={listRef}
          className="max-h-72 overflow-y-auto p-2 space-y-0.5 no-scrollbar"
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500">
              <Terminal size={24} className="opacity-30 mb-2" />
              <p className="text-xs font-semibold">No commands found</p>
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={cmd.id}
                  onClick={cmd.action}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                    isActive
                      ? isDarkMode
                        ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20'
                        : 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/10'
                      : 'border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-500/5 text-slate-400'}`}>
                      {cmd.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold leading-none mb-1">{cmd.title}</p>
                      <p className={`text-[10px] truncate ${isActive ? 'text-indigo-400/80' : 'text-slate-400'}`}>{cmd.subtitle}</p>
                    </div>
                  </div>

                  {cmd.shortcut && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {cmd.shortcut.split(' ').map((key) => (
                        <kbd key={key} className="px-1.5 py-0.5 text-[9px] font-black rounded bg-slate-500/10 border border-slate-500/25 text-slate-400">
                          {key}
                        </kbd>
                      ))}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className={`px-4 py-2 text-[10px] font-semibold border-t flex justify-between items-center ${
          isDarkMode ? 'border-slate-800/40 text-slate-500 bg-slate-900/10' : 'border-slate-100 text-slate-400 bg-slate-50/50'
        }`}>
          <div className="flex items-center gap-2">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
          <div className="flex items-center gap-1">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-500/10 border border-slate-500/25">⌘</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-500/10 border border-slate-500/25">K</kbd>
            <span>to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
