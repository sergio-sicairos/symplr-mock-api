import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Stateless MCP server (Streamable HTTP transport, JSON responses) over synthetic symplr data.
// Auth: x-api-key header, Authorization: Bearer <key>, or ?key=<key> in the URL.

type Result = { ok: boolean; [k: string]: unknown };
const fail = (code: string, message: string, extra: Record<string, unknown> = {}): Result => ({ ok: false, error: { code, message }, ...extra });
const lc = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : "");
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const now = () => new Date().toISOString();
const ki = (id: string | null) => (id ? db().known_issues.find((k) => k.id === id) ?? null : null);

// ---------- accounts and users ----------
function lookupOrganization(a: any): Result {
  const domain = lc(a.domain) || (a.email ? lc(a.email).split("@")[1] : "");
  const name = lc(a.name), id = str(a.id);
  const org = db().organizations.find((o) => (id && o.id === id) || (domain && o.domain === domain) || (name && o.name.toLowerCase().includes(name)));
  if (!org) return fail("ORG_NOT_FOUND", "No customer organization matches that email, domain, id, or name. If the person is a vendor rep, use lookup_vendor_rep.");
  const days_to_renewal = Math.round((new Date(org.contract_renewal_date).getTime() - Date.now()) / 86400000);
  const products_at_seat_cap = org.licenses.filter((l) => l.seats_used >= l.seats_purchased).map((l) => l.product);
  return { ok: true, organization: { ...org, days_to_renewal, products_at_seat_cap } };
}
function lookupUser(a: any): Result {
  const email = lc(a.email);
  if (!email) return fail("MISSING_EMAIL", "email is required.");
  const user = db().users.find((u) => u.email === email);
  if (!user) return fail("USER_NOT_FOUND", `No symplr customer user with email ${email}. If this is a vendor rep, use lookup_vendor_rep.`);
  const org = db().organizations.find((o) => o.id === user.org_id);
  return { ok: true, user, organization: org ? { id: org.id, name: org.name, support_plan: org.support_plan } : null };
}
function unlockUser(a: any): Result {
  const email = lc(a.email);
  const user = db().users.find((u) => u.email === email);
  if (!user) return fail("USER_NOT_FOUND", `No symplr customer user with email ${email}.`);
  if (user.status === "deactivated") return fail("USER_DEACTIVATED", "Account is deactivated. Only the customer's Org Admin can reactivate it.");
  if (user.sso_enabled) return fail("SSO_MANAGED", "User signs in with SSO. Lockouts are managed by the customer's identity provider.");
  if (user.status !== "locked") return { ok: true, changed: false, message: `Account is already ${user.status}.`, user };
  user.status = "active"; user.failed_login_attempts = 0;
  return { ok: true, changed: true, message: "Account unlocked. User can sign in now.", user };
}
function sendPasswordReset(a: any): Result {
  const email = lc(a.email);
  if (db().vendor_reps.some((v) => v.email === email))
    return fail("POLICY_PHONE_OR_CHAT_ONLY", "symplr Access vendor password resets cannot be done over email support. The rep must use 'Forgot your password' on the login screen, or call support or use live chat for a verified reset. See KI-402.");
  const user = db().users.find((u) => u.email === email);
  if (!user) return fail("USER_NOT_FOUND", `No symplr user with email ${email}.`);
  if (user.sso_enabled) return fail("SSO_MANAGED", "User signs in with SSO. Password resets go through the customer's identity provider.");
  if (user.status === "deactivated") return fail("USER_DEACTIVATED", "Account is deactivated.");
  return { ok: true, message: `Password reset link sent to ${email}. Link expires in 30 minutes.` };
}

