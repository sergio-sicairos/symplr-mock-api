// All data is synthetic. No real people, NPIs, or PHI.
// Dates are relative to "now" so expiring credentials and incidents stay fresh.

const day = 24 * 60 * 60 * 1000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * day).toISOString();
const date = (offsetDays: number) => iso(offsetDays).slice(0, 10);

export type Product =
  | "symplr Provider"
  | "symplr Workforce"
  | "symplr Contract"
  | "symplr Compliance"
  | "symplr Spend"
  | "symplr Access"
  | "symplr CTM";

export interface License { product: Product; seats_purchased: number; seats_used: number; environment: "production" | "production+test"; version: string }
export interface Organization {
  id: string; name: string; domain: string; type: string; beds: number; state: string;
  tier: "Enterprise" | "Mid-Market" | "Commercial"; support_plan: "Premier" | "Standard";
  csm: { name: string; email: string }; contract_renewal_date: string; arr_usd: number;
  health_score: "green" | "yellow" | "red"; licenses: License[]; notes: string;
}
export interface User {
  id: string; org_id: string; email: string; name: string; title: string; role: string;
  products: Product[]; status: "active" | "locked" | "deactivated" | "pending_invite";
  sso_enabled: boolean; mfa_enabled: boolean; failed_login_attempts: number; last_login_at: string | null;
}
export interface Integration {
  id: string; org_id: string; product: Product; system: string; type: string; direction: string;
  status: "healthy" | "degraded" | "failing" | "disabled"; last_successful_sync_at: string;
  error_code: string | null; error_message: string | null; records_pending: number;
}
export interface Credential { type: string; number: string; state?: string; expires_on: string; verification_status: "verified" | "pending_psv" | "expired" | "flagged" }
export interface Provider {
  id: string; org_id: string; name: string; npi: string; specialty: string; department: string;
  application_type: "initial_appointment" | "reappointment" | "temporary_privileges";
  application_status: "in_progress" | "pending_committee" | "approved" | "on_hold" | "denied";
  blocking_items: string[]; committee_date: string | null; credentials: Credential[];
}
export interface VendorRep {
  id: string; email: string; name: string; company: string; facilities: string[];
  badge_status: "active" | "denied" | "suspended" | "expired";
  missing_requirements: string[]; last_check_in_attempt_at: string | null; subscription_expires_on: string;
}
export interface Incident {
  id: string; title: string; products: Product[]; region: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  severity: "minor" | "major" | "critical"; started_at: string; resolved_at: string | null; customer_message: string;
}
export interface Escalation { id: string; org_id: string; product: string; severity: string; summary: string; created_at: string; status: "open" }

