import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  AtSignIcon,
  CheckCircle2,
  Eye,
  EyeOff,
  LockIcon,
  UserIcon,
  Wallet,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

type RegisterErrors = Partial<Record<keyof RegisterFormData, string>>;

const INITIAL_FORM: RegisterFormData = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

export default function RegisterPage() {
  const { signup } = useAuth();
  const submissionPending = useRef(false);
  const [formData, setFormData] = useState<RegisterFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setSubmitted(false);
    setApiError('');
  };

  const validateForm = () => {
    const nextErrors: RegisterErrors = {};

    if (!formData.name.trim()) nextErrors.name = 'Please enter your full name.';
    else if (Array.from(formData.name.trim()).length > 100) nextErrors.name = 'Name must be at most 100 characters long.';
    if (!formData.email.trim()) {
      nextErrors.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }
    // UserSignup strips surrounding whitespace before checking string lengths.
    const passwordLength = Array.from(formData.password.trim()).length;
    if (!passwordLength) {
      nextErrors.password = 'Please create a password.';
    } else if (passwordLength < 8) {
      nextErrors.password = 'Password must be at least 8 characters long.';
    } else if (passwordLength > 128) {
      nextErrors.password = 'Password must be at most 128 characters long.';
    } else if (new TextEncoder().encode(formData.password.trim()).length > 72) {
      nextErrors.password = 'Password must be at most 72 UTF-8 bytes (some characters use multiple bytes).';
    }
    if (!formData.confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password.';
    } else if (formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionPending.current || submitted) return;
    setSubmitted(false);
    setApiError('');
    if (!validateForm()) return;

    submissionPending.current = true;
    setIsLoading(true);
    try {
      // Reuse AuthContext's existing JWT/session handling; never send confirmation.
      await signup(formData.name.trim(), formData.email.trim(), formData.password.trim());
      setSubmitted(true);
      setFormData(INITIAL_FORM);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        const fieldErrors: RegisterErrors = {};
        for (const field of ['name', 'email', 'password'] as const) {
          if (error.fieldErrors[field]) fieldErrors[field] = error.fieldErrors[field];
        }
        setErrors(fieldErrors);
      }
      setApiError(error instanceof TypeError
        ? 'Unable to reach the server. Check your connection and try again.'
        : error instanceof Error ? error.message : 'Registration failed. Please try again.');
    } finally {
      submissionPending.current = false;
      setIsLoading(false);
    }
  };

  const passwordInput = (
    field: 'password' | 'confirmPassword',
    label: string,
    visible: boolean,
    toggleVisibility: () => void,
  ) => (
    <div>
      <label htmlFor={field} className="mb-1 block text-[11px] font-semibold text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <Input
          id={field}
          name={field}
          type={visible ? 'text' : 'password'}
          value={formData[field]}
          onChange={handleChange}
          placeholder="••••••••"
          autoComplete={field === 'password' ? 'new-password' : 'new-password'}
          aria-invalid={Boolean(errors[field])}
          aria-describedby={errors[field] ? `${field}-error` : undefined}
          className="peer ps-9 pe-10 text-xs"
        />
        <LockIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <button
          type="button"
          onClick={toggleVisibility}
          className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {errors[field] && (
        <p id={`${field}-error`} className="mt-1 text-[11px] font-medium text-destructive">
          {errors[field]}
        </p>
      )}
    </div>
  );

  return (
    <main className="grid min-h-screen overflow-x-hidden bg-background text-foreground lg:grid-cols-2">
      <section className="relative hidden min-h-screen overflow-hidden border-r border-white/10 bg-zinc-950 p-10 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(124,58,237,0.32),transparent_38%),radial-gradient(circle_at_80%_80%,rgba(79,70,229,0.24),transparent_42%)]" />
        <Link to="/" className="relative z-10 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-600 shadow-lg shadow-violet-600/30">
            <Wallet className="size-5 fill-white/20" />
          </span>
          <span className="text-2xl font-extrabold tracking-tight">Spendze</span>
        </Link>

        <div className="relative z-10 my-auto max-w-lg space-y-5">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">Your money, made clear</p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl">
            Build better financial habits from day one.
          </h1>
          <p className="max-w-md text-sm leading-7 text-zinc-300">
            Track spending, organize budgets, and understand your money with one focused personal finance workspace.
          </p>
        </div>

        <p className="relative z-10 text-xs text-zinc-500">© {new Date().getFullYear()} Spendze</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8">
        <div className="w-full max-w-md space-y-5 rounded-3xl border border-border bg-card p-5 shadow-xl shadow-black/5 sm:p-8">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-violet-600"
            >
              <ArrowLeft className="size-4" />
              Back to home
            </Link>
            <div className="flex items-center gap-2 lg:hidden">
              <Wallet className="size-5 text-violet-600" />
              <span className="font-extrabold">Spendze</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-extrabold tracking-tight">Create Your Free Account</h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Start organizing your money flow and tracking budgets in seconds.
            </p>
          </div>

          {submitted && (
            <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>Account created successfully. You are signed in. <Link to="/" className="underline">Continue to Spendzy</Link></span>
            </div>
          )}

          {(apiError || Object.values(errors).some(Boolean)) && (
            <div role="alert" className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {apiError || 'Please correct the highlighted fields.'}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate aria-busy={isLoading}>
            <fieldset disabled={isLoading || submitted} className="space-y-3.5">
            <div>
              <label htmlFor="name" className="mb-1 block text-[11px] font-semibold text-muted-foreground">Full Name</label>
              <div className="relative">
                <Input id="name" name="name" type="text" value={formData.name} onChange={handleChange} placeholder="Alex Morgan" autoComplete="name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : undefined} className="peer ps-9 text-xs" />
                <UserIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              {errors.name && <p id="name-error" className="mt-1 text-[11px] font-medium text-destructive">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="email" className="mb-1 block text-[11px] font-semibold text-muted-foreground">Email Address</label>
              <div className="relative">
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="alex@example.com" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} className="peer ps-9 text-xs" />
                <AtSignIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              {errors.email && <p id="email-error" className="mt-1 text-[11px] font-medium text-destructive">{errors.email}</p>}
            </div>

            {passwordInput('password', 'Password', showPassword, () => setShowPassword((value) => !value))}
            {passwordInput('confirmPassword', 'Confirm Password', showConfirmPassword, () => setShowConfirmPassword((value) => !value))}

            <Button type="submit" disabled={isLoading || submitted} className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 font-semibold text-white shadow-md hover:shadow-violet-600/30">
              {isLoading ? 'Creating Account...' : submitted ? 'Account Created' : 'Create Account'}
            </Button>
            </fieldset>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-violet-600 hover:text-violet-500 hover:underline">
              Login
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
