# Spendze social authentication

## Status and architecture

Google (OpenID Connect authorization code), GitHub (OAuth authorization code), and
Apple (OpenID Connect authorization code with form_post) are implemented. **None
is live-verified or enabled without your provider credentials.** Apple additionally
requires a public HTTPS backend and HTTPS frontend. No provider credentials were
found, created, or written to `.env`. No paid service was enabled and no deployment
or push was performed.

The checkout is `D:\BuggetTracker`, not `D:\BudgetTracker`. The frontend is React/Vite;
FastAPI uses SQLite (`DATABASE_PATH`, default `backend/spendzy.db`). The existing
backend CORS allowlist references `https://bugget-tracker.vercel.app`; no existing
Vercel/Render deployment configuration was present. Confirm that is your actual
frontend domain before using the production examples below. The supplied production
backend is `https://spendze-backend.onrender.com`. The legacy Express package is
not the backend for this implementation.

1. The browser creates a random tab-specific verifier in sessionStorage and sends
   only its SHA-256 challenge to the backend.
2. The backend stores a ten-minute OAuth flow in SQLite, sets an HttpOnly browser
   binding cookie, and redirects to the provider with random state. Google/GitHub
   use S256 PKCE; Google/Apple use OIDC nonce.
3. The callback atomically consumes matching state, provider, cookie, and expiry.
   Provider authorization codes are exchanged server-side. Google/Apple ID tokens
   are verified with pinned provider JWKS endpoints, RS256, issuer, client audience,
   expiry, issued-at, subject, nonce, and authorized-party checks. GitHub's stable
   numeric ID comes from its authenticated API, with verified email retrieved from
   `/user/emails`, including private emails.
4. `(provider, subject)` identifies accounts. Matching email alone never signs into
   or merges an existing account. Email conflicts require explicit linking. New
   social-only accounts have an unusable password marker, not a shared password.
   Returning identities keep their original Spendze user ID even if provider email
   changes or is absent.
5. The backend redirects to the allowlisted frontend `/auth/callback` with a random
   60-second single-use handoff in the fragment. **No provider access token or Spendze
   JWT is included in any URL.** The handoff is useless without the tab's verifier.
   Its hash is stored in SQLite and it is bound to the exact frontend origin.
6. The callback page removes the fragment from history, posts the handoff/verifier,
   and establishes the existing localStorage JWT session after `/api/auth/me`
   validates the token and loads the profile. New accounts see the welcome message
   on `/dashboard`; returning accounts see their own dashboard.

Provider access/refresh tokens are not persisted. JWTs still use the existing
storage and expiry model. Logout clears the local session and dashboard state;
it does not sign the user out of Google/GitHub/Apple or introduce server-side JWT
revocation. No financial data or API secrets are sent to providers.

## Credentials and exact callbacks

Add only the new fields you need from `backend/.env.example` to your existing
backend configuration. Do not replace the existing `.env` file or rotate a working
JWT_SECRET as part of this setup. OAuth client secrets and Apple private keys must
never be placed in frontend VITE_ variables.

| Provider | Backend environment variables | Local provider callback | Production provider callback |
| --- | --- | --- | --- |
| Google | GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET | http://127.0.0.1:8000/api/auth/oauth/google/callback | https://spendze-backend.onrender.com/api/auth/oauth/google/callback |
| GitHub | GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET | http://127.0.0.1:8000/api/auth/oauth/github/callback | https://spendze-backend.onrender.com/api/auth/oauth/github/callback |
| Apple | APPLE_CLIENT_ID (Services ID), APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY (.p8 contents) | Not supported on HTTP localhost/IP | https://spendze-backend.onrender.com/api/auth/oauth/apple/callback |

Provider callbacks above belong to FastAPI. Do **not** register the frontend's
`/auth/callback` as the provider redirect URI. It is only the final Spendze handoff.
The local backend hostname is exactly `127.0.0.1`; use that same hostname for the
start and callback requests so the cookie matches. Register URLs exactly, without
a trailing slash. `OAUTH_BACKEND_URL` must be an origin, not a URL ending in `/api`.

### Google Cloud Console

1. Open Google Cloud Console / Google Auth Platform for your chosen project.
2. Set Branding (Spendze name, support email, developer contact) and Audience.
   While in testing, add the Google accounts you will use as test users.
3. Configure the requested identity scopes: `openid`, `email`, `profile` only.
4. Under Clients, create an OAuth client with application type **Web application**.
   Add the local and production Google callback URLs from the table. Separate
   development and production clients are preferable.
