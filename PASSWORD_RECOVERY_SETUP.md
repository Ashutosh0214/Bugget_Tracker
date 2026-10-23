# Spendze password recovery

## Implemented behavior

The Sign In page links to `/forgot-password`. The page accepts an email and calls
`POST /api/auth/forgot-password`. For a configured mail service, the API always
returns the same 202 confirmation for registered, unknown, and social-only accounts.
The actual lookup and delivery run after the response. An account must already
have a bcrypt password to be eligible; this flow never creates a password for a
Google-only account or changes a provider identity mapping. Existing accounts
linked to Google can still reset their existing password.

Reset credentials have 256 bits of randomness, are valid for exactly 15 minutes,
and are stored only as SHA-256 hashes in `password_resets`. Only the latest link
for an account works. The record is also bound to the account's current password
hash. A cryptographic token hash is sufficient because the token is random and
not a human password. Passwords themselves continue to use the project's bcrypt
implementation.

Reset links use a URL fragment (`/reset-password#token=...`), which is not sent in
HTTP access logs or referrer headers. The frontend removes it from history and
holds it only in memory while the form is open; it is not stored in browser
localStorage/sessionStorage. Reloading after the fragment has been removed means
reopening the original email link. The page has New Password and Confirm Password,
with accessible loading/error states and the existing purple/dark-mode styling.

`POST /api/auth/reset-password` checks both passwords, token validity, expiry, and
password rules. It then rechecks/consumes the token and changes the password in a
single SQLite transaction. Concurrent or repeated use fails. The user must sign
in again; password reset does not automatically log them in.

Reset passwords require at least 12 characters, at most 72 UTF-8 bytes (bcrypt's
limit), matching confirmation, and rejection of a small set of obvious/repetitive
passwords. Long unique passphrases are supported without mandatory symbol/digit
rules. This is deliberately stricter than the existing eight-character signup
minimum, which is unchanged. Surrounding whitespace follows existing signup/login
normalization. This is not a comprehensive breached-password screening service.

## Session revocation and data preservation

An additive `session_version` column defaults existing users to zero. New JWTs
carry `sv`, and every authenticated backend request checks it against the database.
Legacy JWTs without `sv` remain valid at version zero until that user's password
changes. Successful reset increments the version, invalidating all older JWTs
immediately. Other users' sessions are unaffected. Existing pending OAuth handoffs
and linking flows for that user are removed; linking callbacks already in flight
must also pass the saved session-version check before linking an identity.

Provider mappings, user IDs, names, emails, transactions, and budgets remain intact.
Verified Google sign-in still works after a reset and can create a fresh session.
The existing administrative reset script also revokes sessions when explicitly run.
Normal logout retains its existing behavior. A page already displaying cached data
in another browser cannot erase previously viewed information, but old JWTs cannot
retrieve or change protected data after reset.

## Email provider: Resend

**Real delivery has not been tested.** No Resend account, key, verified domain,
paid plan, or sender was created. Automated tests mock email delivery and the HTTP
API. An accepted API request is not proof that a message reached the inbox.

1. Open your Resend account. Add a domain or transactional subdomain you own under
   **Domains**, for example `auth.your-domain.com`.
2. Copy the exact SPF/DKIM records shown by Resend into your DNS provider, then
   wait until Resend shows the domain as verified. Do not invent DNS record values.
   Configure DMARC according to your domain's policy. See [verified domains](https://resend.com/docs/dashboard/domains/introduction).
3. Create an API key under **API Keys**, restricted to sending email and your
   verified domain where supported. Keep it only in the backend/Render secrets.
4. Choose a sender on that domain, such as `Spendze <security@auth.your-domain.com>`.
   Disable open/click tracking for password-recovery emails so links are not
   rewritten into tracking URLs. Configure any provider retention/access policy
   appropriate for email bodies containing short-lived credentials.
5. Add the following fields to the existing `backend/.env`; do not overwrite
   unrelated settings, JWT_SECRET, OAuth credentials, or DATABASE_PATH:

```dotenv
EMAIL_PROVIDER=resend
RESEND_API_KEY=your-real-backend-only-api-key
PASSWORD_RESET_FROM=Spendze <security@auth.your-domain.com>
PASSWORD_RESET_FRONTEND_URL=http://localhost:5173
```

