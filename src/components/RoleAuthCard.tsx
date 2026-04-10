'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { FirebaseError } from 'firebase/app';
import { useAuth, UserRole, getDashboardPath } from '@/context/AuthContext';

interface RoleAuthCardProps {
  role: UserRole;
}

const roleCopy: Record<UserRole, { title: string; subtitle: string; roleBadge: string; alternateHref: string; alternateText: string }> = {
  investor: {
    title: 'Investor Access Portal',
    subtitle: 'Sign in to analyze startups, manage voting power, and use FinScope AI intelligence.',
    roleBadge: 'Role: Investor',
    alternateHref: '/auth/startup',
    alternateText: 'Are you a startup? Go to startup login',
  },
  startup: {
    title: 'Startup Access Portal',
    subtitle: 'Sign in to create proposals, manage milestones, and operate your startup dashboard.',
    roleBadge: 'Role: Startup',
    alternateHref: '/auth/investor',
    alternateText: 'Are you an investor? Go to investor login',
  },
};

const mapFirebaseError = (error: unknown) => {
  if (!(error instanceof FirebaseError)) {
    return 'Authentication failed. Please try again.';
  }

  switch (error.code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'This email is already registered. Try login instead.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completion.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait and try again.';
    default:
      return error.message || 'Authentication failed. Please try again.';
  }
};

export function RoleAuthCard({ role }: RoleAuthCardProps) {
  const router = useRouter();
  const { currentUser, userRole, loginWithRole, signupWithRole, loginWithGoogleRole, loading } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = roleCopy[role];

  useEffect(() => {
    if (currentUser && userRole) {
      router.push(getDashboardPath(userRole));
    }
  }, [currentUser, userRole, router]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      if (mode === 'signup') {
        await signupWithRole(role, email.trim(), password);
      } else {
        await loginWithRole(role, email.trim(), password);
      }
      router.push(getDashboardPath(role));
    } catch (err) {
      setError(mapFirebaseError(err));
    }
  };

  const googleLogin = async () => {
    setError(null);
    try {
      await loginWithGoogleRole(role);
      router.push(getDashboardPath(role));
    } catch (err) {
      setError(mapFirebaseError(err));
    }
  };

  return (
    <section className="max-w-lg w-full mx-auto px-6 py-10">
      <div className="border border-slate-200 bg-white backdrop-blur-xl rounded-2xl p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#0284c7] mb-3">{copy.roleBadge}</p>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-2">{copy.title}</h1>
        <p className="text-sm text-slate-500 mb-8">{copy.subtitle}</p>

        <div className="flex gap-2 mb-6 bg-slate-50 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-md transition-colors ${
              mode === 'login' ? 'bg-[#0284c7]/15 text-[#0284c7]' : 'text-slate-500 hover:text-slate-700'
            }`}
            type="button"
          >
            Login
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-md transition-colors ${
              mode === 'signup' ? 'bg-[#0284c7]/15 text-[#0284c7]' : 'text-slate-500 hover:text-slate-700'
            }`}
            type="button"
          >
            Signup
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full bg-white border border-slate-200 focus:border-[#0284c7]/50 rounded-lg px-4 py-3 text-sm text-slate-900 outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                className="w-full bg-white border border-slate-200 focus:border-[#0284c7]/50 rounded-lg px-4 py-3 pr-12 text-sm text-slate-900 outline-none"
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword((previous) => !previous)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 border border-red-200 bg-red-50 px-3 py-2 rounded-md">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-xs font-black uppercase tracking-widest bg-[#0284c7] text-white rounded-lg hover:brightness-110 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Login'}
          </button>
        </form>

        <div className="my-5 h-px bg-slate-200" />

        <button
          onClick={googleLogin}
          disabled={loading}
          className="w-full py-3 text-xs font-bold uppercase tracking-widest bg-transparent border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Continue with Google
        </button>

        <div className="mt-6 flex items-center justify-between text-xs">
          <Link href="/" className="text-slate-500 hover:text-slate-700 transition-colors">Back to landing</Link>
          <Link href={copy.alternateHref} className="text-[#0284c7] hover:text-sky-700 transition-colors">{copy.alternateText}</Link>
        </div>
      </div>
    </section>
  );
}
