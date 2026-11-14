import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseMedical,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  MailCheck,
  Shield,
  UserCheck,
} from 'lucide-react';
import type { ActiveRoute, AuthUser } from '../types';
import { apiFetch, setStoredToken } from '../lib/api';
import { BrandLogo } from './BrandLogo';

interface AuthPortalsProps {
  mode: 'portal-select' | 'member-auth' | 'advisor-auth' | 'admin-auth' | 'verify-email' | 'reset-password';
  token?: string;
  onAuthenticated: (user: AuthUser) => void;
  onNavigate: (route: ActiveRoute) => void;
}

export const AuthPortals: React.FC<AuthPortalsProps> = ({
  mode,
  token,
  onAuthenticated,
  onNavigate,
}) => {
  const [subTab, setSubTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Member fields
  const [memberLogin, setMemberLogin] = useState({ email: '', phone: '', password: '' });
  const [memberReg, setMemberReg] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    consentPrivacy: true,
    consentGenomic: true,
    consentMarketing: false,
  });

  // Advisor fields
  const [advisorLogin, setAdvisorLogin] = useState({ email: '', phone: '', password: '' });
  const [advisorReg, setAdvisorReg] = useState({
    fullName: '',
    email: '',
    phone: '',
    specialization: '',
    password: '',
    confirmPassword: '',
  });

  // Admin fields
  const [adminLogin, setAdminLogin] = useState({ email: '', password: '' });
  const [adminChallengeToken, setAdminChallengeToken] = useState<string | null>(null);
  const [admin2faCode, setAdmin2faCode] = useState('');

  // Forgot & Reset fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetPasswords, setResetPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [verifyDone, setVerifyDone] = useState(false);

  const isEmailFormatValid = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  const isPhoneFormatValid = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed || /[a-zA-Z]/.test(trimmed)) return false;
    const digits = trimmed.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  };

  const resetMessages = () => {
    setError(null);
    setNotice(null);
  };

  const switchSubTab = (next: 'login' | 'register' | 'forgot') => {
    resetMessages();
    setShowPassword(false);
    setShowConfirmPassword(false);
    setSubTab(next);
  };

  const validateLoginInputs = (email: string, phone: string, password: string): string | null => {
    const hasEmail = email.trim().length > 0;
    const hasPhone = phone.trim().length > 0;
    if (!hasEmail && !hasPhone) {
      return 'Please enter either your registered Email Address or Phone Number.';
    }
    if (hasEmail && !isEmailFormatValid(email)) {
      return 'Please enter a valid email address.';
    }
    if (hasPhone && !isPhoneFormatValid(phone)) {
      return 'Please enter a valid phone number (10 to 15 digits).';
    }
    if (!password) {
      return 'Please enter your password.';
    }
    return null;
  };

  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    const validationError = validateLoginInputs(memberLogin.email, memberLogin.phone, memberLogin.password);
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<{ user: AuthUser; sessionToken: string }>('/api/auth/member/login', {
        method: 'POST',
        body: JSON.stringify({
          email: memberLogin.email.trim(),
          phone: memberLogin.phone.trim(),
          password: memberLogin.password,
        }),
      });
      setStoredToken(res.sessionToken);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Member login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleMemberRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (memberReg.fullName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!isEmailFormatValid(memberReg.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!isPhoneFormatValid(memberReg.phone)) {
      setError('Please enter a valid phone number (10 to 15 digits).');
      return;
    }
    if (memberReg.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (memberReg.password !== memberReg.confirmPassword) {
      setError('Password and Confirm Password do not match.');
      return;
    }
    if (!memberReg.consentPrivacy || !memberReg.consentGenomic) {
      setError('Privacy Policy and Genomic Data Processing consent under the DPDP Act are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<{ user: AuthUser; sessionToken: string; message: string }>(
        '/api/auth/member/register',
        {
          method: 'POST',
          body: JSON.stringify(memberReg),
        }
      );
      setStoredToken(res.sessionToken);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Member registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvisorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    const validationError = validateLoginInputs(advisorLogin.email, advisorLogin.phone, advisorLogin.password);
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<{ user: AuthUser; sessionToken: string }>('/api/auth/advisor/login', {
        method: 'POST',
        body: JSON.stringify({
          email: advisorLogin.email.trim(),
          phone: advisorLogin.phone.trim(),
          password: advisorLogin.password,
        }),
      });
      setStoredToken(res.sessionToken);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Advisor login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvisorRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (advisorReg.fullName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!isEmailFormatValid(advisorReg.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!isPhoneFormatValid(advisorReg.phone)) {
      setError('Please enter a valid phone number (10 to 15 digits).');
      return;
    }
    if (advisorReg.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (advisorReg.password !== advisorReg.confirmPassword) {
      setError('Password and Confirm Password do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/advisor/register', {
        method: 'POST',
        body: JSON.stringify(advisorReg),
      });
      setNotice(res.message);
      setAdvisorReg({
        fullName: '',
        email: '',
        phone: '',
        specialization: '',
        password: '',
        confirmPassword: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Advisor registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const res = await apiFetch<{
        user?: AuthUser;
        sessionToken?: string;
        requires2FA?: boolean;
        challengeToken?: string;
      }>('/api/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify(adminLogin),
      });
      if (res.requires2FA && res.challengeToken) {
        setAdminChallengeToken(res.challengeToken);
        setNotice('Enter the 6-digit verification code from your authenticator app.');
        return;
      }
      if (res.user && res.sessionToken) {
        setStoredToken(res.sessionToken);
        onAuthenticated(res.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Administrator login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminChallengeToken) return;
    resetMessages();
    setLoading(true);
    try {
      const res = await apiFetch<{ user: AuthUser; sessionToken: string }>('/api/auth/admin/verify-2fa', {
        method: 'POST',
        body: JSON.stringify({ challengeToken: adminChallengeToken, code: admin2faCode }),
      });
      setStoredToken(res.sessionToken);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : '2FA verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (accountType: 'member' | 'advisor', e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: forgotEmail, accountType }),
      });
      setNotice(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!token) return;
    resetMessages();
    setLoading(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      setNotice(res.message);
      setVerifyDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    resetMessages();
    setLoading(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, ...resetPasswords }),
      });
      setNotice(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-[82vh] bg-white py-12 sm:py-16 overflow-hidden">
      {/* Subtle scientific DNA decorative graphic */}
      <svg
        className="pointer-events-none absolute -right-24 top-10 w-96 h-96 text-teal-600/[0.04]"
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden="true"
      >
        <path d="M50 10C50 60 150 70 150 100C150 130 50 140 50 190" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
        <path d="M150 10C150 60 50 70 50 100C50 130 150 140 150 190" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
      </svg>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="flex items-center justify-between mb-8">
          <button
            type="button"
            onClick={() => onNavigate({ page: 'home' })}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#0B2246] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to DNA GENEIE</span>
          </button>
          <BrandLogo showTagline size="sm" />
        </div>

        {/* TWO-PORTAL SELECTOR */}
        {mode === 'portal-select' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-8"
          >
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <p className="text-xs font-semibold text-[#0D9488] tracking-wide">Secure Account Access</p>
              <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-[#0B2246]">
                Choose Your DNA GENEIE Portal
              </h1>
              <p className="text-sm sm:text-base text-slate-600">
                Member and Advisor portals operate with strict role separation and encrypted account protection.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 rounded-2xl border border-slate-200 bg-white hover:border-[#0D9488] transition-colors flex flex-col justify-between shadow-xs">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl dna-gradient-bg text-white flex items-center justify-center">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-display font-bold text-[#0B2246]">Member Portal</h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    For DNA testing customers. Sign in or register to track test kit shipping, register your kit barcode, view verified genetic reports, and manage orders.
                  </p>
                  <ul className="text-xs text-slate-600 space-y-1.5 pt-2">
                    <li>· Order tracking & payment history</li>
                    <li>· DNA kit barcode registration</li>
                    <li>· Private access to your verified DNA reports</li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    switchSubTab('login');
                    onNavigate({ page: 'member-auth' });
                  }}
                  className="mt-8 w-full py-3.5 px-5 rounded-xl dna-gradient-bg text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-95 cursor-pointer"
                >
                  <span>Continue to Member Login</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="p-8 rounded-2xl border border-slate-200 bg-slate-50/50 hover:border-[#0B2246] transition-colors flex flex-col justify-between shadow-xs">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0B2246] text-white flex items-center justify-center">
                    <BriefcaseMedical className="w-6 h-6 text-teal-300" />
                  </div>
                  <h2 className="text-2xl font-display font-bold text-[#0B2246]">Advisor Portal</h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    For certified clinical wellness and genomics advisors. Manage assigned customer enquiries, client consultations, and assigned order statuses.
                  </p>
                  <ul className="text-xs text-slate-600 space-y-1.5 pt-2">
                    <li>· Advisor registration (subject to admin approval)</li>
                    <li>· Assigned customer enquiries & follow-up notes</li>
                    <li>· Authorized client registration overview</li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    switchSubTab('login');
                    onNavigate({ page: 'advisor-auth' });
                  }}
                  className="mt-8 w-full py-3.5 px-5 rounded-xl bg-[#0B2246] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#133366] cursor-pointer"
                >
                  <span>Continue to Advisor Login</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => onNavigate({ page: 'admin-auth' })}
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#0B2246] cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Website Owner & Administrator Sign In</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* MEMBER AUTH PORTAL */}
        {mode === 'member-auth' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6"
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-semibold text-[#0D9488]">Member Portal</p>
                <h1 className="text-2xl font-display font-bold text-[#0B2246] mt-0.5">
                  {subTab === 'login'
                    ? 'Member Sign In'
                    : subTab === 'register'
                      ? 'Create Member Account'
                      : 'Member Password Reset'}
                </h1>
              </div>
              <button
                type="button"
                onClick={() => onNavigate({ page: 'advisor-auth' })}
                className="text-xs font-semibold text-[#0B2246] hover:text-[#0D9488] underline cursor-pointer whitespace-nowrap"
              >
                Switch to Advisor
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => switchSubTab('login')}
                className={`py-2 rounded-lg transition-colors cursor-pointer ${
                  subTab === 'login' ? 'bg-white text-[#0B2246] shadow-xs' : 'text-slate-600'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchSubTab('register')}
                className={`py-2 rounded-lg transition-colors cursor-pointer ${
                  subTab === 'register' ? 'bg-white text-[#0B2246] shadow-xs' : 'text-slate-600'
                }`}
              >
                Register
              </button>
              <button
                type="button"
                onClick={() => switchSubTab('forgot')}
                className={`py-2 rounded-lg transition-colors cursor-pointer ${
                  subTab === 'forgot' ? 'bg-white text-[#0B2246] shadow-xs' : 'text-slate-600'
                }`}
              >
                Forgot Password
              </button>
            </div>

            {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">{error}</div>}
            {notice && <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-sm text-teal-800">{notice}</div>}

            {subTab === 'login' && (
              <form onSubmit={handleMemberLogin} noValidate className="space-y-4">
                <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                  Sign in using <strong className="text-[#0B2246]">either</strong> your registered Email Address{' '}
                  <strong className="text-[#0B2246]">or</strong> your registered Phone Number together with your password.
                </p>
                <div>
                  <label htmlFor="member-login-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    id="member-login-email"
                    type="email"
                    value={memberLogin.email}
                    onChange={(e) => setMemberLogin((s) => ({ ...s, email: e.target.value }))}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div className="relative flex items-center py-0.5">
                  <div className="flex-grow border-t border-slate-200" />
                  <span className="shrink mx-3 text-[11px] font-semibold text-slate-400">OR</span>
                  <div className="flex-grow border-t border-slate-200" />
                </div>
                <div>
                  <label htmlFor="member-login-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    id="member-login-phone"
                    type="tel"
                    value={memberLogin.phone}
                    onChange={(e) => setMemberLogin((s) => ({ ...s, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="member-login-password" className="block text-xs font-semibold text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => switchSubTab('forgot')}
                      className="text-xs font-semibold text-[#0D9488] hover:text-[#0B2246] cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="member-login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={memberLogin.password}
                      onChange={(e) => setMemberLogin((s) => ({ ...s, password: e.target.value }))}
                      placeholder="Enter your password"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl dna-gradient-bg text-white text-sm font-semibold hover:opacity-95 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? 'Signing In...' : 'Login to Member Portal'}
                </button>
                <div className="pt-2 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={() => switchSubTab('register')}
                    className="text-xs font-semibold text-[#0B2246] hover:text-[#0D9488] cursor-pointer"
                  >
                    New to DNA GENEIE? <span className="underline">Create New Account</span>
                  </button>
                </div>
              </form>
            )}

            {subTab === 'register' && (
              <form onSubmit={handleMemberRegister} noValidate className="space-y-4">
                <div>
                  <label htmlFor="member-reg-fullname" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Name
                  </label>
                  <input
                    id="member-reg-fullname"
                    type="text"
                    required
                    value={memberReg.fullName}
                    onChange={(e) => setMemberReg((s) => ({ ...s, fullName: e.target.value }))}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="member-reg-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email Address
                    </label>
                    <input
                      id="member-reg-email"
                      type="email"
                      required
                      value={memberReg.email}
                      onChange={(e) => setMemberReg((s) => ({ ...s, email: e.target.value }))}
                      placeholder="you@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                    />
                  </div>
                  <div>
                    <label htmlFor="member-reg-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      id="member-reg-phone"
                      type="tel"
                      required
                      value={memberReg.phone}
                      onChange={(e) => setMemberReg((s) => ({ ...s, phone: e.target.value }))}
                      placeholder="+91 98765 43210"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="member-reg-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Password (8+ chars)
                    </label>
                    <div className="relative">
                      <input
                        id="member-reg-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={memberReg.password}
                        onChange={(e) => setMemberReg((s) => ({ ...s, password: e.target.value }))}
                        placeholder="Minimum 8 characters"
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="member-reg-confirm" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        id="member-reg-confirm"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={memberReg.confirmPassword}
                        onChange={(e) => setMemberReg((s) => ({ ...s, confirmPassword: e.target.value }))}
                        placeholder="Re-enter password"
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={memberReg.consentPrivacy}
                      onChange={(e) => setMemberReg((s) => ({ ...s, consentPrivacy: e.target.checked }))}
                      className="mt-0.5 rounded border-slate-300 text-[#0D9488]"
                    />
                    <span>
                      I consent to the DNA GENEIE DPDP Privacy Notice for personal account & order processing (Required).
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={memberReg.consentGenomic}
                      onChange={(e) => setMemberReg((s) => ({ ...s, consentGenomic: e.target.checked }))}
                      className="mt-0.5 rounded border-slate-300 text-[#0D9488]"
                    />
                    <span>
                      I explicitly consent to encrypted processing of my DNA kit & genomic wellness reports (Required).
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={memberReg.consentMarketing}
                      onChange={(e) => setMemberReg((s) => ({ ...s, consentMarketing: e.target.checked }))}
                      className="mt-0.5 rounded border-slate-300 text-[#0D9488]"
                    />
                    <span>
                      Send me panel launch updates (including DermaG availability) and clinical offers (Optional).
                    </span>
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl dna-gradient-bg text-white text-sm font-semibold hover:opacity-95 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? 'Creating Member Account...' : 'Create New Member Account'}
                </button>
                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => switchSubTab('login')}
                    className="text-xs font-semibold text-slate-600 hover:text-[#0B2246] cursor-pointer"
                  >
                    Already have a Member account? <span className="underline">Login here</span>
                  </button>
                </div>
              </form>
            )}

            {subTab === 'forgot' && (
              <form onSubmit={(e) => handleForgotPassword('member', e)} className="space-y-4">
                <p className="text-xs text-slate-600">
                  Enter your registered Member email address to receive password reset instructions.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Registered Email Address</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl dna-gradient-bg text-white text-sm font-semibold hover:opacity-95 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? 'Sending Reset Request...' : 'Request Password Reset'}
                </button>
              </form>
            )}
          </motion.div>
        )}

        {/* ADVISOR AUTH PORTAL */}
        {mode === 'advisor-auth' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6"
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-semibold text-[#0B2246]">Advisor Portal</p>
                <h1 className="text-2xl font-display font-bold text-[#0B2246] mt-0.5">
                  {subTab === 'login'
                    ? 'Advisor Sign In'
                    : subTab === 'register'
                      ? 'Advisor Registration'
                      : 'Advisor Password Reset'}
                </h1>
              </div>
              <button
                type="button"
                onClick={() => onNavigate({ page: 'member-auth' })}
                className="text-xs font-semibold text-[#0D9488] hover:text-[#0B2246] underline cursor-pointer whitespace-nowrap"
              >
                Switch to Member
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => switchSubTab('login')}
                className={`py-2 rounded-lg transition-colors cursor-pointer ${
                  subTab === 'login' ? 'bg-white text-[#0B2246] shadow-xs' : 'text-slate-600'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchSubTab('register')}
                className={`py-2 rounded-lg transition-colors cursor-pointer ${
                  subTab === 'register' ? 'bg-white text-[#0B2246] shadow-xs' : 'text-slate-600'
                }`}
              >
                Request Access
              </button>
              <button
                type="button"
                onClick={() => switchSubTab('forgot')}
                className={`py-2 rounded-lg transition-colors cursor-pointer ${
                  subTab === 'forgot' ? 'bg-white text-[#0B2246] shadow-xs' : 'text-slate-600'
                }`}
              >
                Forgot Password
              </button>
            </div>

            {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">{error}</div>}
            {notice && <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-sm text-teal-800">{notice}</div>}

            {subTab === 'login' && (
              <form onSubmit={handleAdvisorLogin} noValidate className="space-y-4">
                <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                  Sign in using <strong className="text-[#0B2246]">either</strong> your registered Advisor Email Address{' '}
                  <strong className="text-[#0B2246]">or</strong> your registered Phone Number together with your password.
                </p>
                <div>
                  <label htmlFor="advisor-login-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    id="advisor-login-email"
                    type="email"
                    value={advisorLogin.email}
                    onChange={(e) => setAdvisorLogin((s) => ({ ...s, email: e.target.value }))}
                    placeholder="advisor@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2246]"
                  />
                </div>
                <div className="relative flex items-center py-0.5">
                  <div className="flex-grow border-t border-slate-200" />
                  <span className="shrink mx-3 text-[11px] font-semibold text-slate-400">OR</span>
                  <div className="flex-grow border-t border-slate-200" />
                </div>
                <div>
                  <label htmlFor="advisor-login-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    id="advisor-login-phone"
                    type="tel"
                    value={advisorLogin.phone}
                    onChange={(e) => setAdvisorLogin((s) => ({ ...s, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2246]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="advisor-login-password" className="block text-xs font-semibold text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => switchSubTab('forgot')}
                      className="text-xs font-semibold text-[#0D9488] hover:text-[#0B2246] cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="advisor-login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={advisorLogin.password}
                      onChange={(e) => setAdvisorLogin((s) => ({ ...s, password: e.target.value }))}
                      placeholder="Enter your password"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2246]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[#0B2246] text-white text-sm font-semibold hover:bg-[#133366] disabled:opacity-60 cursor-pointer"
                >
                  {loading ? 'Signing In...' : 'Login to Advisor Portal'}
                </button>
                <div className="pt-2 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={() => switchSubTab('register')}
                    className="text-xs font-semibold text-[#0B2246] hover:text-[#0D9488] cursor-pointer"
                  >
                    New Clinical Advisor? <span className="underline">Create New Account</span>
                  </button>
                </div>
              </form>
            )}

            {subTab === 'register' && (
              <form onSubmit={handleAdvisorRegister} noValidate className="space-y-4">
                <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  New Advisor registrations are reviewed and approved by the DNA GENEIE Administrator before portal login is enabled.
                </p>
                <div>
                  <label htmlFor="advisor-reg-fullname" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Name
                  </label>
                  <input
                    id="advisor-reg-fullname"
                    type="text"
                    required
                    value={advisorReg.fullName}
                    onChange={(e) => setAdvisorReg((s) => ({ ...s, fullName: e.target.value }))}
                    placeholder="e.g. Dr. Meera Nair"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2246]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="advisor-reg-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email Address
                    </label>
                    <input
                      id="advisor-reg-email"
                      type="email"
                      required
                      value={advisorReg.email}
                      onChange={(e) => setAdvisorReg((s) => ({ ...s, email: e.target.value }))}
                      placeholder="advisor@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2246]"
                    />
                  </div>
                  <div>
                    <label htmlFor="advisor-reg-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      id="advisor-reg-phone"
                      type="tel"
                      required
                      value={advisorReg.phone}
                      onChange={(e) => setAdvisorReg((s) => ({ ...s, phone: e.target.value }))}
                      placeholder="+91 98765 43210"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2246]"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="advisor-reg-spec" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Clinical / Wellness Specialization
                  </label>
                  <input
                    id="advisor-reg-spec"
                    type="text"
                    value={advisorReg.specialization}
                    onChange={(e) => setAdvisorReg((s) => ({ ...s, specialization: e.target.value }))}
                    placeholder="e.g. Nutrigenomics, Sports Medicine, Clinical Dietetics"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2246]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="advisor-reg-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Password (8+ chars)
                    </label>
                    <div className="relative">
                      <input
                        id="advisor-reg-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={advisorReg.password}
                        onChange={(e) => setAdvisorReg((s) => ({ ...s, password: e.target.value }))}
                        placeholder="Minimum 8 characters"
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2246]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="advisor-reg-confirm" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        id="advisor-reg-confirm"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={advisorReg.confirmPassword}
                        onChange={(e) => setAdvisorReg((s) => ({ ...s, confirmPassword: e.target.value }))}
                        placeholder="Re-enter password"
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2246]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[#0B2246] text-white text-sm font-semibold hover:bg-[#133366] disabled:opacity-60 cursor-pointer"
                >
                  {loading ? 'Submitting Request...' : 'Create New Advisor Account'}
                </button>
                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => switchSubTab('login')}
                    className="text-xs font-semibold text-slate-600 hover:text-[#0B2246] cursor-pointer"
                  >
                    Already registered as an Advisor? <span className="underline">Login here</span>
                  </button>
                </div>
              </form>
            )}

            {subTab === 'forgot' && (
              <form onSubmit={(e) => handleForgotPassword('advisor', e)} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Registered Advisor Email</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[#0B2246] text-white text-sm font-semibold hover:bg-[#133366] disabled:opacity-60 cursor-pointer"
                >
                  {loading ? 'Sending Reset Request...' : 'Request Advisor Password Reset'}
                </button>
              </form>
            )}
          </motion.div>
        )}

        {/* ADMIN AUTH PORTAL */}
        {mode === 'admin-auth' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6"
          >
            <div className="space-y-1">
              <div className="w-10 h-10 rounded-xl bg-[#0B2246] text-teal-300 flex items-center justify-center mb-3">
                <Lock className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-[#0D9488]">Authorized Owner Console</p>
              <h1 className="text-2xl font-display font-bold text-[#0B2246]">Owner Administrator Sign In</h1>
              <p className="text-xs text-slate-500">
                Server-enforced access restricted solely to support@dnageneie.com.
              </p>
            </div>

            {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">{error}</div>}
            {notice && <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-sm text-teal-800">{notice}</div>}

            {!adminChallengeToken ? (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label htmlFor="admin-login-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Official Administrator Email
                  </label>
                  <input
                    id="admin-login-email"
                    type="email"
                    required
                    placeholder="support@dnageneie.com"
                    value={adminLogin.email}
                    onChange={(e) => setAdminLogin((s) => ({ ...s, email: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2246]"
                  />
                </div>
                <div>
                  <label htmlFor="admin-login-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="admin-login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={adminLogin.password}
                      onChange={(e) => setAdminLogin((s) => ({ ...s, password: e.target.value }))}
                      placeholder="Enter administrator password"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2246]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[#0B2246] text-white text-sm font-semibold hover:bg-[#133366] disabled:opacity-60 cursor-pointer"
                >
                  {loading ? 'Authenticating...' : 'Sign In to Owner Console'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleAdminVerify2FA} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    6-Digit Authenticator (2FA) Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={admin2faCode}
                    onChange={(e) => setAdmin2faCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-center font-mono text-lg tracking-[0.4em]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || admin2faCode.length !== 6}
                  className="w-full py-3 rounded-xl dna-gradient-bg text-white text-sm font-semibold disabled:opacity-60 cursor-pointer"
                >
                  {loading ? 'Verifying 2FA...' : 'Verify & Open Owner Console'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdminChallengeToken(null);
                    setAdmin2faCode('');
                    resetMessages();
                  }}
                  className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-[#0B2246] cursor-pointer"
                >
                  Back to Owner Password Sign In
                </button>
              </form>
            )}
          </motion.div>
        )}

        {/* EMAIL VERIFICATION VIEW */}
        {mode === 'verify-email' && (
          <div className="max-w-md mx-auto rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-5">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-[#0D9488] flex items-center justify-center mx-auto">
              {verifyDone ? <CheckCircle2 className="w-6 h-6" /> : <MailCheck className="w-6 h-6" />}
            </div>
            <h1 className="text-2xl font-display font-bold text-[#0B2246]">Email Verification</h1>
            {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>}
            {notice && <p className="text-sm text-teal-800 bg-teal-50 border border-teal-200 rounded-xl p-3">{notice}</p>}
            {!verifyDone && (
              <button
                type="button"
                disabled={loading}
                onClick={handleVerifyEmail}
                className="w-full py-3 rounded-xl dna-gradient-bg text-white text-sm font-semibold cursor-pointer"
              >
                {loading ? 'Verifying...' : 'Confirm Email Verification'}
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate({ page: 'portal-select' })}
              className="text-sm font-semibold text-[#0B2246] hover:underline cursor-pointer"
            >
              Proceed to Login Portals
            </button>
          </div>
        )}

        {/* RESET PASSWORD VIEW */}
        {mode === 'reset-password' && (
          <div className="max-w-md mx-auto rounded-2xl border border-slate-200 bg-white p-8 space-y-5">
            <div className="w-10 h-10 rounded-xl bg-[#0B2246] text-teal-300 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-display font-bold text-[#0B2246]">Set New Password</h1>
            {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>}
            {notice && <p className="text-sm text-teal-800 bg-teal-50 border border-teal-200 rounded-xl p-3">{notice}</p>}
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">New Password (8+ chars)</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={resetPasswords.newPassword}
                    onChange={(e) => setResetPasswords((s) => ({ ...s, newPassword: e.target.value }))}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={resetPasswords.confirmPassword}
                    onChange={(e) => setResetPasswords((s) => ({ ...s, confirmPassword: e.target.value }))}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl dna-gradient-bg text-white text-sm font-semibold cursor-pointer"
              >
                {loading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
};
