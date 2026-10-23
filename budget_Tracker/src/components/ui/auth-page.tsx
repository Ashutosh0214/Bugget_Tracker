import SocialLoginButtons from '@/components/SocialLoginButtons';
import { Link } from 'react-router-dom';
import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import { motion } from 'framer-motion';
import { Button } from './button';
import { Input } from './input';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api';
import {
  Wallet,
  AtSignIcon,
  ChevronLeftIcon,
  LockIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export interface AuthPageProps {
  initialMode?: 'signin' | 'signup' | 'login';
  onBackToHome?: () => void;
  onSuccess?: () => void;
  onRequestSignup?: () => void;
}

export function AuthPage({ initialMode = 'signin', onBackToHome, onSuccess, onRequestSignup }: AuthPageProps) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode === 'signup' ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const loginPending = useRef(false);

  useEffect(() => {
    setMode(initialMode === 'signup' ? 'signup' : 'signin');
  }, [initialMode]);

  const submitLogin = async (loginEmail: string, loginPassword: string) => {
    // State updates are asynchronous; the ref also guards same-tick submissions.
    if (loginPending.current) return;
    loginPending.current = true;
    setErrorMsg('');
    setIsSuccess(false);
    setIsLoading(true);

    try {
      await login(loginEmail, loginPassword);
      setErrorMsg('');
      setIsSuccess(true);
      onSuccess?.();
    } catch (error: unknown) {
      setIsSuccess(false);
      setErrorMsg(error instanceof ApiError && error.status === 401
        ? 'Invalid email or password'
        : error instanceof TypeError
          ? 'Unable to reach the server. Please try again.'
          : error instanceof Error ? error.message : 'Login failed. Please try again.');
    } finally {
      loginPending.current = false;
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signin' && (loginPending.current || isSuccess)) return;
    setErrorMsg('');

    if (!email || !password || (mode === 'signup' && !name)) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    if (mode === 'signin') {
      await submitLogin(email, password);
      return;
    }

    setIsLoading(true);

    try {
      await signup(name, email, password);
      setIsLoading(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        if (onSuccess) onSuccess();
      }, 900);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Authentication failed. Please check credentials.');
    }
  };

  const errorBanner = errorMsg && (
    <div role="alert" className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20 animate-in fade-in">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{errorMsg}</span>
    </div>
  );

  return (
    <main className={cn(
      'relative lg:grid lg:grid-cols-2 bg-background text-foreground select-none',
      mode === 'signin' ? 'min-h-svh' : 'min-h-screen md:h-screen md:overflow-hidden'
    )}>
      
      {/* Left Column: Animated Gradient & Floating Paths Showcase */}
      {mode === 'signin' ? (
        <section className="relative isolate hidden min-h-svh overflow-hidden border-r border-white/10 bg-zinc-950 p-10 text-white lg:flex lg:flex-col">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(124,58,237,0.32),transparent_38%),radial-gradient(circle_at_80%_80%,rgba(79,70,229,0.24),transparent_42%)]" />
          <div className="relative z-10 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-600 shadow-lg shadow-violet-600/30">
              <Wallet className="size-5 fill-white/20" />
            </span>
            <span className="text-2xl font-extrabold tracking-tight">Spendze</span>
          </div>
          <div className="relative z-10 my-auto max-w-lg space-y-5">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">Your money, made clear</p>
            <h2 className="text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl">Build better financial habits from day one.</h2>
            <p className="max-w-md text-sm leading-7 text-zinc-300">Track spending, organize budgets, and understand your money with one focused personal finance workspace.</p>
          </div>
          <p className="relative z-10 text-xs text-zinc-500">© {new Date().getFullYear()} Spendze</p>
        </section>
      ) : <div className={cn(
        'bg-muted/60 relative hidden flex-col border-r border-border p-10 lg:flex overflow-hidden',
        'h-full'
      )}>
        <div className="from-background absolute inset-0 z-10 bg-gradient-to-t to-transparent opacity-80 pointer-events-none" />
        
        {/* Brand Header */}
        <div className="z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-violet-500/25">
            <Wallet className="h-5 w-5 fill-white/20 text-white" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-foreground">
            Spendze
          </span>
        </div>

        {/* Testimonial Quote */}
        <div className="z-10 mt-auto space-y-4 max-w-lg">
          <blockquote className="space-y-3">
            <p className="text-xl font-medium text-foreground/90 leading-relaxed">
              &ldquo;Spendze has completely transformed how I track daily expenses, automate category budgets, and build long-term wealth effortlessly.&rdquo;
            </p>
            <footer className="font-mono text-sm font-semibold text-violet-500 flex items-center gap-2">
              <span>~ Alex Morgan</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 uppercase font-sans">Pro Member</span>
            </footer>
          </blockquote>
        </div>

        {/* Memoized Animated Floating SVG Background Paths */}
        <div className="absolute inset-0">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>
      </div>}

      {/* Right Column: Sign In / Sign Up Form */}
      <div className={cn(
        'relative flex flex-col p-6 sm:p-10',
        mode === 'signin'
          ? 'isolate min-w-0 min-h-svh justify-start px-4 py-8 sm:px-8 sm:py-8 lg:justify-center'
          : 'min-h-screen justify-center'
      )}>
        
        {/* Ambient Radial Gradient Glow */}
        {mode !== 'signin' && <div
          aria-hidden
          className="absolute inset-0 isolate contain-strict -z-10 opacity-60 pointer-events-none"
        >
          <div className="bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,var(--color-violet-500,.15)_0,transparent_70%)] absolute top-0 right-0 h-[600px] w-[500px] -translate-y-1/3 rounded-full blur-3xl" />
        </div>}

        {/* Back to Home Button */}
        {onBackToHome && mode !== 'signin' && (
          <Button 
            variant="ghost" 
            className="absolute top-7 left-5 text-xs font-semibold hover:bg-muted cursor-pointer"
            onClick={onBackToHome}
          >
            <ChevronLeftIcon className="size-4 me-2 text-violet-500" />
            Back to Home
          </Button>
        )}

        {/* Form Container */}
        <div className={cn('mx-auto space-y-5 w-full', mode === 'signin'
          ? 'relative z-10 max-w-md shrink-0 rounded-3xl border border-border bg-card p-5 shadow-xl shadow-black/5 sm:p-8'
          : 'max-w-sm')}>
          {mode === 'signin' && (
            <div className="flex items-center justify-between">
              {onBackToHome && (
                <button type="button" onClick={onBackToHome} className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-violet-600">
                  <ChevronLeftIcon className="size-4" />
                  Back to home
                </button>
              )}
              <div className="flex items-center gap-2 lg:hidden">
                <Wallet className="size-5 text-violet-600" />
                <span className="font-extrabold">Spendze</span>
              </div>
            </div>
          )}
          
          {/* Mobile Header Brand */}
          {mode !== 'signin' && <div className="flex items-center gap-2.5 lg:hidden mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-md">
              <Wallet className="h-5 w-5 fill-white/20 text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-foreground">
              Spendze
            </span>
          </div>}

          <div className="flex flex-col space-y-1.5">
            <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
              {mode === 'signin' ? 'Welcome Back to Spendze' : 'Create Your Free Account'}
            </h1>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {mode === 'signin' 
                ? 'Enter your credentials to access your financial dashboard.' 
                : 'Start organizing your money flow & tracking budgets in 30 seconds.'}
            </p>
          </div>

          {/* Mode Tab Switcher */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 border border-border text-xs font-semibold">
            <button
              type="button"
              disabled={mode === 'signin' && isLoading}
              onClick={() => {
                setMode('signin');
                setErrorMsg('');
              }}
              className={cn(
                'py-1.5 rounded-lg transition-all cursor-pointer',
                mode === 'signin' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              )}
            >
              Sign In
            </button>
            <button
              type="button"
              disabled={mode === 'signin' && isLoading}
              onClick={() => {
                if (onRequestSignup) {
                  onRequestSignup();
                  return;
                }
                setMode('signup');
                setErrorMsg('');
              }}
              className={cn(
                'py-1.5 rounded-lg transition-all cursor-pointer',
                mode === 'signup' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              )}
            >
              Sign Up
            </button>
          </div>

          {/* Success Message Feedback */}
          {isSuccess && mode === 'signup' ? (
            <div className="py-8 text-center space-y-3 animate-in zoom-in-95 duration-200">
              <div className="h-12 w-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                {mode === 'signup' ? 'Account Created Successfully!' : 'Welcome Back!'}
              </h3>
              <p className="text-xs text-muted-foreground">Redirecting to Spendze dashboard...</p>
            </div>
          ) : (
            <>
              {/* Keep space for two-line errors/status without recentering the login card. */}
              {mode === 'signin' ? (
                <div className="min-h-16">
                  {errorBanner}
                  {isSuccess && (
                    <div role="status" className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 text-emerald-600 text-xs font-medium border border-emerald-500/20">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>Welcome back! Redirecting to your dashboard...</span>
                    </div>
                  )}
                </div>
              ) : errorBanner}

              <SocialLoginButtons disabled={isLoading} onBusyChange={setIsLoading} />

              <AuthSeparator />

              {/* Email Form */}
              <form onSubmit={handleSubmit} aria-busy={isLoading} className="space-y-3">
                {mode === 'signup' && (
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Full Name
                    </label>
                    <Input
                      placeholder="Alex Morgan"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      type="text"
                      className="text-xs"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="auth-email" className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Email Address
                  </label>
                  <div className="relative h-max">
                    <Input
                      id="auth-email"
                      name="email"
                      autoComplete={mode === 'signin' ? 'email' : undefined}
                      disabled={mode === 'signin' && isLoading}
                      placeholder="alex@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (mode === 'signin') setErrorMsg('');
                      }}
                      className="peer ps-9 text-xs"
                      type="email"
                    />
                    <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                      <AtSignIcon className="size-4" aria-hidden="true" />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="auth-password" className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Password
                  </label>
                  <div className="relative h-max">
                    <Input
                      id="auth-password"
                      name="password"
                      autoComplete={mode === 'signin' ? 'current-password' : undefined}
                      disabled={mode === 'signin' && isLoading}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (mode === 'signin') setErrorMsg('');
                      }}
                      className="peer ps-9 text-xs"
                      type="password"
                    />
                    <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                      <LockIcon className="size-4" aria-hidden="true" />
                    </div>
                  </div>
                </div>

                {mode === 'signin' && <div className="text-right"><Link to="/forgot-password" className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400">Forgot Password?</Link></div>}

                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className={cn(
                    'w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold shadow-md hover:shadow-violet-600/30 cursor-pointer',
                    mode === 'signin' && 'h-10 min-h-10 shrink-0'
                  )}
                >
                  <span>{isLoading ? 'Processing...' : mode === 'signup' ? 'Create Free Account' : 'Sign In to Account'}</span>
                </Button>
              </form>

              <p className="text-muted-foreground text-center text-[11px]">
                By clicking continue, you agree to our{' '}
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); alert('Terms of Service agreement'); }}
                  className="hover:text-primary underline underline-offset-4"
                >
                  Terms of Service
                </a>{' '}
                and{' '}
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); alert('Privacy Policy agreement'); }}
                  className="hover:text-primary underline underline-offset-4"
                >
                  Privacy Policy
                </a>
                .
              </p>
            </>
          )}

        </div>
      </div>
    </main>
  );
}

const FloatingPaths = memo(function FloatingPaths({ position, animated = true }: { position: number; animated?: boolean }) {
  const paths = useMemo(() => {
    return Array.from({ length: 36 }, (_, i) => ({
      id: i,
      d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
        380 - i * 5 * position
      } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
        152 - i * 5 * position
      } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
        684 - i * 5 * position
      } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
      width: 0.5 + i * 0.03,
      duration: 20 + (i % 10),
    }));
  }, [position]);

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg
        className="h-full w-full text-violet-500/20 dark:text-violet-400/30"
        viewBox="0 0 696 316"
        fill="none"
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          animated ? <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.1 + path.id * 0.03}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: path.duration,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'linear',
            }}
          /> : <path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.1 + path.id * 0.03}
            opacity={0.45}
          />
        ))}
      </svg>
    </div>
  );
});

const AuthSeparator = () => {
  return (
    <div className="flex w-full items-center justify-center my-3">
      <div className="bg-border h-px w-full" />
      <span className="text-muted-foreground px-2 text-[10px] uppercase font-bold tracking-wider">OR</span>
      <div className="bg-border h-px w-full" />
    </div>
  );
};
