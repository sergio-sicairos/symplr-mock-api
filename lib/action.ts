import { db } from "./db";

// Each action returns a plain result. ok:false means the agent should explain the
// situation rather than retry (e.g. SSO-managed account, expired credentials).
type Result = { ok: boolean; [k: string]: unknown };
const fail = (code: string, message: string): Result => ({ ok: false, error: { code, message } });
const lc = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : "");
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function lookupOrganization(a: { email?: string; domain?: string; name?: string; id?: string }): Result {
  const domain = lc(a.domain) || (a.email ? lc(a.email).split("@")[1] : "");
  const name = lc(a.name), id = str(a.id);
  const org = db().organizations.find((o) => (id && o.id === id) || (domain && o.domain === domain) || (name && o.name.toLowerCase().includes(name)));
  if (!org) return fail("ORG_NOT_FOUND", "No customer organization matches that email, domain, id, or name.");
  const days_to_renewal = Math.round((new Date(org.contract_renewal_date).getTime() - Date.now()) / 86400000);
  const products_at_seat_cap = org.licenses.filter((l) => l.seats_used >= l.seats_purchased).map((l) => l.product);
  return { ok: true, organization: { ...org, days_to_renewal, products_at_seat_cap } };
}

export function lookupUser(a: { email?: string }): Result {
  const email = lc(a.email);
  if (!email) return fail("MISSING_EMAIL", "email is required.");
  const user = db().users.find((u) => u.email === email);
  if (!user) return fail("USER_NOT_FOUND", `No symplr user with email ${email}.`);
  const org = db().organizations.find((o) => o.id === user.org_id);
  return { ok: true, user, organization: org ? { id: org.id, name: org.name, support_plan: org.support_plan } : null };
}

export function unlockUser(a: { email?: string }): Result {
  const email = lc(a.email);
  if (!email) return fail("MISSING_EMAIL", "email is required.");
  const user = db().users.find((u) => u.email === email);
  if (!user) return fail("USER_NOT_FOUND", `No symplr user with email ${email}.`);
  if (user.status === "deactivated") return fail("USER_DEACTIVATED", "Account is deactivated. Only the customer's Org Admin can reactivate it.");
  if (user.sso_enabled) return fail("SSO_MANAGED", "User signs in with SSO. Lockouts are managed by the customer's identity provider.");
  if (user.status !== "locked") return { ok: true, changed: false, message: `Account is already ${user.status}.`, user };
  user.status = "active"; user.failed_login_attempts = 0;
  return { ok: true, changed: true, message: "Account unlocked. User can sign in now.", user };
}

export function sendPasswordReset(a: { email?: string }): Result {
  const email = lc(a.email);
  if (!email) return fail("MISSING_EMAIL", "email is required.");
  const user = db().users.find((u) => u.email === email);
  if (!user) return fail("USER_NOT_FOUND", `No symplr user with email ${email}.`);
  if (user.sso_enabled) return fail("SSO_MANAGED", "User signs in with SSO. Password resets go through the customer's identity provider.");
  if (user.status === "deactivated") return fail("USER_DEACTIVATED", "Account is deactivated.");
  return { ok: true, message: `Password reset link sent to ${email}. Link expires in 30 minutes.` };
}

export function listIntegrations(a: { org_id?: string; status?: string }): Result {
  const orgId = str(a.org_id);
  if (!orgId) return fail("MISSING_ORG_ID", "org_id is required. Get it from lookup_organization or lookup_user.");
  let list = db().integrations.filter((i) => i.org_id === orgId);
  if (a.status) list = list.filter((i) => i.status === a.status);
  const unhealthy = list.filter((i) => i.status !== "healthy").length;
  return { ok: true, summary: unhealthy ? `${unhealthy} integration(s) need attention.` : "All integrations healthy.", integrations: list };
}

