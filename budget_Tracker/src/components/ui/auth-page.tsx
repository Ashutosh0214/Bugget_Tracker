import React, { useState, useEffect, useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { Button } from './button';
import { Input } from './input';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
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

  useEffect(() => {
    setMode(initialMode === 'signup' ? 'signup' : 'signin');
  }, [initialMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password || (mode === 'signup' && !name)) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        await signup(name, email, password);
      } else {
        await login(email, password);
      }
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

  const handleSocialLogin = async (provider: string) => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      await login(`${provider.toLowerCase()}.user@spendze.com`, 'oauth-token');
      setIsLoading(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        if (onSuccess) onSuccess();
      }, 900);
    } catch (err) {
      setIsLoading(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        if (onSuccess) onSuccess();
      }, 900);
    }
  };

  return (
    <main className="relative min-h-screen md:h-screen md:overflow-hidden lg:grid lg:grid-cols-2 bg-background text-foreground select-none">
      
      {/* Left Column: Animated Gradient & Floating Paths Showcase */}
      <div className="bg-muted/60 relative hidden h-full flex-col border-r border-border p-10 lg:flex overflow-hidden">
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
      </div>

      {/* Right Column: Sign In / Sign Up Form */}
      <div className="relative flex min-h-screen flex-col justify-center p-6 sm:p-10">
        
        {/* Ambient Radial Gradient Glow */}
        <div
          aria-hidden
          className="absolute inset-0 isolate contain-strict -z-10 opacity-60 pointer-events-none"
        >
          <div className="bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,var(--color-violet-500,.15)_0,transparent_70%)] absolute top-0 right-0 h-[600px] w-[500px] -translate-y-1/3 rounded-full blur-3xl" />
        </div>

        {/* Back to Home Button */}
        {onBackToHome && (
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
        <div className="mx-auto space-y-5 w-full max-w-sm">
          
          {/* Mobile Header Brand */}
          <div className="flex items-center gap-2.5 lg:hidden mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-md">
              <Wallet className="h-5 w-5 fill-white/20 text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-foreground">
              Spendze
            </span>
          </div>

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
          {isSuccess ? (
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
              {/* Error Banner */}
              {errorMsg && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20 animate-in fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Social Login Buttons */}
              <div className="space-y-2">
                <Button 
                  type="button" 
                  variant="outline"
                  size="lg" 
                  className="w-full justify-center text-xs font-semibold hover:bg-muted cursor-pointer"
                  onClick={() => handleSocialLogin('Google')}
                >
                  <GoogleIcon className="size-4 me-2" />
                  Continue with Google
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  size="lg" 
                  className="w-full justify-center text-xs font-semibold hover:bg-muted cursor-pointer"
                  onClick={() => handleSocialLogin('Apple')}
                >
                  <AppleIcon className="size-4 me-2" />
                  Continue with Apple
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  size="lg" 
                  className="w-full justify-center text-xs font-semibold hover:bg-muted cursor-pointer"
                  onClick={() => handleSocialLogin('GitHub')}
                >
                  <GithubIcon className="size-4 me-2" />
                  Continue with GitHub
                </Button>
              </div>

              <AuthSeparator />

              {/* Email Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
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
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Email Address
                  </label>
                  <div className="relative h-max">
                    <Input
                      placeholder="alex@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="peer ps-9 text-xs"
                      type="email"
                    />
                    <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                      <AtSignIcon className="size-4" aria-hidden="true" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Password
                  </label>
                  <div className="relative h-max">
                    <Input
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="peer ps-9 text-xs"
                      type="password"
                    />
                    <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                      <LockIcon className="size-4" aria-hidden="true" />
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold shadow-md hover:shadow-violet-600/30 cursor-pointer"
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

const FloatingPaths = memo(function FloatingPaths({ position }: { position: number }) {
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
          <motion.path
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
          />
        ))}
      </svg>
    </div>
  );
});

const GoogleIcon = (props: React.ComponentProps<'svg'>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <g>
      <path d="M12.479,14.265v-3.279h11.049c0.108,0.571,0.164,1.247,0.164,1.979c0,2.46-0.672,5.502-2.84,7.669   C18.744,22.829,16.051,24,12.483,24C5.869,24,0.308,18.613,0.308,12S5.869,0,12.483,0c3.659,0,6.265,1.436,8.223,3.307L18.392,5.62   c-1.404-1.317-3.307-2.341-5.913-2.341C7.65,3.279,3.873,7.171,3.873,12s3.777,8.721,8.606,8.721c3.132,0,4.916-1.258,6.059-2.401   c0.927-0.927,1.537-2.251,1.777-4.059L12.479,14.265z" />
    </g>
  </svg>
);

const AppleIcon = (props: React.ComponentProps<'svg'>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.82 1.12-1.96.99-3.1-.97.04-2.15.65-2.84 1.46-.62.72-1.16 1.88-1.01 3 .09.01.21.02.32.02 1.05 0 2.14-.56 2.54-1.38z" />
  </svg>
);

const GithubIcon = (props: React.ComponentProps<'svg'>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const AuthSeparator = () => {
  return (
    <div className="flex w-full items-center justify-center my-3">
      <div className="bg-border h-px w-full" />
      <span className="text-muted-foreground px-2 text-[10px] uppercase font-bold tracking-wider">OR</span>
      <div className="bg-border h-px w-full" />
    </div>
  );
};
