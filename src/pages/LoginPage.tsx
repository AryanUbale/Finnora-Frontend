import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export const LoginPage = () => {
  const { login, user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const isDarkMode = theme === 'dark';
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setError('');
      await login(data.email, data.password);
      navigate(from, { replace: true });
    } catch (err) {
      const errorMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Login failed. Please try again.';
      setError(errorMsg);
    }
  };

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${
      isDarkMode ? 'bg-[#040716] text-white' : 'bg-[#fafbfe] text-slate-900'
    }`}>
      {/* Left side - Branding & Showcase Card */}
      <div className={`hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-16 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-[#0a0e27] via-[#050718] to-[#02030b] border-r border-slate-900'
          : 'bg-gradient-to-br from-indigo-50/50 via-slate-50 to-indigo-50/30 border-r border-slate-100'
      }`}>
        {/* Glow Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] opacity-40 bg-indigo-500`} />
          <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] opacity-35 bg-cyan-500`} />
        </div>

        {/* Top Header */}
        <div className="relative z-10">
          <span className="text-xl font-black bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Finnora
          </span>
        </div>

        {/* Center Mockup Card */}
        <div className="relative z-10 max-w-sm mx-auto my-auto animate-float">
          {/* Glassmorphic Visa/Mock Card */}
          <div className="w-[350px] h-[210px] rounded-3xl p-6 relative overflow-hidden border border-white/10 shadow-2xl backdrop-blur-xl bg-white/5 flex flex-col justify-between">
            {/* Ambient inner glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full blur-2xl opacity-40 -mr-6 -mt-6" />
            
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Finnora Premium</p>
                <h4 className="text-base font-black text-white mt-1 tracking-tight">Interactive Account</h4>
              </div>
              <div className="w-10 h-7 bg-white/10 rounded-lg flex items-center justify-center border border-white/5 font-extrabold text-[9px] text-white">
                FIN
              </div>
            </div>

            <div className="my-3">
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Cash Balance</p>
              <h2 className="text-2xl font-black text-white mt-0.5 tracking-tight">₹48,250.00</h2>
            </div>

            <div className="flex justify-between items-end">
              <div>
                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Card Holder</p>
                <p className="text-[11px] font-bold text-white tracking-wide mt-0.5">{user?.name || 'Guest Investor'}</p>
              </div>
              <div className="flex gap-1.5">
                <div className="w-6 h-6 rounded-full bg-red-500/80" />
                <div className="w-6 h-6 rounded-full bg-amber-500/80 -ml-3" />
              </div>
            </div>
          </div>

          <div className="mt-8 text-center px-4">
            <h3 className={`text-xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              Understand where your money goes.
            </h3>
            <p className={`text-xs mt-2 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Join thousands of smart individuals using Finnora to automate receipt OCR scanning, budget tracking, and real-time cash flow analytics.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-500">
          <span>&copy; {new Date().getFullYear()} Finnora Technologies. All rights reserved.</span>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md animate-scale-in">
          {/* Logo visible only on Mobile/Tablet */}
          <div className="lg:hidden mb-8">
            <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">Finnora</h1>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>AI-Powered Financial Insights</p>
          </div>

          <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Welcome back</h2>
          <p className={`text-sm mt-1.5 mb-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Sign in to your account to continue</p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              icon={<Mail size={18} />}
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                icon={<Lock size={18} />}
                error={errors.password?.message}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4.5 top-9 text-slate-500 hover:text-indigo-400 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="flex justify-end">
              <Link 
                to="/forgot-password" 
                className="text-xs font-bold text-indigo-500 hover:text-indigo-650 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Button 
              type="submit" 
              size="lg" 
              className="w-full mt-2 cursor-pointer shadow-lg shadow-indigo-500/10" 
              isLoading={isSubmitting}
            >
              Sign in
            </Button>
          </form>

          <p className={`mt-8 text-center text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Don't have an account?{' '}
            <Link 
              to="/signup" 
              className="text-indigo-550 hover:text-indigo-650 font-bold transition-colors"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