export function resyncIntegration(a: { integration_id?: string }): Result {
  const integ = db().integrations.find((i) => i.id === str(a.integration_id));
  if (!integ) return fail("INTEGRATION_NOT_FOUND", `No integration ${a.integration_id}.`);
  if (integ.status === "healthy") return { ok: true, changed: false, message: "Integration is healthy. No resync needed.", integration: integ };
  if (integ.error_code === "AUTH_TOKEN_EXPIRED") {
    return { ok: false, changed: false, requires_customer_action: true,
      message: "Resync failed: credentials are expired. The customer must re-authorize. A resync from symplr cannot fix this.", integration: integ };
  }
  const cleared = integ.records_pending;
  Object.assign(integ, { status: "healthy", error_code: null, error_message: null, records_pending: 0, last_successful_sync_at: new Date().toISOString() });
  return { ok: true, changed: true, message: `Resync succeeded. ${cleared} queued record(s) delivered.`, integration: integ };
}

export function searchProviders(a: { org_id?: string; name?: string; npi?: string }): Result {
  const orgId = str(a.org_id), npi = str(a.npi), name = lc(a.name).replace(/^dr\.?\s*/, "");
  if (!name && !npi) return fail("MISSING_QUERY", "Provide name or npi.");
  const providers = db().providers.filter((p) => (!orgId || p.org_id === orgId) && ((npi && p.npi === npi) || (name && p.name.toLowerCase().includes(name))));
  if (!providers.length) return fail("PROVIDER_NOT_FOUND", "No provider file matches.");
  return { ok: true, count: providers.length, providers };
}

export function listExpiringCredentials(a: { org_id?: string; days?: number }): Result {
  const orgId = str(a.org_id);
  if (!orgId) return fail("MISSING_ORG_ID", "org_id is required.");
  const days = Math.min(Math.max(Number(a.days ?? 60) || 60, 1), 365);
  const cutoff = Date.now() + days * 86400000;
  const expiring = db().providers.filter((p) => p.org_id === orgId).flatMap((p) =>
    p.credentials.filter((c) => new Date(c.expires_on).getTime() <= cutoff).map((c) => ({
      provider: p.name, npi: p.npi, department: p.department, credential: c.type, expires_on: c.expires_on,
      already_expired: new Date(c.expires_on).getTime() < Date.now(),
    }))).sort((x, y) => x.expires_on.localeCompare(y.expires_on));
  return { ok: true, window_days: days, count: expiring.length, expiring };
}

export function lookupVendorRep(a: { email?: string }): Result {
  const email = lc(a.email);
  if (!email) return fail("MISSING_EMAIL", "email is required.");
  const rep = db().vendor_reps.find((v) => v.email === email);
  if (!rep) return fail("VENDOR_REP_NOT_FOUND", `No symplr Access vendor rep with email ${email}.`);
  const facility_names = db().organizations.filter((o) => rep.facilities.includes(o.id)).map((o) => o.name);
  return { ok: true, vendor_rep: { ...rep, facility_names } };
}

export function getPlatformStatus(a: { product?: string }): Result {
  const product = lc(a.product).replace(/^symplr\s*/, "");
  let incidents = db().incidents;
  if (product) incidents = incidents.filter((i) => i.products.some((p) => p.toLowerCase().includes(product)));
  const active = incidents.filter((i) => i.status !== "resolved");
  return { ok: true, summary: active.length ? `${active.length} active incident(s).` : "All systems operational.",
    active_incidents: active, recently_resolved: incidents.filter((i) => i.status === "resolved") };
}

export function createEscalation(a: { org_id?: string; product?: string; severity?: string; summary?: string }): Result {
  const org_id = str(a.org_id), summary = str(a.summary);
  if (!org_id || !summary) return fail("MISSING_FIELDS", "org_id and summary are required.");
  const severity = ["P1", "P2", "P3"].includes(String(a.severity)) ? String(a.severity) : "P3";
  const esc = { id: `ESC-${4100 + db().escalations.length + 1}`, org_id, product: str(a.product) || "unspecified", severity, summary, created_at: new Date().toISOString(), status: "open" as const };
  db().escalations.push(esc);
  const sla = severity === "P1" ? "1 hour" : severity === "P2" ? "4 hours" : "1 business day";
  return { ok: true, escalation: esc, message: `Engineering escalation ${esc.id} created. Target first response: ${sla}.` };
}