// ---------- integrations and interfaces ----------
function listIntegrations(a: any): Result {
  const orgId = str(a.org_id);
  if (!orgId) return fail("MISSING_ORG_ID", "org_id is required.");
  let list = db().integrations.filter((i) => i.org_id === orgId);
  if (a.status) list = list.filter((i) => i.status === a.status);
  const unhealthy = list.filter((i) => i.status !== "healthy").length;
  return { ok: true, summary: unhealthy ? `${unhealthy} integration(s) need attention.` : "All integrations healthy.", integrations: list };
}
function resyncIntegration(a: any): Result {
  const integ = db().integrations.find((i) => i.id === str(a.integration_id));
  if (!integ) return fail("INTEGRATION_NOT_FOUND", `No integration ${a.integration_id}.`);
  if (integ.status === "healthy") return { ok: true, changed: false, message: "Integration is healthy. No resync needed.", integration: integ };
  if (integ.status === "halted") return fail("INTERFACE_HALTED", "Resync cannot run while the interface is halted on a bad message. Use list_interface_queue, quarantine the blocking message, then restart_interface.", { integration: integ });
  if (integ.error_code === "AUTH_TOKEN_EXPIRED" && integ.credential_owner === "customer")
    return fail("CUSTOMER_REAUTH_REQUIRED", "Resync failed: the customer-owned credential is expired. The customer must re-authorize. symplr cannot fix this.", { requires_customer_action: true, integration: integ });
  if (integ.error_code === "AUTH_TOKEN_EXPIRED")
    return fail("TOKEN_EXPIRED", "Resync failed: the symplr-managed API token is expired. Run rotate_integration_token first.", { integration: integ });
  const cleared = integ.records_pending;
  Object.assign(integ, { status: "healthy", error_code: null, error_message: null, records_pending: 0, last_successful_sync_at: now() });
  return { ok: true, changed: true, message: `Resync succeeded. ${cleared} queued record(s) delivered.`, integration: integ };
}
function rotateIntegrationToken(a: any): Result {
  const integ = db().integrations.find((i) => i.id === str(a.integration_id));
  if (!integ) return fail("INTEGRATION_NOT_FOUND", `No integration ${a.integration_id}.`);
  if (integ.credential_owner === "customer") return fail("CUSTOMER_OWNED_CREDENTIAL", "This credential belongs to the customer. They must update it in their system and re-authorize.");
  if (integ.error_code !== "AUTH_TOKEN_EXPIRED") return { ok: true, changed: false, message: "Token is not expired. No rotation needed.", integration: integ };
  const cleared = integ.records_pending;
  Object.assign(integ, { status: "healthy", error_code: null, error_message: null, records_pending: 0, last_successful_sync_at: now(), token_expires_at: new Date(Date.now() + 365 * 86400000).toISOString() });
  return { ok: true, changed: true, message: `Token rotated and re-issued. Integration job re-ran: ${cleared} queued record(s) transmitted. Note: expiry alerting is still off (see KI-307).`, integration: integ };
}
function listInterfaceQueue(a: any): Result {
  const integ = db().integrations.find((i) => i.id === str(a.integration_id));
  if (!integ) return fail("INTEGRATION_NOT_FOUND", `No integration ${a.integration_id}.`);
  const msgs = db().interface_messages.filter((m) => m.integration_id === integ.id).sort((x, y) => x.position - y.position);
  return { ok: true, integration: { id: integ.id, system: integ.system, type: integ.type, status: integ.status, records_pending: integ.records_pending, alerting_enabled: integ.alerting_enabled },
    blocking_message: msgs.find((m) => m.status === "blocking") ?? null, first_messages: msgs.slice(0, 5), known_issue: integ.error_code === "MALFORMED_HL7_SEGMENT" ? ki("KI-302") : null };
}
function quarantineInterfaceMessage(a: any): Result {
  const m = db().interface_messages.find((x) => x.id === str(a.message_id));
  if (!m) return fail("MESSAGE_NOT_FOUND", `No interface message ${a.message_id}.`);
  if (m.status === "quarantined") return { ok: true, changed: false, message: "Message is already quarantined.", interface_message: m };
  m.status = "quarantined";
  return { ok: true, changed: true, message: "Message moved to quarantine. The customer's interface team should correct and resend it. Run restart_interface to resume the feed.", interface_message: m };
}
function restartInterface(a: any): Result {
  const integ = db().integrations.find((i) => i.id === str(a.integration_id));
  if (!integ) return fail("INTEGRATION_NOT_FOUND", `No integration ${a.integration_id}.`);
  if (integ.status !== "halted") return { ok: true, changed: false, message: `Interface is ${integ.status}, not halted.`, integration: integ };
  const blocking = db().interface_messages.find((m) => m.integration_id === integ.id && m.status === "blocking");
  if (blocking) return fail("STILL_BLOCKED", `Restart failed: message ${blocking.id} is still at the head of the queue and will halt the engine again. Quarantine it first.`, { blocking_message: blocking });
  const cleared = integ.records_pending;
  db().interface_messages.filter((m) => m.integration_id === integ.id && m.status === "queued").forEach((m) => (m.status = "processed"));
  Object.assign(integ, { status: "healthy", error_code: null, error_message: null, records_pending: 0, last_successful_sync_at: now() });
  return { ok: true, changed: true, message: `Interface restarted. Backlog of ${cleared} message(s) processed. One message remains quarantined for the customer to correct and resend.`, integration: integ };
}

