import { withAuth, json, error, body } from "@/lib/http";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
// POST /api/users/unlock  { "email": "..." }
export const POST = withAuth(async (req) => {
  const email = String((await body(req)).email ?? "").toLowerCase();
  if (!email) return error(400, "MISSING_EMAIL", "Body must include email.");
  const user = db().users.find((u) => u.email === email);
  if (!user) return error(404, "USER_NOT_FOUND", `No symplr user with email ${email}.`);
  if (user.status === "deactivated") return error(409, "USER_DEACTIVATED", "Account is deactivated. Only the customer's Org Admin can reactivate it.");
  if (user.sso_enabled) return error(409, "SSO_MANAGED", "User signs in with SSO. Lockouts are managed by the customer's identity provider.");
  if (user.status !== "locked") return json({ ok: true, changed: false, message: `Account is already ${user.status}.`, user });
  user.status = "active"; user.failed_login_attempts = 0;
  return json({ ok: true, changed: true, message: "Account unlocked. User can sign in now.", user });
});