export function buildSeed() {
  const organizations: Organization[] = [
    {
      id: "org_riverbend", name: "Riverbend Health System", domain: "riverbendhealth.org", type: "Integrated delivery network",
      beds: 1450, state: "OH", tier: "Enterprise", support_plan: "Premier",
      csm: { name: "Dana Whitfield", email: "dana.whitfield@symplr-demo.com" },
      contract_renewal_date: date(74), arr_usd: 612000, health_score: "green",
      licenses: [
        { product: "symplr Provider", seats_purchased: 120, seats_used: 97, environment: "production+test", version: "24.3.1" },
        { product: "symplr Workforce", seats_purchased: 9000, seats_used: 8612, environment: "production+test", version: "2026.2" },
        { product: "symplr Compliance", seats_purchased: 300, seats_used: 211, environment: "production", version: "11.8" },
      ],
      notes: "Flagship reference customer. Expanding to symplr Access in Q1.",
    },
    {
      id: "org_lakeshore", name: "Lakeshore Children's Hospital", domain: "lakeshorechildrens.org", type: "Pediatric academic medical center",
      beds: 380, state: "IL", tier: "Mid-Market", support_plan: "Standard",
      csm: { name: "Marcus Lee", email: "marcus.lee@symplr-demo.com" },
      contract_renewal_date: date(28), arr_usd: 184000, health_score: "yellow",
      licenses: [
        { product: "symplr Access", seats_purchased: 250, seats_used: 250, environment: "production", version: "8.4" },
        { product: "symplr Provider", seats_purchased: 40, seats_used: 33, environment: "production", version: "24.3.1" },
      ],
      notes: "At seat cap on symplr Access. Renewal in under 30 days. Upsell opportunity.",
    },
    {
      id: "org_mesavalley", name: "Mesa Valley Medical Center", domain: "mesavalleymc.org", type: "Community hospital",
      beds: 260, state: "AZ", tier: "Mid-Market", support_plan: "Standard",
      csm: { name: "Priya Raman", email: "priya.raman@symplr-demo.com" },
      contract_renewal_date: date(210), arr_usd: 142000, health_score: "red",
      licenses: [
        { product: "symplr Workforce", seats_purchased: 2200, seats_used: 2140, environment: "production", version: "2026.1" },
        { product: "symplr Spend", seats_purchased: 25, seats_used: 19, environment: "production", version: "6.2" },
      ],
      notes: "Workday HRIS integration failing since last week. Exec escalation risk.",
    },
    {
      id: "org_northfield", name: "Northfield Regional Health", domain: "northfieldregional.org", type: "Regional health system",
      beds: 720, state: "MN", tier: "Enterprise", support_plan: "Premier",
      csm: { name: "Dana Whitfield", email: "dana.whitfield@symplr-demo.com" },
      contract_renewal_date: date(160), arr_usd: 398000, health_score: "green",
      licenses: [
        { product: "symplr Provider", seats_purchased: 80, seats_used: 61, environment: "production+test", version: "24.3.1" },
        { product: "symplr Contract", seats_purchased: 60, seats_used: 44, environment: "production", version: "9.1" },
        { product: "symplr Workforce", seats_purchased: 5200, seats_used: 4975, environment: "production", version: "2026.2" },
      ],
      notes: "Uses Epic. Provider data feeds Epic provider master nightly.",
    },
    {
      id: "org_coastal", name: "Coastal Behavioral Health Network", domain: "coastalbhn.org", type: "Behavioral health network",
      beds: 190, state: "NC", tier: "Commercial", support_plan: "Standard",
      csm: { name: "Marcus Lee", email: "marcus.lee@symplr-demo.com" },
      contract_renewal_date: date(330), arr_usd: 68000, health_score: "green",
      licenses: [
        { product: "symplr CTM", seats_purchased: 400, seats_used: 287, environment: "production", version: "5.0" },
        { product: "symplr Compliance", seats_purchased: 50, seats_used: 22, environment: "production", version: "11.8" },
      ],
      notes: "Heavy contingent staffing. Recently onboarded.",
    },
  ];

  const users: User[] = [
    { id: "usr_001", org_id: "org_riverbend", email: "jdavis@riverbendhealth.org", name: "Jordan Davis", title: "Medical Staff Services Coordinator", role: "Credentialing Specialist", products: ["symplr Provider"], status: "locked", sso_enabled: false, mfa_enabled: true, failed_login_attempts: 6, last_login_at: iso(-3) },
    { id: "usr_002", org_id: "org_riverbend", email: "amorales@riverbendhealth.org", name: "Alicia Morales", title: "Director, Medical Staff Services", role: "Org Admin", products: ["symplr Provider", "symplr Compliance"], status: "active", sso_enabled: false, mfa_enabled: true, failed_login_attempts: 0, last_login_at: iso(-0.2) },
    { id: "usr_003", org_id: "org_riverbend", email: "tnguyen@riverbendhealth.org", name: "Tom Nguyen", title: "Workforce Systems Analyst", role: "Workforce Admin", products: ["symplr Workforce"], status: "active", sso_enabled: true, mfa_enabled: true, failed_login_attempts: 0, last_login_at: iso(-1) },
    { id: "usr_004", org_id: "org_lakeshore", email: "kbrennan@lakeshorechildrens.org", name: "Kate Brennan", title: "Supply Chain Manager", role: "Access Admin", products: ["symplr Access"], status: "active", sso_enabled: true, mfa_enabled: true, failed_login_attempts: 0, last_login_at: iso(-0.5) },
    { id: "usr_005", org_id: "org_lakeshore", email: "rpatel@lakeshorechildrens.org", name: "Ravi Patel", title: "Credentialing Analyst", role: "Credentialing Specialist", products: ["symplr Provider"], status: "pending_invite", sso_enabled: true, mfa_enabled: false, failed_login_attempts: 0, last_login_at: null },
    { id: "usr_006", org_id: "org_mesavalley", email: "sgarcia@mesavalleymc.org", name: "Sofia Garcia", title: "HRIS Manager", role: "Workforce Admin", products: ["symplr Workforce"], status: "active", sso_enabled: false, mfa_enabled: true, failed_login_attempts: 1, last_login_at: iso(-0.1) },
    { id: "usr_007", org_id: "org_mesavalley", email: "bkim@mesavalleymc.org", name: "Brian Kim", title: "Nurse Manager, ICU", role: "Scheduler", products: ["symplr Workforce"], status: "deactivated", sso_enabled: false, mfa_enabled: false, failed_login_attempts: 0, last_login_at: iso(-95) },
    { id: "usr_008", org_id: "org_northfield", email: "lhansen@northfieldregional.org", name: "Lars Hansen", title: "Manager, Provider Enrollment", role: "Org Admin", products: ["symplr Provider", "symplr Contract"], status: "active", sso_enabled: true, mfa_enabled: true, failed_login_attempts: 0, last_login_at: iso(-0.3) },
    { id: "usr_009", org_id: "org_coastal", email: "mwright@coastalbhn.org", name: "Maya Wright", title: "Staffing Coordinator", role: "CTM Admin", products: ["symplr CTM"], status: "active", sso_enabled: false, mfa_enabled: false, failed_login_attempts: 0, last_login_at: iso(-2) },
  ];

  const integrations: Integration[] = [
    { id: "int_rb_epic", org_id: "org_riverbend", product: "symplr Provider", system: "Epic", type: "Provider master (HL7 MFN)", direction: "outbound", status: "healthy", last_successful_sync_at: iso(-0.25), error_code: null, error_message: null, records_pending: 0 },
    { id: "int_rb_kronos", org_id: "org_riverbend", product: "symplr Workforce", system: "UKG Pro", type: "Payroll export", direction: "outbound", status: "healthy", last_successful_sync_at: iso(-0.5), error_code: null, error_message: null, records_pending: 0 },
    { id: "int_mv_workday", org_id: "org_mesavalley", product: "symplr Workforce", system: "Workday", type: "HRIS employee demographics", direction: "inbound", status: "failing", last_successful_sync_at: iso(-6), error_code: "AUTH_TOKEN_EXPIRED", error_message: "Workday integration system user password expired. Customer must update credentials in Workday and re-authorize in symplr Workforce > Admin > Interfaces.", records_pending: 143 },
    { id: "int_mv_lawson", org_id: "org_mesavalley", product: "symplr Spend", system: "Infor Lawson", type: "PO and invoice feed", direction: "bidirectional", status: "healthy", last_successful_sync_at: iso(-0.4), error_code: null, error_message: null, records_pending: 0 },
    { id: "int_nf_epic", org_id: "org_northfield", product: "symplr Provider", system: "Epic", type: "Provider master (HL7 MFN)", direction: "outbound", status: "degraded", last_successful_sync_at: iso(-1.2), error_code: "SFTP_TIMEOUT", error_message: "Nightly SFTP drop timed out on last run. 37 provider records queued. Usually clears on resync.", records_pending: 37 },
    { id: "int_lk_badge", org_id: "org_lakeshore", product: "symplr Access", system: "Lenel OnGuard", type: "Badge printer / door access", direction: "outbound", status: "healthy", last_successful_sync_at: iso(-0.05), error_code: null, error_message: null, records_pending: 0 },
  ];

  const providers: Provider[] = [
    {
      id: "prv_001", org_id: "org_riverbend", name: "Dr. Elena Vasquez", npi: "1902847561", specialty: "Cardiology", department: "Heart & Vascular Institute",
      application_type: "initial_appointment", application_status: "on_hold",
      blocking_items: ["DEA registration expired; awaiting renewed certificate from provider", "Peer reference #2 not returned (requested 18 days ago)"],
      committee_date: date(12),
      credentials: [
        { type: "State medical license", number: "35.198472", state: "OH", expires_on: date(410), verification_status: "verified" },
        { type: "DEA registration", number: "FV1234563", expires_on: date(-9), verification_status: "expired" },
        { type: "Board certification (ABIM)", number: "ABIM-448812", expires_on: date(1200), verification_status: "verified" },
      ],
    },
    {
      id: "prv_002", org_id: "org_riverbend", name: "Dr. Marcus Chen", npi: "1588120934", specialty: "Emergency Medicine", department: "Emergency Department",
      application_type: "reappointment", application_status: "pending_committee", blocking_items: [], committee_date: date(5),
      credentials: [
        { type: "State medical license", number: "35.177301", state: "OH", expires_on: date(41), verification_status: "verified" },
        { type: "DEA registration", number: "BC9988771", expires_on: date(300), verification_status: "verified" },
        { type: "BLS/ACLS", number: "AHA-55120", expires_on: date(22), verification_status: "verified" },
      ],
    },
    {
      id: "prv_003", org_id: "org_riverbend", name: "Nina Okafor, CRNA", npi: "1730566128", specialty: "Anesthesia", department: "Perioperative Services",
      application_type: "temporary_privileges", application_status: "approved", blocking_items: [], committee_date: null,
      credentials: [
        { type: "State RN license", number: "RN.442190", state: "OH", expires_on: date(55), verification_status: "verified" },
        { type: "NBCRNA certification", number: "NB-30219", expires_on: date(600), verification_status: "verified" },
      ],
    },
    {
      id: "prv_004", org_id: "org_northfield", name: "Dr. Samuel Lindqvist", npi: "1467093825", specialty: "Orthopedic Surgery", department: "Orthopedics",
      application_type: "initial_appointment", application_status: "in_progress",
      blocking_items: ["Primary source verification pending: medical school (sent to AMA Physician Profile 4 days ago)"],
      committee_date: date(30),
      credentials: [
        { type: "State medical license", number: "MN-61822", state: "MN", expires_on: date(700), verification_status: "verified" },
        { type: "Medical school diploma", number: "N/A", expires_on: "9999-12-31", verification_status: "pending_psv" },
      ],
    },
    {
      id: "prv_005", org_id: "org_northfield", name: "Dr. Grace Holm", npi: "1356719402", specialty: "Pediatrics", department: "Children's Clinic",
      application_type: "reappointment", application_status: "approved", blocking_items: [], committee_date: null,
      credentials: [
        { type: "State medical license", number: "MN-55410", state: "MN", expires_on: date(18), verification_status: "verified" },
        { type: "Malpractice insurance (COI)", number: "COI-2026-0091", expires_on: date(9), verification_status: "verified" },
      ],
    },
    {
      id: "prv_006", org_id: "org_lakeshore", name: "Dr. Owen Fitzgerald", npi: "1629384750", specialty: "Pediatric Neurology", department: "Neurosciences",
      application_type: "initial_appointment", application_status: "on_hold",
      blocking_items: ["OIG exclusion check returned a possible name match; manual review required"],
      committee_date: null,
      credentials: [
        { type: "State medical license", number: "036.149922", state: "IL", expires_on: date(500), verification_status: "verified" },
        { type: "OIG/SAM exclusion screening", number: "N/A", expires_on: date(30), verification_status: "flagged" },
      ],
    },
  ];

  const vendor_reps: VendorRep[] = [
    { id: "vr_001", email: "tyler.brooks@medisurge-demo.com", name: "Tyler Brooks", company: "MediSurge Devices", facilities: ["org_lakeshore"], badge_status: "denied", missing_requirements: ["Influenza vaccination attestation for current season", "Hospital-specific OR orientation (Lakeshore)"], last_check_in_attempt_at: iso(-0.08), subscription_expires_on: date(140) },
    { id: "vr_002", email: "rachel.ng@ortholine-demo.com", name: "Rachel Ng", company: "OrthoLine Implants", facilities: ["org_lakeshore"], badge_status: "active", missing_requirements: [], last_check_in_attempt_at: iso(-1), subscription_expires_on: date(200) },
    { id: "vr_003", email: "dev.shah@cardiotek-demo.com", name: "Dev Shah", company: "CardioTek", facilities: ["org_lakeshore"], badge_status: "expired", missing_requirements: ["Annual vendor subscription renewal"], last_check_in_attempt_at: iso(-0.5), subscription_expires_on: date(-2) },
  ];

  const incidents: Incident[] = [
    { id: "inc_2026_118", title: "Delayed time punch processing in symplr Workforce", products: ["symplr Workforce"], region: "US-East", status: "monitoring", severity: "major", started_at: iso(-0.3), resolved_at: null, customer_message: "Some time clock punches are processing with up to a 45 minute delay. No punches are lost. A fix has been deployed and we are monitoring." },
    { id: "inc_2026_112", title: "symplr Provider report exports timing out", products: ["symplr Provider"], region: "All", status: "resolved", severity: "minor", started_at: iso(-4), resolved_at: iso(-3.8), customer_message: "Large report exports were timing out. Resolved." },
  ];

  const escalations: Escalation[] = [];

  return { organizations, users, integrations, providers, vendor_reps, incidents, escalations };
}

export type DB = ReturnType<typeof buildSeed>;