// ---------- credentialing ----------
function searchProviders(a: any): Result {
  const orgId = str(a.org_id), npi = str(a.npi), name = lc(a.name).replace(/^dr\.?\s*/, "");
  if (!name && !npi) return fail("MISSING_QUERY", "Provide name or npi.");
  const providers = db().providers.filter((p) => (!orgId || p.org_id === orgId) && ((npi && p.npi === npi) || (name && p.name.toLowerCase().includes(name))));
  if (!providers.length) return fail("PROVIDER_NOT_FOUND", "No MSOW credentialing file matches. The provider may only exist in symplr Directory; try get_directory_profiles.");
  return { ok: true, count: providers.length, providers };
}
function listExpiringCredentials(a: any): Result {
  const orgId = str(a.org_id);
  if (!orgId) return fail("MISSING_ORG_ID", "org_id is required.");
  const days = Math.min(Math.max(Number(a.days ?? 60) || 60, 1), 365);
  const cutoff = Date.now() + days * 86400000;
  const expiring = db().providers.filter((p) => p.org_id === orgId).flatMap((p) =>
    p.credentials.filter((c) => new Date(c.expires_on).getTime() <= cutoff).map((c) => ({
      provider: p.name, npi: p.npi, department: p.department, credential: c.type, expires_on: c.expires_on,
      already_expired: new Date(c.expires_on).getTime() < Date.now() }))).sort((x, y) => x.expires_on.localeCompare(y.expires_on));
  return { ok: true, window_days: days, count: expiring.length, expiring };
}

