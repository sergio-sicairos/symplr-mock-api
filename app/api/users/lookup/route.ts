import { withAuth, json, error, q } from "@/lib/http";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
// GET /api/users/lookup?email=...
export const GET = withAuth((req) => {
  const email = q(req, "email")?.toLowerCase();
  if (!email) return error(400, "MISSING_EMAIL", "Provide ?email=");
  const { users, organizations } = db();
  const user = users.find((u) => u.email === email);
  if (!user) return error(404, "USER_NOT_FOUND", `No symplr user with email ${email}.`);
  const org = organizations.find((o) => o.id === user.org_id);
  return json({ ok: true, user, organization: org ? { id: org.id, name: org.name, support_plan: org.support_plan } : null });
});
