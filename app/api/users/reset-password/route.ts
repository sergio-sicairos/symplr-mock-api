import { withAuth, json, error, body } from "@/lib/http";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
// POST /api/users/reset-password  { "email": "..." }
export const POST = withAuth(async (req) => {
  const email = String((await body(req)).email ?? "").toLowerCase();
  if (!email) return error(400, "MISSING_EMAIL", "Body must include email.");
  const user = db().users.find((u) => u.email === email);
  if (!user) return error(404, "USER_NOT_FOUND", `No symplr user with email ${email}.`);
  if (user.sso_enabled) return error(409, "SSO_MANAGED", "User signs in with SSO. Password resets go through the customer's identity provider.");
  if (user.status === "deactivated") return error(409, "USER_DEACTIVATED", "Account is deactivated.");
  return json({ ok: true, message: `Password reset link sent to ${email}. Link expires in 30 minutes.` });
});
