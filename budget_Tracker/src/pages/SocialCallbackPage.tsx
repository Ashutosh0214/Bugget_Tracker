import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { readSocialCallback } from '@/lib/socialAuth';
import type { SocialAuthResponse } from '@/lib/api';

export default function SocialCallbackPage() {
  const { completeSocialLogin, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const completion = useRef<Promise<SocialAuthResponse> | null>(null);
  useEffect(() => {
    if (loading && !completion.current) return;
    let active = true;
    // React StrictMode replays effects. Reuse this promise to redeem only once.
    if (!completion.current) {
      completion.current = Promise.resolve().then(() => {
        const { code, verifier } = readSocialCallback();
        return completeSocialLogin(code, verifier);
      });
    }
    completion.current.then(result => {
      if (active) navigate('/dashboard', { replace: true, state: { newAccount: result.new_account, accountLinked: result.linked } });
    }).catch((failure: unknown) => {
      if (active) setError(failure instanceof Error ? failure.message : 'Sign-in failed. Please try again.');
    });
    return () => { active = false; };
  }, [completeSocialLogin, loading, navigate]);
  return <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
    <div className="max-w-md space-y-4 rounded-3xl border border-border bg-card p-8 text-center">
      <h1 className="text-xl font-bold">{error ? 'Unable to finish sign-in' : 'Signing you in to Spendze…'}</h1>
      {error ? <><p role="alert" className="text-sm text-destructive">{error}</p><Link to="/login" className="text-sm font-semibold text-violet-600 underline">Return to login</Link></>
        : <p role="status" className="animate-pulse text-sm text-muted-foreground">Verifying your account securely…</p>}
    </div>
  </main>;
}
