# Google OAuth production redirect fix

## Confirmed production observations

The public Render backend was inspected without completing Google authentication:

- `/api/auth/oauth/providers` reported Google enabled.
- Starting from `https://budget-tracker.vercel.app` returned 400 `invalid_origin`.
- Starting with the old `https://bugget-tracker.vercel.app` origin returned a Google
  authorization redirect containing
  `redirect_uri=http://127.0.0.1:8000/api/auth/oauth/google/callback`.
- The binding cookie lacked Secure; it was HttpOnly, SameSite=Lax, and host-only.

Only one short-lived state record was created for that diagnostic request; no
Google authorization was completed and no user or financial records were created.
Private Render/Vercel environment settings were not available for direct inspection.

## Root cause

The backend constructs the Google redirect_uri, not the frontend. Its former
production check used APP_ENV/NODE_ENV only. Missing APP_ENV (or development values
copied from a local .env) permits development mode on Render's Python runtime.
With OAUTH_BACKEND_URL absent, that mode falls back to `http://127.0.0.1:8000`;
an explicit copied localhost value also passes in development mode. The observed
authorization URL confirms the deployed service took a local callback path,
although the private settings are needed to distinguish those two configuration cases.

The state and cookie were created on Render, but the browser returned to loopback.
Its host-only Render cookie is not sent to 127.0.0.1, and a locally running backend
does not have Render's state database. Rejecting that callback as expired/invalid
is correct security behavior. Reusing an old callback/state or trying to replace
its hostname manually cannot fix it; restart sign-in from the frontend after deployment.

There is also a domain mismatch: the current frontend is `budget-tracker.vercel.app`,
while the old default allowlist used `bugget-tracker.vercel.app`. The live request
to the actual origin confirmed that its effective allowlist needs correction.

## Code changes

- `backend/config.py`: RENDER=true always selects production settings, even if
  APP_ENV/NODE_ENV were copied as development. Adds the actual frontend origin to
  defaults while retaining existing local and previous production origins.
- `backend/oauth_service.py`: explicit OAUTH_BACKEND_URL takes priority; if unset
  on Render, use RENDER_EXTERNAL_URL. Production never falls back to localhost and
  rejects HTTP or loopback callback bases. Public origins come only from server
  configuration, never untrusted Host/Forwarded headers.
- `backend/.env.example`: clarifies local versus production callback settings.
- `backend/tests/conftest.py` and `backend/tests/test_oauth.py`: isolate Render
  environment detection and cover hosted callback generation and cookie binding.
- `backend/scripts/reset_password.py`: include the previously tested merge-marker
  cleanup so a fresh checkout can collect backend tests, retaining session revocation.
- This guide. Frontend initiation, Google credentials, JWT/session architecture,
  account linking, PKCE, nonce checks, and financial data were preserved.

Render documents [RENDER=true and RENDER_EXTERNAL_URL](https://render.com/docs/environment-variables).
Its NODE_ENV=production default is under the Node.js runtime, not Python.

## Required configuration — apply only after approval

In the existing Render **Python** service, set or verify:

```dotenv
APP_ENV=production
OAUTH_BACKEND_URL=https://spendze-backend.onrender.com
OAUTH_FRONTEND_ORIGINS=https://budget-tracker.vercel.app
CORS_ORIGINS=https://budget-tracker.vercel.app
```

Preserve other legitimate origins by keeping them as comma-separated entries if
needed. The actual frontend origin must appear in both allowlists. Do not add
wildcards or arbitrary preview domains. Keep the existing GOOGLE_CLIENT_ID,
GOOGLE_CLIENT_SECRET, JWT_SECRET, DATABASE_PATH, and other credentials. Do not
copy a development .env file into production. RENDER and RENDER_EXTERNAL_URL are
supplied by Render; the explicit OAUTH_BACKEND_URL above remains recommended.

In Vercel's **Production** environment, set or verify:

```dotenv
VITE_API_BASE_URL=https://spendze-backend.onrender.com
```

No Google secret belongs in Vercel frontend variables. Vite reads this value at
build time, so a frontend rebuild is needed if its value changes. Frontend code
already starts OAuth with API_ROOT_URL and location.origin and therefore supports
the actual domain without a hardcoded frontend hostname.

In the existing Google Cloud OAuth Web Application client, add/verify this exact
**Authorized redirect URI**:

```text
https://spendze-backend.onrender.com/api/auth/oauth/google/callback
```

If maintaining a separate local-development client, its local callback may remain
`http://127.0.0.1:8000/api/auth/oauth/google/callback`. Do not use it for production.
If Authorized JavaScript origins are configured, include
`https://budget-tracker.vercel.app`. The frontend `/auth/callback` route is Spendze's
handoff destination, not Google's redirect URI. Google requires matching registered
redirect URIs: see the [official OIDC setup](https://developers.google.com/identity/openid-connect/openid-connect).

## Deployment and verification

The investigation did not edit remote environment settings. Code publication and
deployment require explicit approval. Deployment procedure after approval:

1. Review the patch and preserve a backup of the existing SQLite database. Keep
   the same persistent DATABASE_PATH and single service/shared database for state.
2. Apply the Render settings above and deploy the reviewed backend revision.
   Use the existing FastAPI start command, for example
   `uvicorn main:app --host 0.0.0.0 --port $PORT --no-access-log`. A restart during
   OAuth can interrupt a pending flow; start a new one after deployment.
3. Confirm Vercel's production API variable and deploy/rebuild only if its value
   or frontend revision needs updating. The local frontend production build has
   been checked; the remote Vercel environment itself has not been edited.
4. Open `https://budget-tracker.vercel.app/login` and start a fresh Google sign-in.
   Check in browser Network tools that the first request targets Render and its
   Google authorization redirect has the exact HTTPS Render callback above.
   Do not share full authorization URLs, cookies, state, codes, or tokens.
5. Verify the cookie is host-only on `spendze-backend.onrender.com`, HttpOnly,
   Secure, SameSite=Lax, and path `/api/auth/oauth`. Google's top-level GET callback
   sends it despite the different frontend/provider domains. Browser cookie
   restrictions do not require weakening validation or adding wildcard domains.
6. Complete sign-in using an approved account, verify `/dashboard`, refresh, and
   test email/password login and explicit Settings linking. Matching an existing
   unlinked email must still require linking; do not merge accounts automatically.

The database still stores hashed state/browser bindings with a ten-minute expiry;
callbacks atomically consume state before provider verification. PKCE and nonce
validation remain enabled. The final single-use handoff remains proof-bound to
the tab and exact frontend origin, with no session JWT in URLs.

Automated tests use temporary databases and mocked provider responses; real Google
consent/session completion is not verified until the reviewed fix is deployed.

Local verification: 113 backend tests and 33 frontend tests passed. The frontend
TypeScript/Vite production build passed, with its existing bundle-size warning.
The new hosted roundtrip test validates the actual frontend's CORS preflight,
HTTPS Render callback, Secure host-only cookie, rejection on the loopback host,
and successful proof-bound exchange on Render. Existing authentication, password
recovery, linking, state-replay, PKCE, and identity-verification regression tests pass.
