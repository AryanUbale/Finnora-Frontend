import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type SignupForm = z.infer<typeof signupSchema>;

export const SignupPage = () => {
  const { signup } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const isDarkMode = theme === 'dark';

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupForm) => {
    try {
      setError('');
      await signup(data.email, data.password, data.name);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const errorMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Signup failed. Please try again.';
      setError(errorMsg);
    }
  };

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${
      isDarkMode ? 'bg-[#040716] text-white' : 'bg-[#fafbfe] text-slate-900'
    }`}>
      {/* Left side - Branding & Pitch */}
      <div className={`hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-16 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-[#0a0e27] via-[#050718] to-[#02030b] border-r border-slate-900'
          : 'bg-gradient-to-br from-indigo-50/50 via-slate-50 to-indigo-50/30 border-r border-slate-100'
      }`}>
        {/* Glow Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] opacity-40 bg-indigo-500" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] opacity-35 bg-cyan-500" />
        </div>

        {/* Top Header */}
        <div className="relative z-10">
          <span className="text-xl font-black bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Finnora
          </span>
        </div>

        {/* Pitch content */}
        <div className="relative z-10 max-w-sm mx-auto my-auto animate-float">
          <div className={`glass-card p-6.5 rounded-3xl border ${
            isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200/50 bg-white/60'
          } shadow-2xl backdrop-blur-xl`}>
            <h3 className={`text-base font-black mb-5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Why Choose Finnora?</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xs shrink-0 font-bold">✓</div>
                <div>
                  <p className={`text-xs font-bold ${isDarkMode ? 'text-slate-250' : 'text-slate-800'}`}>Smart Receipt OCR</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Scan utility & store receipts instantly to autofill inputs.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-xs shrink-0 font-bold">✓</div>
                <div>
                  <p className={`text-xs font-bold ${isDarkMode ? 'text-slate-250' : 'text-slate-800'}`}>Savings & Budgets</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Control category limits and receive glow warnings when close.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 text-xs shrink-0 font-bold">✓</div>
                <div>
                  <p className={`text-xs font-bold ${isDarkMode ? 'text-slate-250' : 'text-slate-800'}`}>Weekly Insights</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Receive personalized AI-generated spending assessments.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-500">
          <span>&copy; {new Date().getFullYear()} Finnora Technologies. All rights reserved.</span>
        </div>
      </div>

      {/* Right side - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md animate-scale-in py-8">
          {/* Logo visible only on Mobile/Tablet */}
          <div className="lg:hidden mb-8">
            <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">Finnora</h1>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>AI-Powered Financial Insights</p>
          </div>

          <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Create account</h2>
          <p className={`text-sm mt-1.5 mb-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Take control of your finances today</p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-semibold animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4.5">
            <Input
              label="Full name"
              type="text"
              placeholder="John Doe"
              icon={<User size={18} />}
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              label="Email Address"
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

            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              icon={<Lock size={18} />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button 
              type="submit" 
              size="lg" 
              className="w-full mt-3 cursor-pointer shadow-lg shadow-indigo-500/10" 
              isLoading={isSubmitting}
            >
              Get started for free
            </Button>
          </form>

          <p className={`mt-8 text-center text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Already have an account?{' '}
            <Link 
              to="/login" 
              className="text-indigo-550 hover:text-indigo-650 font-bold transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
