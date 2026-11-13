import { withAuth, json, error, q } from "@/lib/http";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
// GET /api/providers/expiring?org_id=...&days=60
export const GET = withAuth((req) => {
  const orgId = q(req, "org_id");
  const days = Math.min(Math.max(Number(q(req, "days") ?? 60) || 60, 1), 365);
  if (!orgId) return error(400, "MISSING_ORG_ID", "Provide ?org_id=");
  const cutoff = Date.now() + days * 86400000;
  const items = db().providers.filter((p) => p.org_id === orgId).flatMap((p) =>
    p.credentials.filter((c) => new Date(c.expires_on).getTime() <= cutoff).map((c) => ({
      provider: p.name, npi: p.npi, department: p.department, credential: c.type, expires_on: c.expires_on,
      already_expired: new Date(c.expires_on).getTime() < Date.now(),
    }))).sort((a, b) => a.expires_on.localeCompare(b.expires_on));
  return json({ ok: true, window_days: days, count: items.length, expiring: items });
});