// ---------- symplr Directory ----------
function getDirectoryProfiles(a: any): Result {
  const orgId = str(a.org_id), npi = str(a.npi), name = lc(a.name).replace(/^dr\.?\s*/, ""), state = str(a.sync_state);
  if (!orgId) return fail("MISSING_ORG_ID", "org_id is required.");
  const profiles = db().directory_profiles.filter((p) => p.org_id === orgId && (!npi || p.npi === npi) && (!name || p.provider_name.toLowerCase().includes(name)) && (!state || p.sync_state === state))
    .map((p) => ({ ...p, known_issue: ki(p.known_issue_id) }));
  const problems = profiles.filter((p) => p.sync_state !== "in_sync").length;
  return { ok: true, count: profiles.length, summary: problems ? `${problems} profile(s) out of sync with MSOW.` : "All matching profiles in sync.", profiles };
}
function findProfile(id: unknown) { return db().directory_profiles.find((p) => p.id === str(id)); }
function triggerDirectoryImport(a: any): Result {
  const p = findProfile(a.profile_id);
  if (!p) return fail("PROFILE_NOT_FOUND", `No Directory profile ${a.profile_id}.`);
  if (p.msow_status !== "credentialed") return fail("NOT_ELIGIBLE", "Provider is not credentialed in MSOW, so no Directory profile can be created yet.");
  if (p.directory_status !== "not_created") return { ok: true, changed: false, message: `Profile already exists (${p.directory_status}).`, profile: p };
  Object.assign(p, { directory_status: "active", last_synced_at: now(), sync_state: "in_sync", sync_detail: null, directory_privileges: [...p.msow_privileges], directory_privilege_group: p.msow_privilege_group });
  return { ok: true, changed: true, message: `Provider import ran. ${p.provider_name} now has an active Directory profile and will appear in the public directory on the next publish.`, profile: p };
}
function resyncDirectoryProfile(a: any): Result {
  const p = findProfile(a.profile_id);
  if (!p) return fail("PROFILE_NOT_FOUND", `No Directory profile ${a.profile_id}.`);
  if (p.sync_state === "in_sync") return { ok: true, changed: false, message: "Profile already in sync.", profile: p };
  if (p.sync_state === "missed_sync_window") return fail("USE_IMPORT", "This profile was never created. Use trigger_directory_import instead.");
  if (p.sync_state === "privileges_blocked") return fail("FACILITY_CODE_UNMAPPED", `Resync will skip privileges again: facility code '${p.msow_facility_code}' is not mapped. Add the mapping with update_facility_code_mapping, then run_privilege_sync.`);
  const wasGroupMismatch = p.sync_state === "privilege_group_mismatch";
  if (p.sync_state === "stuck_pending_delete") Object.assign(p, { directory_status: "inactive", directory_privileges: [], directory_privilege_group: null });
  else Object.assign(p, { directory_privileges: [...p.msow_privileges], directory_privilege_group: p.msow_privilege_group, directory_status: p.msow_status === "credentialed" ? "active" : "inactive" });
  Object.assign(p, { sync_state: "in_sync", sync_detail: null, last_synced_at: now() });
  const msg = wasGroupMismatch
    ? "Re-sync corrected the Privilege Group. Warning: this fixes the symptom only. The underlying ordering defect (KI-301) can recur; escalate so engineering fixes the root cause."
    : `Re-sync complete. ${p.provider_name} is now ${p.directory_status} in symplr Directory.`;
  return { ok: true, changed: true, message: msg, profile: p };
}
function getFacilityCodeMappings(a: any): Result {
  const orgId = str(a.org_id);
  if (!orgId) return fail("MISSING_ORG_ID", "org_id is required.");
  const mappings = db().facility_mappings.filter((m) => m.org_id === orgId);
  const mapped = new Set(mappings.map((m) => m.msow_facility_code));
  const unmapped = [...new Set(db().directory_profiles.filter((p) => p.org_id === orgId && !mapped.has(p.msow_facility_code)).map((p) => p.msow_facility_code))];
  return { ok: true, mappings, unmapped_msow_codes_in_use: unmapped };
}
function updateFacilityCodeMapping(a: any): Result {
  const orgId = str(a.org_id), code = str(a.msow_facility_code), fac = str(a.directory_facility);
  if (!orgId || !code || !fac) return fail("MISSING_FIELDS", "org_id, msow_facility_code, and directory_facility are required.");
  const valid = [...new Set(db().facility_mappings.filter((m) => m.org_id === orgId).map((m) => m.directory_facility))];
  if (!valid.includes(fac)) return fail("UNKNOWN_FACILITY", `Directory facility '${fac}' does not exist for this org. Valid facilities: ${valid.join(", ")}.`);
  const existing = db().facility_mappings.find((m) => m.org_id === orgId && m.msow_facility_code === code);
  if (existing) existing.directory_facility = fac; else db().facility_mappings.push({ org_id: orgId, msow_facility_code: code, directory_facility: fac });
  return { ok: true, changed: true, message: `Mapped MSOW facility code '${code}' to '${fac}'. Run run_privilege_sync for affected profiles.` };
}
function runPrivilegeSync(a: any): Result {
  const p = findProfile(a.profile_id);
  if (!p) return fail("PROFILE_NOT_FOUND", `No Directory profile ${a.profile_id}.`);
  if (!db().facility_mappings.some((m) => m.org_id === p.org_id && m.msow_facility_code === p.msow_facility_code))
    return fail("FACILITY_CODE_UNMAPPED", `Privilege sync skipped: facility code '${p.msow_facility_code}' has no Directory mapping.`);
  Object.assign(p, { directory_privileges: [...p.msow_privileges], directory_privilege_group: p.msow_privilege_group, sync_state: "in_sync", sync_detail: null, last_synced_at: now() });
  return { ok: true, changed: true, message: `Privilege sync complete. ${p.provider_name} now shows ${p.directory_privileges.length} privilege(s) in symplr Directory.`, profile: p };
}
function getSyncJobHealth(a: any): Result {
  const orgId = str(a.org_id);
  if (!orgId) return fail("MISSING_ORG_ID", "org_id is required.");
  const jobs = db().sync_jobs.filter((j) => j.org_id === orgId).map((j) => ({ ...j, known_issue: ki(j.known_issue_id) }));
  if (!jobs.length) return fail("NO_SYNC_JOBS", "This organization has no MSOW to Directory sync jobs.");
  return { ok: true, jobs };
}

// ---------- Payer / NPDB ----------
function getNpdbAccount(a: any): Result {
  const acct = db().npdb_accounts.find((n) => n.org_id === str(a.org_id));
  if (!acct) return fail("NO_NPDB_ACCOUNT", "No NPDB account is configured for this organization in symplr Payer.");
  const problems: string[] = [];
  if (acct.query_credit_balance <= 0) problems.push(`Query credit balance is ${acct.query_credit_balance} with ${acct.credit_reload_mode} reload and no low-balance alert. The customer must purchase credits through NPDB.`);
  if (acct.eft_payment_flag !== acct.eft_payment_flag_expected) problems.push("EFT payment flag is enabled but should be disabled, causing a payment configuration conflict. symplr can correct this with update_npdb_settings.");
  return { ok: true, account: acct, detected_problems: problems, known_issue: ki("KI-308") };
}
function updateNpdbSettings(a: any): Result {
  const acct = db().npdb_accounts.find((n) => n.org_id === str(a.org_id));
  if (!acct) return fail("NO_NPDB_ACCOUNT", "No NPDB account for this organization.");
  if (typeof a.eft_payment_flag !== "boolean") return fail("MISSING_FIELDS", "eft_payment_flag (true or false) is required. Credits cannot be added by symplr.");
  acct.eft_payment_flag = a.eft_payment_flag;
  const ready = acct.query_credit_balance > 0 && acct.eft_payment_flag === acct.eft_payment_flag_expected;
  return { ok: true, changed: true, message: ready ? "EFT flag updated. NPDB queries should now succeed." : `EFT flag updated. Queries will still fail until credits are added (balance: ${acct.query_credit_balance}). The customer must purchase credits from NPDB.`, account: acct };
}