5. Store the client ID and client secret in the backend variables above. This
   server redirect flow does not require a frontend GIS script or client secret.
   If configuring Authorized JavaScript origins as well, use the exact frontend
   origins (`http://localhost:5173` and your confirmed production frontend).
6. Restart FastAPI. The provider-status endpoint should now show Google enabled.

This follows Google's official [OpenID Connect server flow](https://developers.google.com/identity/openid-connect/openid-connect).

### GitHub Developer Settings

1. GitHub Settings → Developer settings → OAuth Apps → New OAuth App.
2. Name it Spendze Local; set Homepage URL to `http://localhost:5173` and the
   authorization callback to the local GitHub URL in the table.
3. Generate a client secret and set GITHUB_CLIENT_ID/GITHUB_CLIENT_SECRET only in
   the backend. The app requests `user:email`, with no repository permissions.
4. Create a separate production OAuth App with your confirmed frontend homepage
   and the production GitHub callback. Use that app's credentials on Render.
5. If a user has a private email, `/user/emails` supplies their verified email.
   If no verified email exists, the user must verify one in GitHub first (or link
   an existing Spendze account explicitly). Never create a fake email address.

See GitHub's [authorization-code and PKCE documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps).

### Apple Developer Account

1. Use an existing Apple Developer membership/team with Sign in with Apple access.
   No membership purchase or enrollment is performed by this project.
2. Under Certificates, Identifiers & Profiles, enable Sign in with Apple on your
   primary App ID. Create a **Services ID** for the website and associate it with
   that primary App ID.
3. Configure domains for your confirmed HTTPS frontend and
   `spendze-backend.onrender.com`; add the exact Apple production callback above
   as a Return URL. Complete any ownership/association verification Apple requests.
4. Create a Sign in with Apple key, associate it with the primary App ID, and
   securely download the `.p8` file. Save Team ID, Key ID, Services ID, and private
   key contents in the backend variables. APPLE_PRIVATE_KEY accepts actual PEM
   newlines or literal `\n` separators. Do not commit the key file.
5. Set the public HTTPS OAUTH_BACKEND_URL and HTTPS frontend origin. The backend
   generates a short-lived ES256 client-secret JWT from the key on demand.
6. Apple posts to the callback using form_post. Its binding cookie is HttpOnly,
   Secure and SameSite=None. Other providers use SameSite=Lax and Secure on HTTPS.
7. A private-relay email is stored as provided in the verified ID token. The stable
   Apple subject identifies the user; the first supplied name is kept and is not
   overwritten by the generic returning-user label. The posted name is display
   metadata, not identity proof. Configure Apple relay mail sources only if you
   later send email through an approved sender domain; this app does not add email.

