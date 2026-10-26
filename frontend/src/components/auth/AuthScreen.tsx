import React, { FormEvent, useState } from 'react';
import { ArrowRight, Cpu, LockKeyhole, Mail, UserRound } from 'lucide-react';
import type { AuthSession } from '../../types';
import { ApiError, login, signup } from '../../services/api';

interface AuthScreenProps {
  onAuthenticated: (session: AuthSession) => void;
}

type AuthMode = 'login' | 'signup';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === 'signup';

  const switchMode = (nextMode: AuthMode) => {
    if (isSubmitting) return;
    setMode(nextMode);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }
    if (isSignup && !name.trim()) {
      setError('Enter your name to create an account.');
      return;
    }
    if (isSignup && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const session = isSignup
        ? await signup({ email: normalizedEmail, name: name.trim(), password })
        : await login({ email: normalizedEmail, password });
      onAuthenticated(session);
    } catch (cause) {
      const message = cause instanceof ApiError
        ? cause.message
        : cause instanceof Error
          ? cause.message
          : 'Authentication failed. Try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestLogin = () => {
    const guestSession: AuthSession = {
      access_token: 'guest-offline-token',
      token_type: 'bearer',
      user: {
        id: 'guest-learner',
        email: 'guest@enginx.local',
        name: 'Guest Engineer',
        primary_role: 'ECE',
        branch: 'ECE',
        specialization: 'VLSI & Embedded',
        degree: 'B.Tech',
        year: 3,
        goal: 'Explore EnginX Platform',
        weekly_hours: 8,
        avatar_url: null,
        xp: 0,
        streak_days: 1,
        created_at: new Date().toISOString(),
      },
    };
    try {
      localStorage.setItem('enginx.auth.session', JSON.stringify(guestSession));
    } catch {
      // Best-effort storage
    }
    onAuthenticated(guestSession);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-enginx-canvas px-4 py-8 text-slate-900 sm:px-6">
      <section className="surface-card w-full max-w-md p-5 sm:p-7" aria-labelledby="auth-title">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 text-enginx-primary">
            <Cpu className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="eyebrow mt-4">EnginX</p>
          <h1 id="auth-title" className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            {isSignup ? 'Create your account' : 'Sign in to EnginX'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {isSignup ? 'Save your roadmap, verified progress, and challenge history.' : 'Sign in to access your saved engineering workspace.'}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            role="tab"
            aria-selected={!isSignup}
            onClick={() => switchMode('login')}
            className={`focus-ring min-h-[42px] rounded-lg text-sm font-bold transition-colors ${!isSignup ? 'bg-white text-teal-800 ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isSignup}
            onClick={() => switchMode('signup')}
            className={`focus-ring min-h-[42px] rounded-lg text-sm font-bold transition-colors ${isSignup ? 'bg-white text-teal-800 ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Create account
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          {isSignup && (
            <div>
              <label htmlFor="auth-name" className="mb-2 block text-sm font-semibold text-slate-800">Full name</label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  disabled={isSubmitting}
                  className="focus-ring min-h-[46px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 hover:border-teal-300"
                  placeholder="Alex Rivera"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="mb-2 block text-sm font-semibold text-slate-800">Email address</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                disabled={isSubmitting}
                className="focus-ring min-h-[46px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 hover:border-teal-300"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="auth-password" className="mb-2 block text-sm font-semibold text-slate-800">Password</label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                disabled={isSubmitting}
                className="focus-ring min-h-[46px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 hover:border-teal-300"
                placeholder="At least 8 characters"
              />
            </div>
          </div>

          {isSignup && (
            <div>
              <label htmlFor="auth-confirm-password" className="mb-2 block text-sm font-semibold text-slate-800">Confirm password</label>
              <input
                id="auth-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                disabled={isSubmitting}
                className="focus-ring min-h-[46px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 hover:border-teal-300"
                placeholder="Repeat your password"
              />
            </div>
          )}

          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-5 text-rose-800" role="alert" aria-live="assertive">{error}</div>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-charge focus-ring flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-enginx-cta bg-enginx-cta px-4 text-sm font-semibold text-white hover:border-amber-700 hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            <span>{isSignup ? 'Create account' : 'Sign in'}</span>
          </button>

          <div className="relative my-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative bg-white px-3 text-xs uppercase tracking-wider text-slate-400">
              or
            </div>
          </div>

          <button
            type="button"
            onClick={handleGuestLogin}
            className="focus-ring flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 text-sm font-bold text-teal-900 transition hover:bg-teal-100"
          >
            <span>Continue as Guest (Explore Offline)</span>
          </button>
        </form>

        <p className="mt-5 text-center text-xs leading-5 text-slate-500">
          Your session is stored locally in this browser and sent to the API as a bearer token. Sign out to remove it.
        </p>
      </section>
    </main>
  );
};
