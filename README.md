# symplr Mock API (for Pylon AI Agent demos)

A fake symplr backend with synthetic data (no real people, NPIs, or PHI). Pylon's Support Agent calls these endpoints through custom API actions so you can demo end-to-end resolution: account lookups, unlocks, integration resyncs, credentialing status, vendor badge issues, and escalations.

## 1. Deploy (about 5 minutes)

1. Push this folder to a new GitHub repo.
2. In Vercel: **Add New > Project**, import the repo (framework auto-detects as Next.js).
3. Add an environment variable `MOCK_API_KEY` with a long random string.
4. Deploy. Check `https://<your-app>.vercel.app/api/health` returns `{"ok":true}`.

Run locally: `npm install`, `cp .env.example .env.local`, set the key, `npm run dev`.

**State note:** data lives in memory. Writes (unlocks, resyncs, escalations) persist while the Vercel instance is warm and reset on cold start. Call `POST /api/admin/reset` before every demo so you start clean.

## 2. Auth

Every endpoint except `/api/health` requires the header `x-api-key: <MOCK_API_KEY>` (or `Authorization: Bearer <key>`). Add this header to each custom action in Pylon.

## 3. Pylon custom actions to create

Settings > Actions > add a custom API action for each. Base URL: `https://<your-app>.vercel.app`

| Action name | Method + path | Inputs | When the agent should use it |
|---|---|---|---|
| Look up customer org | `GET /api/organizations/lookup?email={email}` | requester email (also accepts `domain`, `id`, `name`) | First step on any ticket: identifies the health system, products, support plan, CSM, renewal date, seat caps |
| Look up symplr user | `GET /api/users/lookup?email={email}` | email | Login, access, or "I can't get in" questions |
| Unlock user account | `POST /api/users/unlock` body `{"email":"{email}"}` | email | User is locked out. Returns 409 if SSO-managed or deactivated |
| Send password reset | `POST /api/users/reset-password` body `{"email":"{email}"}` | email | Forgotten password (non-SSO users only) |
| Check integrations | `GET /api/integrations?org_id={org_id}` | org_id | Data not flowing between symplr and Epic, Workday, UKG, Lawson, badge systems |
| Resync integration | `POST /api/integrations/resync` body `{"integration_id":"{integration_id}"}` | integration_id | Integration degraded. Returns 409 + `requires_customer_action` if credentials expired |
| Search provider file | `GET /api/providers/search?org_id={org_id}&name={name}` | org_id, name or npi | "Why is Dr. X's application stuck?" |
| Expiring credentials | `GET /api/providers/expiring?org_id={org_id}&days={days}` | org_id, days | "What licenses expire in the next 60 days?" |
| Vendor rep badge status | `GET /api/vendor-reps/lookup?email={email}` | email | symplr Access check-in denied at a facility |
| Platform status | `GET /api/status?product={product}` | product (optional) | Customer reports slowness or outage |
| Create engineering escalation | `POST /api/escalations` body `{"org_id":"...","product":"...","severity":"P1/P2/P3","summary":"..."}` | org_id, product, severity, summary | Agent can't resolve and needs engineering |

## 4. Demo scenarios (seeded and ready)

**A. Locked out user (full self-serve resolution)**
From `jdavis@riverbendhealth.org`: "I'm locked out of symplr Provider and have a committee packet due today."
Expected: agent looks up user, sees `locked` + 6 failed attempts, calls unlock, confirms. Try `tnguyen@riverbendhealth.org` to show the SSO guardrail (agent should explain it's managed by their IdP instead of unlocking).

**B. Integration failure the agent can't fix (smart escalation)**
From `sgarcia@mesavalleymc.org`: "New hires from Workday haven't shown up in symplr Workforce for almost a week."
Expected: agent finds `int_mv_workday` failing with `AUTH_TOKEN_EXPIRED`, attempts resync, gets `requires_customer_action`, gives the customer exact re-authorization steps, and notes the org is red health. Optionally files a P2 escalation.

**C. Integration the agent can fix**
From `lhansen@northfieldregional.org`: "Provider updates aren't hitting Epic."
Expected: `int_nf_epic` degraded with SFTP timeout, agent resyncs, 37 records delivered.

**D. Credentialing status**
From `amorales@riverbendhealth.org`: "Why is Dr. Vasquez's appointment still on hold? Committee is in two weeks."
Expected: agent reports the expired DEA registration and missing peer reference.

**E. Expiring credentials report**
From `lhansen@northfieldregional.org`: "Which of our providers have anything expiring in the next 30 days?"
Expected: Dr. Holm's malpractice COI and state license.

**F. Vendor rep denied at check-in**
From `tyler.brooks@medisurge-demo.com`: "Kiosk at Lakeshore won't print my badge, I have a case in 20 minutes."
Expected: agent lists the two missing requirements (flu attestation, OR orientation).

**G. Seat cap + renewal (CSM handoff / expansion signal)**
From `kbrennan@lakeshorechildrens.org`: "We can't add any more vendors in symplr Access."
Expected: agent sees 250/250 seats and renewal in about 4 weeks, explains the cap, and routes to CSM Marcus Lee.

**H. Live incident**
From `tnguyen@riverbendhealth.org`: "Time punches look delayed this morning."
Expected: agent checks status, finds the active Workforce incident, shares the customer message.

## 5. Seed reference

Orgs: `org_riverbend`, `org_lakeshore`, `org_mesavalley`, `org_northfield`, `org_coastal`
Edit `lib/seed.ts` to add accounts or tailor scenarios to what the prospect actually cares about. Dates are relative to today, so expiring items stay fresh.
