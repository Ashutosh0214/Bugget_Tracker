import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { socialApi, SocialProvider } from '@/lib/api';
import { startSocialLogin } from '@/lib/socialAuth';

export default function SocialLoginButtons({ disabled = false, linking = false, onBusyChange, providersToShow = ['google', 'apple', 'github'] }: {
  disabled?: boolean; linking?: boolean; onBusyChange?: (busy: boolean) => void; providersToShow?: SocialProvider[];
}) {
  const [providers, setProviders] = useState<Partial<Record<SocialProvider, { enabled: boolean }>>>({});
  const [checking, setChecking] = useState(true);
  const [pending, setPending] = useState<SocialProvider | null>(null);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  useEffect(() => {
    let active = true;
    socialApi.providers().then(result => { if (active) setProviders(result); })
      .catch(() => { if (active) setError('Unable to check social sign-in availability. Email/password login is still available.'); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);
  const begin = async (provider: SocialProvider) => {
    if (submitting.current || disabled || !providers[provider]?.enabled) return;
    submitting.current = true;
    setPending(provider); setError(''); onBusyChange?.(true);
    try {
      await startSocialLogin(provider, linking);
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'Unable to start authentication. Please try again.');
      submitting.current = false; setPending(null); onBusyChange?.(false);
    }
  };
  return <div className="space-y-2">
    {providersToShow.map(provider => {
      const label = { google: 'Google', github: 'GitHub', apple: 'Apple' }[provider];
      const available = providers[provider]?.enabled === true;
      return <button key={provider} type="button" disabled={disabled || checking || !!pending || !available}
        onClick={() => begin(provider)} aria-busy={pending === provider}
        className="flex w-full items-center justify-center rounded-lg border border-border bg-transparent px-4 py-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">
        {pending === provider ? <LoaderCircle className="me-2 size-4 animate-spin" />
          : provider === 'github' ? <GithubIcon className="me-2 size-4" />
            : provider === 'apple' ? <AppleIcon className="me-2 size-4" />
              : <GoogleIcon className="me-2 size-4" />}
        {pending === provider ? `Opening ${label}…` : `${linking ? 'Link' : 'Continue with'} ${label}${checking ? ' — checking…' : available ? '' : ' — not configured'}`}
      </button>;
    })}
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    {linking && <p className="text-xs leading-relaxed text-muted-foreground">Link only your own provider account. This keeps your existing Spendze profile and financial records. A login within the last ten minutes is required.</p>}
  </div>;
}

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