// ---------- Care Management ----------
function getServiceAccounts(a: any): Result {
  const list = db().service_accounts.filter((s) => s.org_id === str(a.org_id));
  if (!list.length) return fail("NO_SERVICE_ACCOUNTS", "No service accounts found for this organization.");
  return { ok: true, service_accounts: list.map((s) => ({ ...s, missing_permissions: s.expected_permissions.filter((p) => !s.permissions.includes(p)) })) };
}
function grantServiceAccountPermission(a: any): Result {
  const s = db().service_accounts.find((x) => x.org_id === str(a.org_id) && x.username === str(a.username));
  if (!s) return fail("SERVICE_ACCOUNT_NOT_FOUND", `No service account ${a.username} for this organization.`);
  const perm = str(a.permission).toUpperCase() || "SELECT";
  if (perm !== "SELECT") return fail("NOT_ALLOWED", "Only SELECT can be granted to reporting service accounts.");
  if (s.permissions.includes(perm)) return { ok: true, changed: false, message: `${s.username} already has ${perm} on ${s.schema}.` };
  s.permissions.push(perm); s.recent_failures = 0; s.last_successful_connection_at = now();
  s.last_permission_change = { at: now(), changed_by: "symplr support", action: `GRANT ${perm} ON ${s.schema}` };
  return { ok: true, changed: true, message: `Granted ${perm} on ${s.schema} to ${s.username}. Reporting connections should work now. Recommend reviewing maintenance job MJ-CLEANUP-114 so it stops revoking active service accounts.`, service_account: s };
}

// ---------- symplr Access vendor reps ----------
function lookupVendorRep(a: any): Result {
  const email = lc(a.email);
  if (!email) return fail("MISSING_EMAIL", "email is required.");
  const rep = db().vendor_reps.find((v) => v.email === email);
  if (!rep) return fail("VENDOR_REP_NOT_FOUND", `No symplr Access vendor rep with email ${email}.`);
  const facility_names = db().organizations.filter((o) => rep.facilities.includes(o.id)).map((o) => o.name);
  return { ok: true, vendor_rep: { ...rep, facility_names } };
}
function resendActivationEmail(a: any): Result {
  const rep = db().vendor_reps.find((v) => v.email === lc(a.email));
  if (!rep || !rep.activation) return fail("NO_PENDING_ACTIVATION", "No pending activation for that email.");
  if (rep.activation.status === "completed") return { ok: true, changed: false, message: "Account is already activated." };
  rep.activation.email_sent_at = now(); rep.activation.status = "sent_not_completed";
  return { ok: true, changed: true, message: `Activation email resent to ${rep.activation.email_sent_to} from ${rep.activation.sender}. The link must be opened in a web browser (not the app) and off VPN, or after IT allows symplr.com.` };
}

// ---------- platform ----------
function getPlatformStatus(a: any): Result {
  const product = lc(a.product).replace(/^symplr\s*/, "");
  let incidents = db().incidents;
  if (product) incidents = incidents.filter((i) => i.products.some((p) => p.toLowerCase().includes(product)));
  const active = incidents.filter((i) => i.status !== "resolved");
  return { ok: true, summary: active.length ? `${active.length} active incident(s).` : "All systems operational.", active_incidents: active, recently_resolved: incidents.filter((i) => i.status === "resolved") };
}
function searchKnownIssues(a: any): Result {
  const words = lc(a.query).split(/\s+/).filter((w) => w.length > 2);
  const product = lc(a.product).replace(/^symplr\s*/, "");
  const scored = db().known_issues.map((k) => {
    const text = `${k.title} ${k.summary} ${k.category} ${k.products.join(" ")}`.toLowerCase();
    return { k, score: words.filter((w) => text.includes(w)).length };
  }).filter(({ k, score }) => (!product || k.products.some((p) => p.toLowerCase().includes(product))) && (!words.length || score > 0))
    .sort((x, y) => y.score - x.score || y.k.linked_cases - x.k.linked_cases).slice(0, 5).map(({ k }) => k);
  return { ok: true, count: scored.length, known_issues: scored };
}
function createEscalation(a: any): Result {
  const org_id = str(a.org_id), summary = str(a.summary);
  if (!org_id || !summary) return fail("MISSING_FIELDS", "org_id and summary are required.");
  const severity = ["P1", "P2", "P3"].includes(String(a.severity)) ? String(a.severity) : "P3";
  const esc = { id: `ESC-${4100 + db().escalations.length + 1}`, org_id, product: str(a.product) || "unspecified", severity, summary, created_at: now(), status: "open" as const };
  db().escalations.push(esc);
  const sla = severity === "P1" ? "1 hour" : severity === "P2" ? "4 hours" : "1 business day";
  return { ok: true, escalation: esc, message: `Engineering escalation ${esc.id} created. Target first response: ${sla}.` };
}

