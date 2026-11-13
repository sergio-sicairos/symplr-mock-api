import { withAuth, json, error, q } from "@/lib/http";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
// GET /api/vendor-reps/lookup?email=...
export const GET = withAuth((req) => {
  const email = q(req, "email")?.toLowerCase();
  if (!email) return error(400, "MISSING_EMAIL", "Provide ?email=");
  const rep = db().vendor_reps.find((v) => v.email === email);
  if (!rep) return error(404, "VENDOR_REP_NOT_FOUND", `No symplr Access vendor rep with email ${email}.`);
  const facilities = db().organizations.filter((o) => rep.facilities.includes(o.id)).map((o) => o.name);
  return json({ ok: true, vendor_rep: { ...rep, facility_names: facilities } });
});
