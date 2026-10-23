import { useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { passwordApi } from '@/lib/api';
import { readResetToken, clearResetToken, validateResetPassword } from '@/lib/passwordRecovery';

function RecoveryLayout({ title, children }: { title: string; children: ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground">
    <section className="w-full max-w-md space-y-5 rounded-3xl border border-border bg-card p-6 shadow-xl shadow-black/5 sm:p-8">
      <Link to="/" className="flex items-center gap-2 text-xl font-extrabold"><Wallet className="size-6 text-violet-600" />Spendze</Link>
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      {children}
      <p className="text-center text-xs"><Link to="/login" className="font-semibold text-violet-600 hover:underline dark:text-violet-400">Back to Sign In</Link></p>
    </section>
  </main>;
}

function errorMessage(error: unknown) {
  return error instanceof TypeError ? 'Unable to reach Spendze. Please try again.'
    : error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const pending = useRef(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const result = await passwordApi.forgot(email.trim());
      setMessage(result.message); setEmail('');
    } catch (failure: unknown) { setError(errorMessage(failure)); }
    finally { pending.current = false; setBusy(false); }
  };
  return <RecoveryLayout title="Forgot your password?">
    <p className="text-xs leading-relaxed text-muted-foreground">Enter your account email to request a reset link. If you use Google only, continue with Google on the Sign In page.</p>
    {message && <p role="status" className="rounded-xl bg-violet-500/10 p-3 text-sm">{message}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <form onSubmit={submit} aria-busy={busy} className="space-y-4">
      <label htmlFor="recovery-email" className="block text-xs font-semibold">Email address</label>
      <Input id="recovery-email" type="email" autoComplete="email" maxLength={254} required disabled={busy} value={email} onChange={event => setEmail(event.target.value)} />
      <Button type="submit" disabled={busy} className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
        {busy && <LoaderCircle className="me-2 size-4 animate-spin" />}{busy ? 'Requesting link…' : 'Send reset link'}
      </Button>
    </form>
  </RecoveryLayout>;
}

export function ResetPasswordPage() {
  const { logout } = useAuth();
  const [token, setToken] = useState(readResetToken);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending.current || !token || done) return;
    const validation = validateResetPassword(password, confirmation);
    if (validation) { setError(validation); return; }
    pending.current = true; setBusy(true); setError('');
    try {
      await passwordApi.reset(token, password, confirmation);
      clearResetToken(); setToken(''); setPassword(''); setConfirmation(''); setDone(true);
      try { logout(); } catch { /* Server has revoked sessions even if browser storage is blocked. */ }
    } catch (failure: unknown) { setError(errorMessage(failure)); }
    finally { pending.current = false; setBusy(false); }
  };
  return <RecoveryLayout title="Set a new password">
    {done ? <p role="status" className="rounded-xl bg-violet-500/10 p-3 text-sm">Your password has been updated and existing sessions signed out. Sign in with your new password.</p>
      : !token ? <p role="alert" className="text-sm text-destructive">This reset link is missing or invalid. <Link to="/forgot-password" className="underline">Request a new link</Link>.</p>
        : <>
          <p className="text-xs leading-relaxed text-muted-foreground">Choose a unique passphrase of at least 12 characters, up to 72 UTF-8 bytes. Reset links expire after 15 minutes and work once.</p>
          {error && <p role="alert" className="text-sm text-destructive">{error} <Link to="/forgot-password" className="underline">Request a new link</Link></p>}
          <form onSubmit={submit} aria-busy={busy} className="space-y-4">
            <fieldset disabled={busy} className="space-y-4">
              <label htmlFor="reset-password" className="block text-xs font-semibold">New Password</label>
              <Input id="reset-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={event => setPassword(event.target.value)} />
              <label htmlFor="reset-confirmation" className="block text-xs font-semibold">Confirm Password</label>
              <Input id="reset-confirmation" type="password" autoComplete="new-password" maxLength={128} required value={confirmation} onChange={event => setConfirmation(event.target.value)} />
              <Button type="submit" disabled={busy} className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
                {busy && <LoaderCircle className="me-2 size-4 animate-spin" />}{busy ? 'Updating password…' : 'Reset password'}
              </Button>
            </fieldset>
          </form>
        </>}
  </RecoveryLayout>;
}