// ---------- MCP tool registry ----------
type Tool = { name: string; title: string; description: string; inputSchema: Record<string, unknown>; annotations: Record<string, boolean>; run: (args: any) => Result };
const s = (description: string) => ({ type: "string", description });
const obj = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "object", properties, required });
const READ = { readOnlyHint: true };
const WRITE = { readOnlyHint: false, destructiveHint: false };
const ORG = s("Organization id from lookup_organization, e.g. org_riverbend");

const TOOLS: Tool[] = [
  // read
  { name: "lookup_organization", title: "Look up customer organization", description: "Find the symplr customer (health system or health plan) by email, domain, or name. Returns licensed products, seat usage, support plan, CSM, renewal date, and health score.", inputSchema: obj({ email: s("Customer email; the domain is used"), domain: s("e.g. riverbendhealth.org"), name: s("Partial org name") }), annotations: READ, run: lookupOrganization },
  { name: "lookup_user", title: "Look up symplr customer user", description: "Look up a customer employee by email: status (active, locked, deactivated), SSO, failed logins, products. Not for vendor reps.", inputSchema: obj({ email: s("User email") }, ["email"]), annotations: READ, run: lookupUser },
  { name: "lookup_vendor_rep", title: "Look up symplr Access vendor rep", description: "Look up a vendor rep by email: badge status, missing requirements, login status and recent attempts (country, result), subscription, charges (last 4 of card only), IntelliCentrics notes, migration activation status, and badge hardware.", inputSchema: obj({ email: s("Vendor rep email") }, ["email"]), annotations: READ, run: lookupVendorRep },
  { name: "list_integrations", title: "List integrations", description: "List an organization's integrations and interfaces (Epic, Workday, ADP, UKG, Lawson, HL7 ADT, badge systems) with status, error code, who owns the credential, alerting, and queued records.", inputSchema: obj({ org_id: ORG, status: { type: "string", enum: ["healthy", "degraded", "failing", "halted", "disabled"] } }, ["org_id"]), annotations: READ, run: listIntegrations },
  { name: "list_interface_queue", title: "Inspect interface queue", description: "Show the message queue for an HL7 interface, including the message blocking the feed and what is wrong with it.", inputSchema: obj({ integration_id: s("e.g. int_sb_adt") }, ["integration_id"]), annotations: READ, run: listInterfaceQueue },
  { name: "search_providers", title: "Search MSOW credentialing files", description: "Find a provider's MSOW credentialing file by name or NPI: application status, blocking items, committee date, credentials.", inputSchema: obj({ org_id: ORG, name: s("Provider name"), npi: s("10-digit NPI") }), annotations: READ, run: searchProviders },
  { name: "list_expiring_credentials", title: "List expiring credentials", description: "Provider credentials expiring within N days for an organization, including already expired.", inputSchema: obj({ org_id: ORG, days: { type: "integer", description: "Default 60, max 365" } }, ["org_id"]), annotations: READ, run: listExpiringCredentials },
  { name: "get_directory_profiles", title: "Get symplr Directory profiles", description: "Compare providers' MSOW data with their symplr Directory profiles. Returns directory status, sync state (missed_sync_window, stuck_pending_delete, privileges_blocked, privilege_group_mismatch, out_of_sync), privileges on each side, facility code, and any linked known issue.", inputSchema: obj({ org_id: ORG, name: s("Optional provider name"), npi: s("Optional NPI"), sync_state: s("Optional filter") }, ["org_id"]), annotations: READ, run: getDirectoryProfiles },
  { name: "get_facility_code_mappings", title: "Get facility code mappings", description: "MSOW facility code to symplr Directory facility mappings for an org, plus any codes in use that are not mapped.", inputSchema: obj({ org_id: ORG }, ["org_id"]), annotations: READ, run: getFacilityCodeMappings },
  { name: "get_sync_job_health", title: "Get MSOW to Directory sync job health", description: "Health of the nightly MSOW to Directory sync job: success rate, failed batches, retry policy, how long it has been degraded, and the latest discrepancy audit. Use when a customer reports many discrepancies or asks for a true-up.", inputSchema: obj({ org_id: ORG }, ["org_id"]), annotations: READ, run: getSyncJobHealth },
  { name: "get_npdb_account", title: "Get NPDB account (symplr Payer)", description: "NPDB query account for a Payer customer: credit balance, reload mode, low-balance alert, EFT payment flag, failed queries, raw NPDB responses vs the message users saw, and detected problems.", inputSchema: obj({ org_id: ORG }, ["org_id"]), annotations: READ, run: getNpdbAccount },
  { name: "get_service_accounts", title: "Get service accounts (Care Management)", description: "Database service accounts for reporting (ODBC): permissions vs expected, recent failures, and the last permission change and who made it.", inputSchema: obj({ org_id: ORG }, ["org_id"]), annotations: READ, run: getServiceAccounts },
  { name: "get_platform_status", title: "Get platform status", description: "Active and recently resolved symplr incidents, optionally for one product.", inputSchema: obj({ product: s("Optional product") }), annotations: READ, run: getPlatformStatus },
  { name: "search_known_issues", title: "Search known issues", description: "Search known recurring issues and policies (bugs, sync problems, IntelliCentrics acquisition confusion, geo-blocks, password policy, Gen 1 badges). Returns how many cases are linked and the recommended handling. Use to spot patterns and recurring problems.", inputSchema: obj({ query: s("Keywords from the ticket"), product: s("Optional product") }), annotations: READ, run: searchKnownIssues },
  // write
  { name: "unlock_user", title: "Unlock customer user", description: "Unlock a locked, non-SSO customer user.", inputSchema: obj({ email: s("User email") }, ["email"]), annotations: { ...WRITE, idempotentHint: true }, run: unlockUser },
  { name: "send_password_reset", title: "Send password reset", description: "Send a password reset to a non-SSO customer user. Refused for symplr Access vendor reps by policy.", inputSchema: obj({ email: s("Email") }, ["email"]), annotations: WRITE, run: sendPasswordReset },
  { name: "resync_integration", title: "Resync integration", description: "Retry a degraded or failing integration. Refuses when credentials are expired or an interface is halted, and says what to do instead.", inputSchema: obj({ integration_id: s("Integration id") }, ["integration_id"]), annotations: WRITE, run: resyncIntegration },
  { name: "rotate_integration_token", title: "Rotate integration token", description: "Rotate and re-issue an expired symplr-managed API token, then re-run the job so queued records are sent. Not for customer-owned credentials.", inputSchema: obj({ integration_id: s("Integration id") }, ["integration_id"]), annotations: WRITE, run: rotateIntegrationToken },
  { name: "quarantine_interface_message", title: "Quarantine interface message", description: "Move a malformed message out of an interface queue so the feed can restart.", inputSchema: obj({ message_id: s("Message id from list_interface_queue") }, ["message_id"]), annotations: WRITE, run: quarantineInterfaceMessage },
  { name: "restart_interface", title: "Restart interface", description: "Restart a halted interface and process the backlog. Fails if a blocking message is still at the head of the queue.", inputSchema: obj({ integration_id: s("Integration id") }, ["integration_id"]), annotations: WRITE, run: restartInterface },
  { name: "trigger_directory_import", title: "Trigger Directory provider import", description: "Create a missing symplr Directory profile for a provider credentialed in MSOW.", inputSchema: obj({ profile_id: s("Profile id from get_directory_profiles") }, ["profile_id"]), annotations: WRITE, run: triggerDirectoryImport },
  { name: "resync_directory_profile", title: "Re-sync Directory profile", description: "Re-sync one Directory profile from MSOW (completes stuck deletes, fixes status, location, and Privilege Group).", inputSchema: obj({ profile_id: s("Profile id") }, ["profile_id"]), annotations: WRITE, run: resyncDirectoryProfile },
  { name: "update_facility_code_mapping", title: "Update facility code mapping", description: "Map an MSOW facility code to an existing symplr Directory facility.", inputSchema: obj({ org_id: ORG, msow_facility_code: s("e.g. RBH-MAIN"), directory_facility: s("Existing Directory facility name") }, ["org_id", "msow_facility_code", "directory_facility"]), annotations: WRITE, run: updateFacilityCodeMapping },
  { name: "run_privilege_sync", title: "Run privilege sync", description: "Sync a provider's privileges from MSOW to symplr Directory. Fails if the facility code is unmapped.", inputSchema: obj({ profile_id: s("Profile id") }, ["profile_id"]), annotations: WRITE, run: runPrivilegeSync },
  { name: "update_npdb_settings", title: "Update NPDB account settings", description: "Correct the EFT payment flag on a Payer customer's NPDB account. Cannot add query credits.", inputSchema: obj({ org_id: ORG, eft_payment_flag: { type: "boolean" } }, ["org_id", "eft_payment_flag"]), annotations: WRITE, run: updateNpdbSettings },
  { name: "grant_service_account_permission", title: "Grant service account permission", description: "Re-grant SELECT on the reporting schema to a Care Management service account.", inputSchema: obj({ org_id: ORG, username: s("Service account username"), permission: s("SELECT") }, ["org_id", "username"]), annotations: WRITE, run: grantServiceAccountPermission },
  { name: "resend_activation_email", title: "Resend activation email", description: "Resend the symplr Access account activation email for a migrated vendor rep.", inputSchema: obj({ email: s("Vendor rep email") }, ["email"]), annotations: WRITE, run: resendActivationEmail },
  { name: "create_escalation", title: "Create engineering escalation", description: "File an engineering escalation. Returns an id and response SLA.", inputSchema: obj({ org_id: ORG, product: s("Affected product"), severity: { type: "string", enum: ["P1", "P2", "P3"] }, summary: s("What is broken, impact, what was tried, linked known issue") }, ["org_id", "summary"]), annotations: WRITE, run: createEscalation },
];

