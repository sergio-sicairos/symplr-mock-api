import { withAuth, json, error, q, orgFromEmail } from "@/lib/http";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
// GET /api/organizations/lookup?email=... | ?domain=... | ?id=... | ?name=...
export const GET = withAuth((req) => {
  const { organizations } = db();
  const email = q(req, "email"), domain = q(req, "domain")?.toLowerCase(), id = q(req, "id"), name = q(req, "name")?.toLowerCase();
  const d = domain ?? (email ? orgFromEmail(email) : null);
  const org = organizations.find((o) => (id && o.id === id) || (d && o.domain === d) || (name && o.name.toLowerCase().includes(name)));
  if (!org) return error(404, "ORG_NOT_FOUND", "No customer organization matches that email, domain, id, or name.");
  const daysToRenewal = Math.round((new Date(org.contract_renewal_date).getTime() - Date.now()) / 86400000);
  const atCap = org.licenses.filter((l) => l.seats_used >= l.seats_purchased).map((l) => l.product);
  return json({ ok: true, organization: { ...org, days_to_renewal: daysToRenewal, products_at_seat_cap: atCap } });
});