The example key/domain above are placeholders, not working credentials. The
checked-in `backend/.env.example` contains empty secret fields. No frontend
VITE_ email credential is needed. `PASSWORD_RESET_FRONTEND_URL` must be an exact
origin (no path), must be in the backend's existing CORS_ORIGINS, and must use HTTPS
in production. It is server configuration, never derived from the request's Host
header. The backend supports Resend through the existing httpx dependency and
the [official send-email API](https://resend.com/docs/api-reference/emails/send-email).

When configuration is absent or invalid, forgot-password returns 503 for every
email with the same unavailable message. Once configured, provider outages still
produce the generic 202 response, avoiding enumeration; the backend records only
a fixed operational error without the recipient, token, link, exception, or API key.
A known delivery failure removes that attempt's reset hash. Check provider status
and configuration when that event occurs; never log full request/response bodies.

Delivery runs as an in-process background task, not a durable mail queue. A server
restart between response and delivery can lose a request; users can request another
link. No automated retries or guaranteed inbox delivery are claimed. A durable
worker/outbox is a separate deployment enhancement for higher delivery requirements;
do not persist plaintext reset tokens as a workaround. A password-change notification
is also attempted after a successful reset; notification failure does not undo the
password change.

## Rate limits and proxy configuration

Limits are persisted in SQLite and shared by workers using that same database:

- Forgot-password: 5 requests per client IP per 15 minutes.
- Email delivery: 3 attempts per normalized email per hour. Suppressed attempts
  still return the identical generic 202 response, whether the email exists or not.
- Reset-password: 10 attempts per client IP per 15 minutes.

IP throttling returns 429 with Retry-After. Rate-limit bucket keys use HMAC-SHA256
with the existing JWT secret instead of storing raw email/IP values. Expired buckets
are cleaned up when checked. Invalid, expired, and reused reset credentials share
the same error message. There is no account lockout on forgot-password requests.

The application uses `request.client.host`, not arbitrary X-Forwarded-For headers.
Behind Render or another proxy, configure Uvicorn's proxy-header trust to the actual
trusted proxy addresses/network. Do not blindly trust forwarded headers from the
public internet. If every request appears to come from one proxy IP, unrelated
users can share a bucket until this deployment setting is corrected. This SQLite
architecture needs persistent storage and one shared database/service instance;
independent replicas would require a shared rate-limit/session store.

## Local verification

Use a separate disposable local database if manually testing account creation or
password changes. Automated tests already isolate their databases and never send
real mail. Stop existing processes with Ctrl+C before restarting.

```powershell
Set-Location D:\BuggetTracker\backend
& ..\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload --no-access-log
```

```powershell
Set-Location D:\BuggetTracker\budget_Tracker
npm run dev -- --host localhost --port 5173 --strictPort
```

With real credentials and a verified sender configured, test using an inbox you
control and a password-based **development** Spendze account:

1. Open `http://localhost:5173/login`, then **Forgot Password?**.
2. Submit its email. The page must show the generic confirmation without claiming
   the account exists or guaranteeing delivery.
3. Check the Resend dashboard for accepted/delivered status, then verify actual
   inbox delivery. Do not paste the reset link/token into logs, screenshots, or chat.
4. Open the email link and set a unique 12+ character passphrase. Confirm the token
   disappears from the address bar, the page reports success, and no auto-login occurs.
5. Sign in using the new password; the old password must fail. An old JWT must get
   401 from `/api/auth/me`. Existing financial data and Google links must remain.
6. Reopen the used link: reset must fail. A link older than 15 minutes must fail.
   Unknown and Google-only emails must show the same forgot-password confirmation.
7. Verify mobile/dark-mode presentation and rate-limit messages in your browser.

Automated checks:

Verification result: **104 backend tests and 24 frontend tests passed**. Tests
cover successful reset, expiry/reuse/replacement, weak or mismatched passwords,
concurrent token consumption, rollback on database failure, enumeration resistance,
rate limits, signature/session/OAuth regressions, Google-only accounts, mocked
Resend HTTP requests, fragment removal, and duplicate UI submissions. The production
frontend build passed and lint completed with existing warnings. Real email delivery
and manual browser presentation have not been verified.

```powershell
Set-Location D:\BuggetTracker
& .\.venv\Scripts\python.exe -m pytest backend/tests -q -p no:cacheprovider
Set-Location budget_Tracker
node --test tests/*.test.mjs
npm run build
npm run lint
```

## Production configuration

Set the four mail settings in the existing Python Render service's environment.
Use your actual HTTPS frontend origin for PASSWORD_RESET_FRONTEND_URL, for example
`https://bugget-tracker.vercel.app` if that remains your confirmed production domain.
Keep that exact origin in CORS_ORIGINS, preserve OAuth settings and JWT_SECRET, and
retain the existing persistent DATABASE_PATH. Back up SQLite before deploying;
startup adds the new tables/columns without resetting existing data. The existing
Vercel SPA rewrite covers `/forgot-password` and `/reset-password`.

Keep secrets and reset credentials out of app/proxy analytics and error reporting;
do not enable request-body capture on authentication endpoints. Apply HTTPS,
trusted proxy configuration, and your existing operational monitoring. No new
dependencies, purchase, push, commit, or deployment were performed for this feature.

## Modified files

- Backend: `password_reset.py`, `routers/password_router.py`, `database.py`,
  `auth.py`, `routers/auth_router.py`, `routers/oauth_router.py`, `oauth_service.py`,
  `scripts/reset_password.py`, `main.py`, `.env.example`, `tests/conftest.py`,
  `tests/test_password_recovery.py`.
- Frontend: `src/pages/PasswordRecoveryPages.tsx`, `src/lib/passwordRecovery.ts`,
  `src/lib/api.ts`, `src/RootRouter.tsx`, `src/components/ui/auth-page.tsx`,
  `index.html`, `tests/password-recovery.test.mjs`.
- This guide. Earlier unrelated changes were preserved.