// ---------- JSON-RPC plumbing ----------
const SERVER = { name: "symplr-mock", version: "2.0.0" };
const SUPPORTED = ["2025-06-18", "2025-03-26", "2024-11-05"];
type RpcReq = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: any };
const ok = (id: RpcReq["id"], result: unknown) => ({ jsonrpc: "2.0", id, result });
const err = (id: RpcReq["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

function authorized(req: NextRequest) {
  const expected = process.env.MOCK_API_KEY;
  if (!expected) return false;
  const k = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? req.nextUrl.searchParams.get("key");
  return k === expected;
}
function handle(m: RpcReq) {
  switch (m.method) {
    case "initialize": {
      const v = m.params?.protocolVersion;
      return ok(m.id, { protocolVersion: SUPPORTED.includes(v) ? v : SUPPORTED[0], capabilities: { tools: { listChanged: false } }, serverInfo: SERVER,
        instructions: "Mock symplr back office with synthetic data. Identify the customer or vendor rep first, investigate with read tools, check search_known_issues for patterns, then act." });
    }
    case "ping": return ok(m.id, {});
    case "tools/list": return ok(m.id, { tools: TOOLS.map(({ run, ...t }) => t) });
    case "tools/call": {
      const tool = TOOLS.find((t) => t.name === m.params?.name);
      if (!tool) return err(m.id, -32602, `Unknown tool: ${m.params?.name}`);
      try {
        const result = tool.run(m.params?.arguments ?? {});
        return ok(m.id, { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], structuredContent: result, isError: result.ok === false });
      } catch (e) {
        return ok(m.id, { content: [{ type: "text", text: `Tool error: ${e instanceof Error ? e.message : "unknown"}` }], isError: true });
      }
    }
    case "resources/list": return ok(m.id, { resources: [] });
    case "prompts/list": return ok(m.id, { prompts: [] });
    default: return err(m.id, -32601, `Method not found: ${m.method}`);
  }
}
export async function POST(req: NextRequest) {
  if (!process.env.MOCK_API_KEY) return NextResponse.json(err(null, -32000, "Server missing MOCK_API_KEY"), { status: 500 });
  if (!authorized(req)) return NextResponse.json(err(null, -32001, "Unauthorized: missing or invalid API key"), { status: 401 });
  let payload: RpcReq | RpcReq[];
  try { payload = await req.json(); } catch { return NextResponse.json(err(null, -32700, "Parse error"), { status: 400 }); }
  const batch = Array.isArray(payload) ? payload : [payload];
  const responses = batch.filter((m) => m.id !== undefined && m.id !== null).map(handle);
  batch.filter((m) => m.id === undefined || m.id === null).forEach(handle);
  if (!responses.length) return new NextResponse(null, { status: 202 });
  return NextResponse.json(Array.isArray(payload) ? responses : responses[0]);
}
export function GET() { return new NextResponse("Method Not Allowed", { status: 405, headers: { Allow: "POST" } }); }
export function DELETE() { return new NextResponse(null, { status: 405 }); }
