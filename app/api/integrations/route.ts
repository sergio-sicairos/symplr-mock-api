import { withAuth, json, error, q } from "@/lib/http";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
// GET /api/integrations?org_id=...  (optional &status=failing)
export const GET = withAuth((req) => {
  const orgId = q(req, "org_id"), status = q(req, "status");
  if (!orgId) return error(400, "MISSING_ORG_ID", "Provide ?org_id=");
  let list = db().integrations.filter((i) => i.org_id === orgId);
  if (status) list = list.filter((i) => i.status === status);
  const unhealthy = list.filter((i) => i.status !== "healthy").length;
  return json({ ok: true, summary: unhealthy ? `${unhealthy} integration(s) need attention.` : "All integrations healthy.", integrations: list });
});
