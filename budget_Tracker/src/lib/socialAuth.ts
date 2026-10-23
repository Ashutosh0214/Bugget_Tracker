import { API_ROOT_URL, SocialProvider } from './api';

const STORAGE_KEY = 'spendze_oauth_pending';

const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function startSocialLogin(provider: SocialProvider, linking = false) {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = base64url(new Uint8Array(hash));
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ verifier, provider, startedAt: Date.now() }));
  if (linking) {
    const token = localStorage.getItem('spendzy_token');
    if (!token) throw new Error('Please log in before linking an account.');
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `${API_ROOT_URL}/auth/oauth/${provider}/link`;
    // Native navigation avoids dependence on third-party cookies. Token stays in POST body.
    for (const [name, value] of Object.entries({ session_token: token, frontend_origin: location.origin, challenge })) {
      const input = document.createElement('input');
      input.type = 'hidden'; input.name = name; input.value = value; form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
    form.remove();
  } else {
    const params = new URLSearchParams({ frontend_origin: location.origin, challenge });
    window.location.assign(`${API_ROOT_URL}/auth/oauth/${provider}/start?${params}`);
  }
}

const ERRORS: Record<string, string> = {
  reauth_required: 'Please log out and log in again, then return to Settings to link your provider account.',
  cancelled: 'Sign-in was cancelled. You can try again or use email and password.',
  email_exists: 'This email already has a Spendze account. Sign in with your existing method, then use Settings to explicitly link this provider.',
  verified_email_required: 'The provider did not supply a verified email. For GitHub, verify an email in GitHub Settings, then try again.',
  already_linked: 'This provider identity is already linked to a Spendze account, or your account already has a different identity for this provider.',
  invalid_identity: 'The provider identity could not be verified. Please start sign-in again.',
  provider_failed: 'The provider could not complete authentication. Please try again.',
  unavailable: 'This sign-in provider is not configured yet.',
};

export function readSocialCallback() {
  const params = new URLSearchParams(location.hash.slice(1));
  // Remove short-lived handoff from browser history before rendering or loading other content.
  history.replaceState(history.state, '', location.pathname);
  const raw = sessionStorage.getItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  if (params.has('error')) throw new Error(ERRORS[params.get('error')!] || 'Authentication failed. Please start again.');
  let pending;
  try { pending = raw ? JSON.parse(raw) : null; } catch { pending = null; }
  const code = params.get('handoff');
  if (!code || typeof pending?.verifier !== 'string' || !Number.isFinite(pending.startedAt)
    || Date.now() < pending.startedAt || Date.now() - pending.startedAt > 10 * 60 * 1000) {
    throw new Error('Your sign-in session is missing or expired. Please start again in this tab.');
  }
  return { code, verifier: pending.verifier as string };
}