Apple does not accept localhost or IP callback URLs. To test locally, use an
approved public HTTPS development domain/tunnel for the backend **and frontend**,
register the development return URL, and configure exact origins accordingly.
No tunnel was created. Until then Apple stays disabled in normal HTTP development.
See Apple's [environment setup](https://developer.apple.com/documentation/signinwithapple/configuring-your-environment-for-sign-in-with-apple)
and [web authorization requirements](https://developer.apple.com/documentation/signinwithapplerestapi/request-an-authorization-to-the-sign-in-with-apple-server.).

## Local configuration and testing

Add these nonsecret backend values alongside the provider credentials you choose:

```dotenv
OAUTH_BACKEND_URL=http://127.0.0.1:8000
OAUTH_FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Both frontend origins must also appear in CORS_ORIGINS if you override that setting;
preserve your existing production origins. Do not use wildcards. Keep
`VITE_API_BASE_URL=http://127.0.0.1:8000` in the existing frontend environment.

In separate PowerShell windows (stop existing processes with Ctrl+C first):

```powershell
Set-Location D:\BuggetTracker\backend
& ..\.venv\Scripts\python.exe -m pip install -r requirements.txt
& ..\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload --no-access-log
```

```powershell
Set-Location D:\BuggetTracker\budget_Tracker
npm run dev -- --host localhost --port 5173 --strictPort
```

Visit `http://127.0.0.1:8000/api/auth/oauth/providers` to check enabled flags, then
open `http://localhost:5173/login`. Unconfigured providers are visibly disabled;
email/password login remains available. Use a disposable development database for
manual sign-up tests, not the production database. Set DATABASE_PATH for that test
process to a separate absolute `.db` path; do not change or delete your real database.

Check first-time login, logout, returning-provider login, dashboard refresh,
provider cancellation, and data isolation. To link an existing Spendze account,
sign in with its current method, open Settings → Linked sign-in accounts, and
click **Link** for your own provider. Linking requires a JWT issued within ten
minutes. It is an explicit authenticated top-level POST; the Spendze token stays
in the request body, never a URL. Matching email by itself never triggers linking.
Attempts to take an identity already linked to another account are rejected.
The current UI does not implement unlinking or switching an already linked identity.

Automated checks (isolated temporary databases, mocked provider HTTP responses,
generated test signing keys, no real provider requests):

Implementation verification: 86 backend tests and 17 frontend tests passed. The
frontend TypeScript/Vite production build passed; lint completed with existing
warnings. Provider tests cover first/returning identities, private GitHub emails,
Apple HTTPS form POST and relay addresses, signed-token claims/signatures, state
and cookie binding, replay, expiration, untrusted origins, and explicit linking.
Real consent screens, production callbacks, and browser rendering remain untested
until credentials and deployment settings are provided. No real test users were
created in the application's existing database.

```powershell
Set-Location D:\BuggetTracker
& .\.venv\Scripts\python.exe -m pytest backend/tests -q -p no:cacheprovider
Set-Location budget_Tracker
node --test tests/*.test.mjs
npm run build
npm run lint
```

## Safe Render and Vercel deployment

1. Confirm the backend is the **Python FastAPI service** and the frontend is the
   Vite project. Do not launch `backend/package.json`'s legacy Node server.
2. Back up the existing SQLite database using a consistent SQLite backup, and
   confirm the existing deployment's DATABASE_PATH. Keep that path and data. OAuth
   startup creates only three new tables with CREATE TABLE IF NOT EXISTS; it does
   not reset or merge users or move any financial records.
3. In Render, use root directory `backend`, build command
   `pip install -r requirements.txt`, and start command
   `uvicorn main:app --host 0.0.0.0 --port $PORT --no-access-log`.
   Keep your existing strong JWT_SECRET and other working settings.
4. Add provider production credentials, `APP_ENV=production`,
   `OAUTH_BACKEND_URL=https://spendze-backend.onrender.com`, and
   `OAUTH_FRONTEND_ORIGINS=https://bugget-tracker.vercel.app` (replace with the
   confirmed frontend domain if different). Ensure that same exact frontend
   origin is in CORS_ORIGINS; preserve other legitimate existing entries.
5. SQLite and provider identity mappings must survive restarts and redeploys.
   Render's default filesystem is ephemeral. Use an **existing persistent disk**
   and its configured database path. If persistence is absent, plan a backed-up
   migration before deployment; do not point DATABASE_PATH at an empty file and
   assume existing users were migrated. Persistent disks require an eligible paid
   service; none was purchased or provisioned here. Use one service instance for
   this local SQLite architecture. See [Render disk documentation](https://render.com/docs/disks).
6. In Vercel, root directory `budget_Tracker`, build `npm run build`, output `dist`,
   and VITE_API_BASE_URL set to `https://spendze-backend.onrender.com`. Do not upload
   backend secrets. The added `vercel.json` SPA rewrite supports `/auth/callback`
   and direct dashboard loads, following [Vercel's Vite guidance](https://vercel.com/docs/frameworks/frontend/vite).
7. Register exact production provider callbacks before enabling buttons, then
   manually deploy when ready. Verify provider status and use an approved test
   account. Do not enable debug request-body logging; authorization codes and
   link-session POST bodies should not be captured by app/proxy analytics.

Browser sessionStorage/localStorage access is required. A closed tab, cleared
storage, expired handoff, or canceled provider flow requires starting again.
The existing localStorage JWT model remains; this change does not add cookies
for long-lived Spendze sessions or provider-account disconnect notifications.
Apple account transfer/revocation notifications would be separate lifecycle work.

## Files changed for this task

- Backend: `oauth_service.py`, `routers/oauth_router.py`, `database.py`, `main.py`,
  `requirements.txt`, `.env.example`, `tests/conftest.py`, `tests/test_oauth.py`.
- Frontend: `src/lib/api.ts`, `src/lib/socialAuth.ts`, `src/context/AuthContext.tsx`,
  `src/pages/SocialCallbackPage.tsx`, `src/RootRouter.tsx`, `src/App.tsx`,
  `src/components/SocialLoginButtons.tsx`, `src/components/ui/auth-page.tsx`,
  `src/components/AuthModal.tsx`, `src/components/DashboardLayout.tsx`,
  `tests/auth-session.test.mjs`, `tests/social-auth.test.mjs`, `vercel.json`.
- This setup guide. Existing unrelated in-progress changes were preserved.
