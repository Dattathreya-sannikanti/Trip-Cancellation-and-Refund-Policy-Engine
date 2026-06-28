import { useState, useEffect } from 'react';
import { Lock, ArrowRight, Eye, EyeOff, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from './services/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  // Password validation rules
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isMatch = password === confirmPassword && password.length > 0;
  
  const isValid = hasMinLength && hasUppercase && hasNumber && isMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || !token) return;

    setIsSubmitting(true);
    setError('');
    
    try {
      await authService.resetPassword(token, password);
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password. The link might be expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-200">
        <div className="w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/50 dark:border-slate-800/50 rounded-3xl shadow-2xl p-8 text-center animate-fade-in-up">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Invalid Request</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">No reset token was provided in the URL.</p>
          <Link to="/forgot-password" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-xl transition-all shadow-md">
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-200">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 dark:bg-blue-600/10 blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/20 dark:bg-purple-600/10 blur-3xl"></div>
      </div>

      <div className="w-full max-w-md z-10 animate-fade-in-up">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/50 dark:border-slate-800/50 rounded-3xl shadow-2xl overflow-hidden p-8">
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Set New Password</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Please enter your new password below.
            </p>
          </div>

          {isSuccess ? (
            <div className="text-center animate-fade-in">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Password Updated!</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Your password has been successfully reset. Redirecting to login...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm flex items-start gap-2 animate-fade-in">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">Reset Failed</p>
                    <p className="mt-0.5">{error}</p>
                    <Link to="/forgot-password" className="inline-block mt-2 font-semibold hover:underline">Request a new link</Link>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-white/50 dark:bg-slate-800/50 border border-slate-300/70 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                      placeholder="••••••••"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-white/50 dark:bg-slate-800/50 border border-slate-300/70 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 text-xs space-y-2">
                <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Password must contain:</p>
                <div className={`flex items-center gap-2 ${hasMinLength ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  <CheckCircle className="w-3.5 h-3.5" /> At least 8 characters
                </div>
                <div className={`flex items-center gap-2 ${hasUppercase ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  <CheckCircle className="w-3.5 h-3.5" /> One uppercase letter
                </div>
                <div className={`flex items-center gap-2 ${hasNumber ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  <CheckCircle className="w-3.5 h-3.5" /> One number
                </div>
                <div className={`flex items-center gap-2 ${confirmPassword && isMatch ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  <CheckCircle className="w-3.5 h-3.5" /> Passwords match
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !isValid}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
              >
                {isSubmitting ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    Update Password
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
