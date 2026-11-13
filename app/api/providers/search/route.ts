import { withAuth, json, error, q } from "@/lib/http";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
// GET /api/providers/search?org_id=...&name=...  or  ?npi=...
export const GET = withAuth((req) => {
  const orgId = q(req, "org_id"), name = q(req, "name")?.toLowerCase().replace(/^dr\.?\s*/, ""), npi = q(req, "npi");
  if (!name && !npi) return error(400, "MISSING_QUERY", "Provide ?name= or ?npi=");
  const results = db().providers.filter((p) =>
    (!orgId || p.org_id === orgId) && ((npi && p.npi === npi) || (name && p.name.toLowerCase().includes(name))));
  if (!results.length) return error(404, "PROVIDER_NOT_FOUND", "No provider file matches.");
  return json({ ok: true, count: results.length, providers: results });
});
