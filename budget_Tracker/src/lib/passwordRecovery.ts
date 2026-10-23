// In-memory only, to survive React StrictMode's initializer replay. Never store a
// reset credential in localStorage/sessionStorage or send it in a request URL.
let capturedToken: string | undefined;

export function readResetToken(): string {
  if (capturedToken !== undefined) return capturedToken;
  const token = new URLSearchParams(location.hash.slice(1)).get('token') || '';
  history.replaceState(history.state, '', location.pathname);
  capturedToken = /^[A-Za-z0-9_-]{43}$/.test(token) ? token : '';
  return capturedToken;
}

export function clearResetToken() { capturedToken = ''; }

export function validateResetPassword(password: string, confirmation: string): string {
  const normalized = password.trim();
  if (Array.from(normalized).length < 12) return 'Use at least 12 characters. A long passphrase works well.';
  if (new TextEncoder().encode(normalized).length > 72) return 'Use at most 72 UTF-8 bytes; some characters use multiple bytes.';
  if (password !== confirmation) return 'Passwords do not match.';
  return '';
}
