# Spendze assistant audit and local verification

## Architecture found

The actual checkout is `D:\BuggetTracker`. SQLite is configured through
`backend/config.py`; the default database is `backend/spendzy.db`.
`DashboardLayout.tsx` owns the chat UI and `src/lib/api.ts` calls the authenticated
`POST /api/ai/chat` endpoint. `financialAssistant.ts`, `financialInsights.ts`,
`financialForecast.ts`, and `budgetStatus.ts` provide existing local calculations.
`backend/ai_service.py` retrieves user-scoped transactions and budgets, calculates
verified facts, handles standard questions, and optionally calls Gemini using the
existing backend-only configuration and google-genai dependency.

This is a hybrid assistant: deterministic calculations plus a real optional LLM.
It is not a model trained by this project.

## Findings and changes

Previously the frontend decided which questions could reach the backend. Separate
keyword systems produced inconsistent answers; daily activity was missing and
backend dates depended on the deployment server's timezone. Simple questions
could fall through to a formal model response. New Chat also allowed a late
request to restore stale conversation context.

The frontend now requests backend answers first, preserving existing local
handlers when the backend explicitly reports an unavailable conversational
provider for a supported local intent. Network/database failures are shown as
failures, not as empty accounts. New Chat rejects stale replies before changing
context. Existing purple styling, animations, scrolling, and submission guards
remain; input has a length limit and accessible label, the message list is a live
log, bubbles wrap on mobile, and suggested questions include daily activity.

The backend now provides friendly greetings and empty-state answers, occasional
verified first-name use, common typo normalization, daily activity/income/expense
totals, explicit ISO-date validation, daily largest expenses and category totals,
date follow-ups, previous-month comparisons, budget overview/remaining amounts,
and saving suggestions distinguished from guaranteed savings. Relative dates
use IST (Asia/Kolkata), appropriate for the current Indian-rupee application,
independent of Render's UTC timezone. All SQL remains scoped to the JWT user.
Forecast responses now set their warning flag. Test fixtures explicitly disable
Gemini credentials to avoid unintended external requests and nondeterministic tests.

## Verification

- 52 backend tests passed using isolated temporary SQLite databases.
- New coverage includes greetings, typos, empty accounts, mixed income/expenses,
  daily totals, date follow-ups, December/January comparisons, invalid/future
  dates, absent/exceeded budgets, provider/database failures, and attempts to
  request another user's data or inject a user_id into the request.
- Frontend TypeScript check and Vite production build passed.
- Frontend lint completed with existing warnings; build has a bundle-size warning.
- Browser rendering and a live Gemini request were not tested in this audit.
- No existing user financial data was changed; no production test users created.

## Remaining limits and integration recommendation

Date support is today/yesterday/current month/last month/ISO date, not arbitrary
natural-language ranges. Typo correction is deliberately bounded. Context is
limited to ten recent messages plus category state and is cleared by New Chat;
it is not persistent memory. Detailed historical budget questions require more
backend query support. Existing local forecast fallback uses the browser clock.
Recorded transaction dates describe activity dates, not insertion timestamps.
Large accounts currently require reading their transaction history; pagination
or database aggregates would be an appropriate later optimization.

Keep the existing Gemini integration for language flexibility and deterministic
handlers for arithmetic. No new service, key, paid plan, or model change was added.
The existing numeric-output guard is defense in depth, not proof of factual
correctness: it cannot validate every claim or detect amounts attached to the
wrong concept. A later, moderate-complexity improvement is schema-validated LLM
intent extraction with server-owned read-only tools and server-rendered financial
answers. Limit tool parameters to validated dates/categories, derive user identity
only from authentication, minimize provider context, redact logs, and add usage
limits and prompt-injection evaluations before a public rollout.

Costs depend on the selected model and token volume. As an illustrative estimate,
Google lists Gemini 2.5 Flash standard text prices of $0.30 per million input
tokens and $2.50 per million output tokens. At 2,000 input and 300 output tokens
per reply, 1,000 replies would be about $1.35, excluding extra reasoning tokens,
retries, tools, and taxes. This is an example, not a quote for the currently
configured model. Check https://ai.google.dev/gemini-api/docs/pricing before
enabling billing. Evaluate provider data-use terms before sending real financial
data; free and paid tiers have different data-use terms.

## Try locally

In separate PowerShell windows:

```powershell
Set-Location D:\BuggetTracker\backend
& ..\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

```powershell
Set-Location D:\BuggetTracker\budget_Tracker
npm run dev -- --host localhost --port 5173 --strictPort
```

Sign in at http://localhost:5173 and open AI Assistant. Try `hey buddy`,
`did i add anything in it`, `How much did I spend today?`, `and yesterday?`,
`Compare this month with last month`, `Check my budgets`, and
`How can I save ₹2,000?`. New Chat should clear messages and category references,
including when clicked while a reply is pending. Use a separate disposable local
database/account to exercise transaction writes; do not create test activity in
production. No push or deployment is part of this work.

Run automated checks from the project root:

```powershell
& .\.venv\Scripts\python.exe -m pytest backend/tests -q -p no:cacheprovider
Set-Location budget_Tracker
npm run build
npm run lint
```
