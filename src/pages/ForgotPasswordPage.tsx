import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Mail, Lock, ArrowLeft, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';

const emailSchema = z.object({ email: z.string().email('Invalid email address') });
const resetSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(8, 'Min 8 characters').regex(/[A-Z]/, 'Need uppercase').regex(/[0-9]/, 'Need number'),
});

type EmailForm = z.infer<typeof emailSchema>;
type ResetForm = z.infer<typeof resetSchema>;

export const ForgotPasswordPage = () => {
  const { theme } = useTheme();
  const [step, setStep] = useState<'email' | 'reset' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const isDarkMode = theme === 'dark';

  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });
  const resetForm = useForm<ResetForm>({ resolver: zodResolver(resetSchema) });

  const onSendOTP = async (data: EmailForm) => {
    try {
      setError('');
      await api.post('/auth/forgot-password', { email: data.email });
      setEmail(data.email);
      resetForm.setValue('email', data.email);
      setStep('reset');
      toast.success('Reset code sent to email!');
    } catch (err) {
      const errorMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to send reset code';
      setError(errorMsg);
      toast.error('Failed to send reset code.');
    }
  };

  const onReset = async (data: ResetForm) => {
    try {
      setError('');
      await api.post('/auth/reset-password', data);
      setStep('done');
      toast.success('Password updated successfully!');
    } catch (err) {
      const errorMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Reset failed';
      setError(errorMsg);
      toast.error('Reset failed.');
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-8 transition-colors duration-300 ${
      isDarkMode ? 'bg-[#040716] text-white' : 'bg-[#fafbfe] text-slate-900'
    }`}>
      {/* Glow Rings */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-scale-in">
        <Link 
          to="/login" 
          className={`inline-flex items-center gap-2 text-xs font-bold mb-8 transition-all hover:translate-x-[-2px] ${
            isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <ArrowLeft size={14} /> 
          <span>Back to login</span>
        </Link>

        {step === 'email' && (
          <div className={`p-6 sm:p-8 rounded-3xl border ${
            isDarkMode ? 'bg-slate-900/25 border-slate-850' : 'bg-white border-slate-100 shadow-xl shadow-slate-100/50'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6">
              <KeyRound className="text-indigo-400" size={24} />
            </div>
            <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Forgot password?</h2>
            <p className={`text-xs mt-1.5 mb-6 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Enter your registered email and we will dispatch a 6-digit OTP code to verify your ownership.
            </p>

            {error && (
              <div className="mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={emailForm.handleSubmit(onSendOTP)} className="space-y-5">
              <Input 
                label="Email Address" 
                type="email" 
                placeholder="you@example.com" 
                icon={<Mail size={18} />}
                error={emailForm.formState.errors.email?.message} 
                {...emailForm.register('email')} 
              />
              <Button 
                type="submit" 
                size="lg" 
                className="w-full cursor-pointer shadow-lg shadow-indigo-500/10" 
                isLoading={emailForm.formState.isSubmitting}
              >
                Send reset code
              </Button>
            </form>
          </div>
        )}

        {step === 'reset' && (
          <div className={`p-6 sm:p-8 rounded-3xl border ${
            isDarkMode ? 'bg-slate-900/25 border-slate-850' : 'bg-white border-slate-100 shadow-xl shadow-slate-100/50'
          }`}>
            <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Enter reset code</h2>
            <p className={`text-xs mt-1.5 mb-6 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-550'}`}>
              We sent a 6-digit verification code to <span className="text-indigo-550 font-bold">{email}</span>
            </p>

            {error && (
              <div className="mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={resetForm.handleSubmit(onReset)} className="space-y-5">
              <Input 
                label="6-digit OTP" 
                type="text" 
                placeholder="123456" 
                maxLength={6}
                error={resetForm.formState.errors.otp?.message} 
                {...resetForm.register('otp')} 
              />
              <Input 
                label="New password" 
                type="password" 
                placeholder="••••••••" 
                icon={<Lock size={18} />}
                error={resetForm.formState.errors.newPassword?.message} 
                {...resetForm.register('newPassword')} 
              />
              <Button 
                type="submit" 
                size="lg" 
                className="w-full cursor-pointer shadow-lg shadow-indigo-500/10" 
                isLoading={resetForm.formState.isSubmitting}
              >
                Reset password
              </Button>
            </form>
          </div>
        )}

        {step === 'done' && (
          <div className={`p-8 rounded-3xl border text-center ${
            isDarkMode ? 'bg-slate-900/25 border-slate-850' : 'bg-white border-slate-100 shadow-xl shadow-slate-100/50'
          }`}>
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
              <span className="text-emerald-450 text-xl font-bold">✓</span>
            </div>
            <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Password reset!</h2>
            <p className={`text-xs mt-1.5 mb-6 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Your credentials have been successfully updated. You can now sign in using your new password.
            </p>
            <Link to="/login" className="block">
              <Button size="lg" className="w-full cursor-pointer">Go to login</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
