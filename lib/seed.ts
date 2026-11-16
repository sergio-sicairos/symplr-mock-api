// All data is synthetic. No real people, NPIs, card numbers, or PHI.
// Dates are relative to "now" so expirations, sync windows, and incidents stay fresh.

const day = 24 * 60 * 60 * 1000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * day).toISOString();
const date = (offsetDays: number) => iso(offsetDays).slice(0, 10);

export type Product =
  | "MSOW"
  | "symplr Directory"
  | "symplr Payer"
  | "symplr Care Management"
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
  status: "healthy" | "degraded" | "failing" | "halted" | "disabled"; last_successful_sync_at: string;
  error_code: string | null; error_message: string | null; records_pending: number;
  credential_owner?: "customer" | "symplr"; alerting_enabled?: boolean; customer_visible_error?: boolean;
  token_expires_at?: string;
}
export interface InterfaceMessage {
  id: string; integration_id: string; position: number; received_at: string; message_type: string;
  status: "blocking" | "queued" | "quarantined" | "processed"; problem: string | null; segment_excerpt: string;
}
export interface Credential { type: string; number: string; state?: string; expires_on: string; verification_status: "verified" | "pending_psv" | "expired" | "flagged" }
export interface Provider {
  id: string; org_id: string; name: string; npi: string; specialty: string; department: string;
  application_type: "initial_appointment" | "reappointment" | "temporary_privileges";
  application_status: "in_progress" | "pending_committee" | "approved" | "on_hold" | "denied";
  blocking_items: string[]; committee_date: string | null; credentials: Credential[];
}
export interface DirectoryProfile {
  id: string; org_id: string; provider_name: string; npi: string;
  msow_status: "credentialed" | "inactive_flagged_for_deletion" | "in_progress";
  msow_updated_at: string; msow_facility_code: string;
  directory_status: "not_created" | "active" | "inactive" | "pending_delete";
  last_synced_at: string | null;
  sync_state: "in_sync" | "missed_sync_window" | "stuck_pending_delete" | "privileges_blocked" | "privilege_group_mismatch" | "out_of_sync";
  sync_detail: string | null;
  msow_privileges: string[]; directory_privileges: string[];
  msow_privilege_group: string | null; directory_privilege_group: string | null;
  known_issue_id: string | null;
}
export interface FacilityMapping { org_id: string; msow_facility_code: string; directory_facility: string }
export interface SyncJob {
  id: string; org_id: string; job: string; status: "healthy" | "degraded" | "failing";
  degraded_since: string | null; retry_policy: string; runs_last_30_days: number; success_rate_last_30_days: number;
  failed_batches_last_30_days: number; batch_failure_alerting: boolean;
  last_audit: { run_at: string; providers_total: number; mismatched: number; by_type: Record<string, number> } | null;
  known_issue_id: string | null;
}
export interface NpdbAccount {
  org_id: string; npdb_account_id: string; query_credit_balance: number; credit_reload_mode: "manual" | "automatic";
  low_balance_alert_enabled: boolean; eft_payment_flag: boolean; eft_payment_flag_expected: boolean;
  last_successful_query_at: string; queries_failed_since: string; failed_query_count: number; practitioners_blocked: number;
  recent_errors: { at: string; npdb_raw_response: string; message_shown_to_user: string }[];
}
export interface ServiceAccount {
  org_id: string; username: string; purpose: string; status: "active" | "disabled"; schema: string;
  permissions: string[]; expected_permissions: string[]; last_successful_connection_at: string;
  recent_failures: number; last_permission_change: { at: string; changed_by: string; action: string } | null;
}
export interface VendorRep {
  id: string; email: string; name: string; company: string; facilities: string[];
  badge_status: "active" | "denied" | "suspended" | "expired";
  missing_requirements: string[]; last_check_in_attempt_at: string | null; subscription_expires_on: string;
  account_created_on?: string;
  login?: { status: "active" | "geo_blocked" | "password_mismatch" | "pending_activation"; last_password_reset_at: string | null;
    recent_attempts: { at: string; country: string; channel: "web" | "mobile_app"; result: string }[] };
  subscription?: { plan: string; auto_renew: boolean; renews_on: string; credentials_expiring_on: string | null };
  charges?: { date: string; amount_usd: number; description: string; card_charged_last4: string; card_on_receipt_last4: string }[];
  intellicentrics?: { customer_reports_ic_account: boolean; note: string };
  activation?: { status: "not_sent" | "sent_not_completed" | "completed"; email_sent_to: string | null; email_sent_at: string | null;
    sender: string; link_attempts: { at: string; result: string }[]; migrated_facilities: string[] };
  badges?: { serial: string; model: string; generation: number; issued_by: "symplr" | "IntelliCentrics"; status: "active" | "deactivated"; compatible_with_symplr_app: boolean }[];
}
export interface KnownIssue {
  id: string; title: string; products: Product[]; category: string; status: "open" | "fix_in_progress" | "fixed" | "by_design";
  linked_cases: number; summary: string; recommended_handling: string;
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
        { product: "MSOW", seats_purchased: 120, seats_used: 97, environment: "production+test", version: "24.3.1" },
        { product: "symplr Directory", seats_purchased: 40, seats_used: 31, environment: "production", version: "7.2" },
        { product: "symplr Workforce", seats_purchased: 9000, seats_used: 8612, environment: "production+test", version: "2026.2" },
        { product: "symplr Compliance", seats_purchased: 300, seats_used: 211, environment: "production", version: "11.8" },
      ],
      notes: "Flagship reference customer. Directory publishes the public 'Find a Doctor' site. Repeated Privilege Group syndication complaints.",
    },
    {
      id: "org_lakeshore", name: "Lakeshore Children's Hospital", domain: "lakeshorechildrens.org", type: "Pediatric academic medical center",
      beds: 380, state: "IL", tier: "Mid-Market", support_plan: "Standard",
      csm: { name: "Marcus Lee", email: "marcus.lee@symplr-demo.com" },
      contract_renewal_date: date(28), arr_usd: 184000, health_score: "yellow",
      licenses: [
        { product: "symplr Access", seats_purchased: 250, seats_used: 250, environment: "production", version: "8.4" },
        { product: "MSOW", seats_purchased: 40, seats_used: 33, environment: "production", version: "24.3.1" },
      ],
      notes: "At seat cap on symplr Access. Renewal in under 30 days. Many vendor reps migrating from IntelliCentrics.",
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
      notes: "Two Workforce integration failures this month. Payroll runs Friday. Exec escalation risk.",
    },
    {
      id: "org_northfield", name: "Northfield Regional Health", domain: "northfieldregional.org", type: "Regional health system",
      beds: 720, state: "MN", tier: "Enterprise", support_plan: "Premier",
      csm: { name: "Dana Whitfield", email: "dana.whitfield@symplr-demo.com" },
      contract_renewal_date: date(160), arr_usd: 398000, health_score: "yellow",
      licenses: [
        { product: "MSOW", seats_purchased: 80, seats_used: 61, environment: "production+test", version: "24.3.1" },
        { product: "symplr Directory", seats_purchased: 30, seats_used: 22, environment: "production", version: "7.2" },
        { product: "symplr Contract", seats_purchased: 60, seats_used: 44, environment: "production", version: "9.1" },
        { product: "symplr Workforce", seats_purchased: 5200, seats_used: 4975, environment: "production", version: "2026.2" },
      ],
      notes: "Uses Epic. Dozens of individual MSOW-to-Directory discrepancy tickets this year. Asking for a full true-up.",
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
    {
      id: "org_stbrendan", name: "St. Brendan Medical Center", domain: "stbrendanmc.org", type: "Academic medical center",
      beds: 610, state: "MA", tier: "Enterprise", support_plan: "Premier",
      csm: { name: "Priya Raman", email: "priya.raman@symplr-demo.com" },
      contract_renewal_date: date(120), arr_usd: 455000, health_score: "yellow",
      licenses: [
        { product: "symplr Care Management", seats_purchased: 350, seats_used: 318, environment: "production+test", version: "15.4" },
        { product: "MSOW", seats_purchased: 60, seats_used: 52, environment: "production", version: "24.3.1" },
      ],
      notes: "Quality team reports through ODBC into Crystal Reports. Inbound ADT interface has halted several times this year.",
    },
    {
      id: "org_prairie", name: "Prairie Health Partners", domain: "prairiehp.com", type: "Health plan and provider network",
      beds: 0, state: "NE", tier: "Enterprise", support_plan: "Premier",
      csm: { name: "Dana Whitfield", email: "dana.whitfield@symplr-demo.com" },
      contract_renewal_date: date(40), arr_usd: 520000, health_score: "red",
      licenses: [
        { product: "symplr Payer", seats_purchased: 75, seats_used: 68, environment: "production+test", version: "12.6" },
      ],
      notes: "Active practitioner onboarding cycle. NPDB queries failing. Renewal in about 6 weeks.",
    },
  ];

  const users: User[] = [
    { id: "usr_001", org_id: "org_riverbend", email: "jdavis@riverbendhealth.org", name: "Jordan Davis", title: "Medical Staff Services Coordinator", role: "Credentialing Specialist", products: ["MSOW"], status: "locked", sso_enabled: false, mfa_enabled: true, failed_login_attempts: 6, last_login_at: iso(-3) },
    { id: "usr_002", org_id: "org_riverbend", email: "amorales@riverbendhealth.org", name: "Alicia Morales", title: "Director, Medical Staff Services", role: "Org Admin", products: ["MSOW", "symplr Directory", "symplr Compliance"], status: "active", sso_enabled: false, mfa_enabled: true, failed_login_attempts: 0, last_login_at: iso(-0.2) },
    { id: "usr_003", org_id: "org_riverbend", email: "tnguyen@riverbendhealth.org", name: "Tom Nguyen", title: "Workforce Systems Analyst", role: "Workforce Admin", products: ["symplr Workforce"], status: "active", sso_enabled: true, mfa_enabled: true, failed_login_attempts: 0, last_login_at: iso(-1) },
    { id: "usr_010", org_id: "org_riverbend", email: "eblake@riverbendhealth.org", name: "Erin Blake", title: "Provider Directory Manager", role: "Directory Admin", products: ["symplr Directory", "MSOW"], status: "active", sso_enabled: false, mfa_enabled: true, failed_login_attempts: 0, last_login_at: iso(-0.1) },
    { id: "usr_004", org_id: "org_lakeshore", email: "kbrennan@lakeshorechildrens.org", name: "Kate Brennan", title: "Supply Chain Manager", role: "Access Admin", products: ["symplr Access"], status: "active", sso_enabled: true, mfa_enabled: true, failed_login_attempts: 0, last_login_at: iso(-0.5) },
    { id: "usr_005", org_id: "org_lakeshore", email: "rpatel@lakeshorechildrens.org", name: "Ravi Patel", title: "Credentialing Analyst", role: "Credentialing Specialist", products: ["MSOW"], status: "pending_invite", sso_enabled: true, mfa_enabled: false, failed_login_attempts: 0, last_login_at: null },
    { id: "usr_006", org_id: "org_mesavalley", email: "sgarcia@mesavalleymc.org", name: "Sofia Garcia", title: "HRIS Manager", role: "Workforce Admin", products: ["symplr Workforce"], status: "active", sso_enabled: false, mfa_enabled: true, failed_login_attempts: 1, last_login_at: iso(-0.1) },
    { id: "usr_011", org_id: "org_mesavalley", email: "dpowell@mesavalleymc.org", name: "Dana Powell", title: "Payroll Manager", role: "Workforce User", products: ["symplr Workforce"], status: "active", sso_enabled: false, mfa_enabled: true, failed_login_attempts: 0, last_login_at: iso(-0.05) },
    { id: "usr_007", org_id: "org_mesavalley", email: "bkim@mesavalleymc.org", name: "Brian Kim", title: "Nurse Manager, ICU", role: "Scheduler", products: ["symplr Workforce"], status: "deactivated", sso_enabled: false, mfa_enabled: false, failed_login_attempts: 0, last_login_at: iso(-95) },
    { id: "usr_008", org_id: "org_northfield", email: "lhansen@northfieldregional.org", name: "Lars Hansen", title: "Manager, Provider Enrollment", role: "Org Admin", products: ["MSOW", "symplr Directory", "symplr Contract"], status: "active", sso_enabled: true, mfa_enabled: true, failed_login_attempts: 0, last_login_at: iso(-0.3) },
    { id: "usr_009", org_id: "org_coastal", email: "mwright@coastalbhn.org", name: "Maya Wright", title: "Staffing Coordinator", role: "CTM Admin", products: ["symplr CTM"], status: "active", sso_enabled: false, mfa_enabled: false, failed_login_attempts: 0, last_login_at: iso(-2) },
    { id: "usr_012", org_id: "org_stbrendan", email: "rokafor@stbrendanmc.org", name: "Renee Okafor", title: "Quality Reporting Lead", role: "Care Management Admin", products: ["symplr Care Management"], status: "active", sso_enabled: true, mfa_enabled: true, failed_login_attempts: 0, last_login_at: iso(-0.2) },
    { id: "usr_013", org_id: "org_stbrendan", email: "jfoley@stbrendanmc.org", name: "James Foley", title: "Interface Analyst", role: "Integration Admin", products: ["symplr Care Management"], status: "active", sso_enabled: true, mfa_enabled: true, failed_login_attempts: 0, last_login_at: iso(-0.1) },
    { id: "usr_014", org_id: "org_prairie", email: "mcastillo@prairiehp.com", name: "Monica Castillo", title: "Director, Provider Operations", role: "Payer Admin", products: ["symplr Payer"], status: "active", sso_enabled: false, mfa_enabled: true, failed_login_attempts: 0, last_login_at: iso(-0.1) },
  ];

  const integrations: Integration[] = [
    { id: "int_rb_epic", org_id: "org_riverbend", product: "MSOW", system: "Epic", type: "Provider master (HL7 MFN)", direction: "outbound", status: "healthy", last_successful_sync_at: iso(-0.25), error_code: null, error_message: null, records_pending: 0, credential_owner: "symplr", alerting_enabled: true },
    { id: "int_rb_ukg", org_id: "org_riverbend", product: "symplr Workforce", system: "UKG Pro", type: "Payroll export", direction: "outbound", status: "healthy", last_successful_sync_at: iso(-0.5), error_code: null, error_message: null, records_pending: 0, credential_owner: "symplr", alerting_enabled: true },
    { id: "int_mv_workday", org_id: "org_mesavalley", product: "symplr Workforce", system: "Workday", type: "HRIS employee demographics", direction: "inbound", status: "failing", last_successful_sync_at: iso(-6), error_code: "AUTH_TOKEN_EXPIRED", error_message: "Workday integration system user password expired. Customer must update credentials in Workday and re-authorize in symplr Workforce > Admin > Interfaces.", records_pending: 143, credential_owner: "customer", alerting_enabled: true, customer_visible_error: true },
    { id: "int_mv_payroll", org_id: "org_mesavalley", product: "symplr Workforce", system: "ADP Workforce Now", type: "Time punch export to payroll (API)", direction: "outbound", status: "failing", last_successful_sync_at: iso(-1.4), error_code: "AUTH_TOKEN_EXPIRED", error_message: "symplr-managed API token for the payroll feed expired. Every run since has failed silently. No alert raised and nothing written to the customer-visible log. Punches are queued in Workforce, not lost.", records_pending: 1284, credential_owner: "symplr", alerting_enabled: false, customer_visible_error: false, token_expires_at: iso(-1.4) },
    { id: "int_mv_lawson", org_id: "org_mesavalley", product: "symplr Spend", system: "Infor Lawson", type: "PO and invoice feed", direction: "bidirectional", status: "healthy", last_successful_sync_at: iso(-0.4), error_code: null, error_message: null, records_pending: 0, credential_owner: "symplr", alerting_enabled: true },
    { id: "int_nf_epic", org_id: "org_northfield", product: "MSOW", system: "Epic", type: "Provider master (HL7 MFN)", direction: "outbound", status: "degraded", last_successful_sync_at: iso(-1.2), error_code: "SFTP_TIMEOUT", error_message: "Nightly SFTP drop timed out on last run. 37 provider records queued. Usually clears on resync.", records_pending: 37, credential_owner: "symplr", alerting_enabled: true },
    { id: "int_lk_badge", org_id: "org_lakeshore", product: "symplr Access", system: "Lenel OnGuard", type: "Badge printer / door access", direction: "outbound", status: "healthy", last_successful_sync_at: iso(-0.05), error_code: null, error_message: null, records_pending: 0, credential_owner: "symplr", alerting_enabled: true },
    { id: "int_sb_adt", org_id: "org_stbrendan", product: "symplr Care Management", system: "Epic (via Cloverleaf)", type: "Inbound ADT feed (HL7 v2)", direction: "inbound", status: "halted", last_successful_sync_at: iso(-0.9), error_code: "MALFORMED_HL7_SEGMENT", error_message: "Interface engine stopped processing at queue position 1. The engine does not skip bad records or raise alerts, so the entire feed is blocked behind one message.", records_pending: 842, credential_owner: "symplr", alerting_enabled: false, customer_visible_error: false },
  ];

  const interface_messages: InterfaceMessage[] = [
    { id: "msg_sb_0001", integration_id: "int_sb_adt", position: 1, received_at: iso(-0.9), message_type: "ADT^A08", status: "blocking", problem: "PID-7 (date of birth) is '20261345', which is not a valid date. Engine halted on parse error.", segment_excerpt: "PID|1||MRN-PLACEHOLDER^^^SBMC||DOE^SYNTHETIC||20261345|F|||..." },
    { id: "msg_sb_0002", integration_id: "int_sb_adt", position: 2, received_at: iso(-0.89), message_type: "ADT^A01", status: "queued", problem: null, segment_excerpt: "PID|1||MRN-PLACEHOLDER^^^SBMC||SAMPLE^PATIENT||19750412|M|||..." },
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

  // MSOW -> symplr Directory profiles (CASE-002, 003, 005, 007)
  const directory_profiles: DirectoryProfile[] = [
    { id: "dir_rb_001", org_id: "org_riverbend", provider_name: "Dr. Amara Patel", npi: "1811204457", msow_status: "credentialed", msow_updated_at: iso(-3.9), msow_facility_code: "RBH01",
      directory_status: "not_created", last_synced_at: iso(-4), sync_state: "missed_sync_window",
      sync_detail: "MSOW credentialing status changed after the nightly Directory sync window closed. The next run did not re-evaluate records it had already processed, so the profile was never created.",
      msow_privileges: ["Internal Medicine - Core"], directory_privileges: [], msow_privilege_group: "Internal Medicine", directory_privilege_group: null, known_issue_id: "KI-303" },
    { id: "dir_rb_002", org_id: "org_riverbend", provider_name: "Dr. Owen Reyes", npi: "1922051136", msow_status: "inactive_flagged_for_deletion", msow_updated_at: iso(-6), msow_facility_code: "RBH01",
      directory_status: "pending_delete", last_synced_at: iso(-5.9), sync_state: "stuck_pending_delete",
      sync_detail: "Record entered pending-delete, but the downstream delete job errored and never completed. No alert was raised. The public directory still shows the provider as active.",
      msow_privileges: [], directory_privileges: ["General Surgery - Core"], msow_privilege_group: null, directory_privilege_group: "General Surgery", known_issue_id: "KI-304" },
    { id: "dir_rb_003", org_id: "org_riverbend", provider_name: "Dr. Hannah Brooks", npi: "1033478219", msow_status: "inactive_flagged_for_deletion", msow_updated_at: iso(-6), msow_facility_code: "RBH02",
      directory_status: "pending_delete", last_synced_at: iso(-5.9), sync_state: "stuck_pending_delete",
      sync_detail: "Record entered pending-delete, but the downstream delete job errored and never completed. No alert was raised. The public directory still shows the provider as active.",
      msow_privileges: [], directory_privileges: ["Obstetrics - Core"], msow_privilege_group: null, directory_privilege_group: "Obstetrics & Gynecology", known_issue_id: "KI-304" },
    { id: "dir_rb_004", org_id: "org_riverbend", provider_name: "Kim Tran, NP", npi: "1245839026", msow_status: "credentialed", msow_updated_at: iso(-15), msow_facility_code: "RBH-MAIN",
      directory_status: "active", last_synced_at: iso(-0.8), sync_state: "privileges_blocked",
      sync_detail: "Privilege import skipped without error: MSOW facility code 'RBH-MAIN' has no entry in the Directory facility mapping table, so the validation rule rejects the privileges.",
      msow_privileges: ["Family Medicine - NP Core", "Telehealth"], directory_privileges: [], msow_privilege_group: "Advanced Practice", directory_privilege_group: "Advanced Practice", known_issue_id: "KI-305" },
    { id: "dir_rb_005", org_id: "org_riverbend", provider_name: "Dr. Marcus Chen", npi: "1588120934", msow_status: "credentialed", msow_updated_at: iso(-2), msow_facility_code: "RBH01",
      directory_status: "active", last_synced_at: iso(-1.5), sync_state: "privilege_group_mismatch",
      sync_detail: "Two Privilege Group change events arrived in the same sync window and were processed out of order. The older group was kept.",
      msow_privileges: ["Emergency Medicine - Core", "Sedation"], directory_privileges: ["Emergency Medicine - Core"], msow_privilege_group: "Emergency Medicine - Attending", directory_privilege_group: "Emergency Medicine - Provisional", known_issue_id: "KI-301" },
    { id: "dir_rb_006", org_id: "org_riverbend", provider_name: "Dr. Elena Vasquez", npi: "1902847561", msow_status: "in_progress", msow_updated_at: iso(-1), msow_facility_code: "RBH01",
      directory_status: "not_created", last_synced_at: iso(-1), sync_state: "in_sync", sync_detail: "Not eligible for a Directory profile until credentialing is approved.",
      msow_privileges: [], directory_privileges: [], msow_privilege_group: null, directory_privilege_group: null, known_issue_id: null },
    { id: "dir_nf_001", org_id: "org_northfield", provider_name: "Dr. Grace Holm", npi: "1356719402", msow_status: "credentialed", msow_updated_at: iso(-40), msow_facility_code: "NRH-MPLS",
      directory_status: "active", last_synced_at: iso(-12), sync_state: "out_of_sync", sync_detail: "Location differs: MSOW lists Children's Clinic (Minneapolis); Directory still shows St. Cloud campus. Failed batch was retried but never re-queued.",
      msow_privileges: ["Pediatrics - Core"], directory_privileges: ["Pediatrics - Core"], msow_privilege_group: "Pediatrics", directory_privilege_group: "Pediatrics", known_issue_id: "KI-306" },
    { id: "dir_nf_002", org_id: "org_northfield", provider_name: "Dr. Samuel Lindqvist", npi: "1467093825", msow_status: "in_progress", msow_updated_at: iso(-4), msow_facility_code: "NRH-MPLS",
      directory_status: "active", last_synced_at: iso(-90), sync_state: "out_of_sync", sync_detail: "Status differs: Directory shows the provider as active but MSOW application is still in progress. Failed batch was retried but never re-queued.",
      msow_privileges: [], directory_privileges: ["Orthopedic Surgery - Core"], msow_privilege_group: null, directory_privilege_group: "Orthopedics", known_issue_id: "KI-306" },
  ];

  const facility_mappings: FacilityMapping[] = [
    { org_id: "org_riverbend", msow_facility_code: "RBH01", directory_facility: "Riverbend Main Campus" },
    { org_id: "org_riverbend", msow_facility_code: "RBH02", directory_facility: "Riverbend North Hospital" },
    { org_id: "org_northfield", msow_facility_code: "NRH-MPLS", directory_facility: "Northfield Minneapolis" },
    { org_id: "org_northfield", msow_facility_code: "NRH-STC", directory_facility: "Northfield St. Cloud" },
  ];

  // CASE-010
  const sync_jobs: SyncJob[] = [
    { id: "job_rb_dir", org_id: "org_riverbend", job: "MSOW to symplr Directory nightly sync", status: "healthy", degraded_since: null,
      retry_policy: "Failed batches retried 3x, then re-queued for the next run", runs_last_30_days: 30, success_rate_last_30_days: 99.2,
      failed_batches_last_30_days: 1, batch_failure_alerting: false, last_audit: null, known_issue_id: null },
    { id: "job_nf_dir", org_id: "org_northfield", job: "MSOW to symplr Directory nightly sync", status: "degraded", degraded_since: date(-243),
      retry_policy: "MISCONFIGURED: failed batches are retried but never re-queued, so records silently fall out of sync", runs_last_30_days: 30, success_rate_last_30_days: 71.4,
      failed_batches_last_30_days: 86, batch_failure_alerting: false,
      last_audit: { run_at: iso(-0.5), providers_total: 1426, mismatched: 312, by_type: { provider_status: 141, location: 96, privileges: 75 } },
      known_issue_id: "KI-306" },
  ];

  // CASE-008
  const npdb_accounts: NpdbAccount[] = [
    { org_id: "org_prairie", npdb_account_id: "NPDB-PHP-20871", query_credit_balance: 0, credit_reload_mode: "manual", low_balance_alert_enabled: false,
      eft_payment_flag: true, eft_payment_flag_expected: false,
      last_successful_query_at: iso(-21), queries_failed_since: iso(-21), failed_query_count: 214, practitioners_blocked: 38,
      recent_errors: [
        { at: iso(-0.2), npdb_raw_response: "HTTP 200 with non-standard body: {status:'REJECTED', reason_codes:['CR0','PAYCFG']}", message_shown_to_user: "An error occurred while submitting your request. Please try again." },
        { at: iso(-1.1), npdb_raw_response: "HTTP 200 with non-standard body: {status:'REJECTED', reason_codes:['CR0','PAYCFG']}", message_shown_to_user: "An error occurred while submitting your request. Please try again." },
      ] },
  ];

  // CASE-004
  const service_accounts: ServiceAccount[] = [
    { org_id: "org_stbrendan", username: "svc_crystal_odbc", purpose: "ODBC reporting connection (Crystal Reports)", status: "active", schema: "cm_reporting",
      permissions: [], expected_permissions: ["SELECT"], last_successful_connection_at: iso(-8), recent_failures: 412,
      last_permission_change: { at: iso(-8.1), changed_by: "Scheduled maintenance job MJ-CLEANUP-114 (service account cleanup sweep)", action: "REVOKE SELECT ON cm_reporting" } },
    { org_id: "org_stbrendan", username: "svc_tableau_ro", purpose: "Read-only analytics extract", status: "active", schema: "cm_reporting",
      permissions: ["SELECT"], expected_permissions: ["SELECT"], last_successful_connection_at: iso(-0.1), recent_failures: 0, last_permission_change: null },
  ];

  const vendor_reps: VendorRep[] = [
    { id: "vr_001", email: "tyler.brooks@medisurge-demo.com", name: "Tyler Brooks", company: "MediSurge Devices", facilities: ["org_lakeshore"], badge_status: "denied", missing_requirements: ["Influenza vaccination attestation for current season", "Hospital-specific OR orientation (Lakeshore)"], last_check_in_attempt_at: iso(-0.08), subscription_expires_on: date(140) },
    { id: "vr_002", email: "rachel.ng@ortholine-demo.com", name: "Rachel Ng", company: "OrthoLine Implants", facilities: ["org_lakeshore"], badge_status: "active", missing_requirements: [], last_check_in_attempt_at: iso(-1), subscription_expires_on: date(200) },
    { id: "vr_003", email: "dev.shah@cardiotek-demo.com", name: "Dev Shah", company: "CardioTek", facilities: ["org_lakeshore"], badge_status: "expired", missing_requirements: ["Annual vendor subscription renewal"], last_check_in_attempt_at: iso(-0.5), subscription_expires_on: date(-2) },
    // CASE-012 geo-block
    { id: "vr_004", email: "lucia.ferreira@stridemed-demo.com", name: "Lucia Ferreira", company: "StrideMed Orthopedics", facilities: ["org_lakeshore"], badge_status: "active", missing_requirements: [], last_check_in_attempt_at: iso(-60), subscription_expires_on: date(180), account_created_on: "2023-03-14",
      login: { status: "geo_blocked", last_password_reset_at: null, recent_attempts: [
        { at: iso(-0.3), country: "Portugal", channel: "web", result: "BLOCKED_NON_US_IP" },
        { at: iso(-0.25), country: "Portugal", channel: "mobile_app", result: "BLOCKED_NON_US_IP" },
        { at: iso(-45), country: "United States", channel: "web", result: "SUCCESS" } ] } },
    // CASE-013 password mismatch after reset
    { id: "vr_005", email: "ben.carter@novacardia-demo.com", name: "Ben Carter", company: "NovaCardia", facilities: ["org_lakeshore"], badge_status: "active", missing_requirements: [], last_check_in_attempt_at: iso(-10), subscription_expires_on: date(95), account_created_on: "2024-08-02",
      login: { status: "password_mismatch", last_password_reset_at: iso(-0.1), recent_attempts: [
        { at: iso(-0.09), country: "United States", channel: "mobile_app", result: "PASSWORD_MISMATCH (saved credential predates reset)" },
        { at: iso(-0.08), country: "United States", channel: "web", result: "PASSWORD_MISMATCH (browser autofill predates reset)" },
        { at: iso(-0.07), country: "United States", channel: "web", result: "PASSWORD_MISMATCH" } ] } },
    // CASE-014 IntelliCentrics confusion
    { id: "vr_006", email: "priya.nand@helixsurgical-demo.com", name: "Priya Nandakumar", company: "Helix Surgical", facilities: ["org_lakeshore", "org_riverbend"], badge_status: "active", missing_requirements: [], last_check_in_attempt_at: iso(-7), subscription_expires_on: date(14), account_created_on: "2025-01-20",
      subscription: { plan: "symplr Access Prime (annual)", auto_renew: false, renews_on: date(14), credentials_expiring_on: date(14) },
      charges: [{ date: date(-351), amount_usd: 599, description: "symplr Access Prime annual", card_charged_last4: "2210", card_on_receipt_last4: "2210" }],
      intellicentrics: { customer_reports_ic_account: true, note: "symplr cannot see IntelliCentrics SEC3URE accounts, payments, or facility lists. The two platforms are still separate systems with separate subscriptions." } },
    // CASE-015 double charge
    { id: "vr_007", email: "derek.olsen@apexspine-demo.com", name: "Derek Olsen", company: "Apex Spine", facilities: ["org_lakeshore"], badge_status: "active", missing_requirements: [], last_check_in_attempt_at: iso(-3), subscription_expires_on: date(364), account_created_on: "2022-11-09",
      subscription: { plan: "symplr Access Prime (annual)", auto_renew: true, renews_on: date(364), credentials_expiring_on: null },
      charges: [{ date: date(-1), amount_usd: 599, description: "symplr Access Prime annual renewal", card_charged_last4: "4417", card_on_receipt_last4: "0932" }],
      intellicentrics: { customer_reports_ic_account: true, note: "symplr cannot see IntelliCentrics SEC3URE accounts, payments, or facility lists. The two platforms are still separate systems with separate subscriptions." } },
    // CASE-016 migration activation blocked by VPN
    { id: "vr_008", email: "alyssa.romero@vitalflow-demo.com", name: "Alyssa Romero", company: "VitalFlow Medical", facilities: ["org_lakeshore", "org_northfield"], badge_status: "suspended", missing_requirements: ["Complete account activation"], last_check_in_attempt_at: null, subscription_expires_on: date(365), account_created_on: date(-3),
      login: { status: "pending_activation", last_password_reset_at: null, recent_attempts: [] },
      activation: { status: "sent_not_completed", email_sent_to: "alyssa.romero@vitalflow-demo.com", email_sent_at: iso(-3), sender: "noreply@symplr.com",
        link_attempts: [ { at: iso(-2.9), result: "BLOCKED: request did not reach symplr (corporate VPN / web filter)" }, { at: iso(-1.2), result: "BLOCKED: request did not reach symplr (corporate VPN / web filter)" } ],
        migrated_facilities: ["Lakeshore Children's Hospital", "Northfield Regional Health"] } },
    // CASE-017 Gen 1 badge
    { id: "vr_009", email: "marcus.webb@orthogen-demo.com", name: "Marcus Webb", company: "OrthoGen", facilities: ["org_lakeshore"], badge_status: "active", missing_requirements: [], last_check_in_attempt_at: iso(-0.2), subscription_expires_on: date(300), account_created_on: date(-30),
      charges: [{ date: date(-30), amount_usd: 599, description: "symplr Access Prime annual (migrated from IntelliCentrics)", card_charged_last4: "7781", card_on_receipt_last4: "7781" }],
      intellicentrics: { customer_reports_ic_account: true, note: "Account migrated from IntelliCentrics. Hardware does not transfer with the account." },
      badges: [ { serial: "GO1-00048213", model: "GO! Smart Badge", generation: 1, issued_by: "IntelliCentrics", status: "deactivated", compatible_with_symplr_app: false } ] },
  ];

  // Pattern detection across cases
  const known_issues: KnownIssue[] = [
    { id: "KI-301", title: "Directory channel keeps the old Privilege Group after an update", products: ["symplr Directory"], category: "Bug", status: "fix_in_progress", linked_cases: 6,
      summary: "When two Privilege Group change events land in the same sync window, the syndication pipeline processes them out of order and keeps the older record. Earlier tickets were closed by re-running sync, which fixes the symptom only.",
      recommended_handling: "Re-sync the profile to correct it now, tell the customer it is a known recurring defect, and escalate (P2) linking KI-301 so engineering prioritizes the ordering fix." },
    { id: "KI-302", title: "Inbound HL7 interface halts on a single malformed message", products: ["symplr Care Management"], category: "Integration", status: "open", linked_cases: 4,
      summary: "The interface engine does not skip bad records or alert. One malformed segment stops the whole feed until someone notices missing data.",
      recommended_handling: "Inspect the interface queue, quarantine the blocking message, restart the feed, and ask the customer's interface team to correct and resend the quarantined message. Link KI-302." },
    { id: "KI-303", title: "Directory profile not created when MSOW changes land after the sync window", products: ["symplr Directory", "MSOW"], category: "Data Sync", status: "open", linked_cases: 9,
      summary: "Records updated after the nightly window are not re-evaluated on the next run.",
      recommended_handling: "Trigger a Directory import for the provider. If several providers are affected, flag a possible sync scheduling issue." },
    { id: "KI-304", title: "Delete propagation from MSOW to Directory fails silently", products: ["symplr Directory", "MSOW"], category: "Data Sync", status: "open", linked_cases: 3,
      summary: "Records stick in pending-delete when the downstream delete job errors. No alert.",
      recommended_handling: "Re-sync each stuck profile to complete the delete." },
    { id: "KI-305", title: "Privileges skipped when MSOW facility code is not mapped in Directory", products: ["symplr Directory"], category: "Configuration", status: "by_design", linked_cases: 7,
      summary: "Privilege sync silently skips records whose facility code has no mapping. Recurring for customers with inconsistent facility codes.",
      recommended_handling: "Add the missing facility code mapping, then re-run privilege sync. Suggest the customer review all facility codes." },
    { id: "KI-306", title: "Nightly MSOW to Directory sync degraded by retry policy misconfiguration", products: ["symplr Directory", "MSOW"], category: "Data Sync", status: "open", linked_cases: 31,
      summary: "Failed batches retried but never re-queued, so records drift out of sync over months. Shows up as many unrelated individual discrepancy tickets.",
      recommended_handling: "Do not fix records one by one. Escalate P2 for a full true-up in a maintenance window and a retry policy fix. Recommend batch failure alerting." },
    { id: "KI-307", title: "Integration auth token expired with no alert", products: ["symplr Workforce"], category: "Integration", status: "open", linked_cases: 5,
      summary: "symplr-managed integration tokens expire and jobs fail silently. Data queues but is not sent.",
      recommended_handling: "Rotate the integration token (symplr-managed credential), confirm queued records were delivered, and recommend expiry alerting." },
    { id: "KI-308", title: "NPDB queries fail with a generic error in Payer", products: ["symplr Payer"], category: "Integration", status: "fix_in_progress", linked_cases: 2,
      summary: "Payer does not handle non-standard NPDB responses, so credit exhaustion or account configuration problems surface as a generic error.",
      recommended_handling: "Check the NPDB account: credit balance, reload mode, and EFT payment flag. Credits must be purchased by the customer through NPDB. symplr can correct the EFT flag. A product fix for error messaging is in progress." },
    { id: "KI-401", title: "symplr Access blocks sign-ins from outside the United States", products: ["symplr Access"], category: "Account Access", status: "by_design", linked_cases: 58,
      summary: "Sign-ins from non-US IP addresses are blocked.",
      recommended_handling: "Tell the user to sign in from within the US or use a VPN. No account change needed." },
    { id: "KI-402", title: "Password resets cannot be completed over email support", products: ["symplr Access"], category: "Account Access", status: "by_design", linked_cases: 212,
      summary: "Policy: password resets require identity verification by phone or live chat. Mismatch errors after a self-service reset are usually cached sessions or browser autofill.",
      recommended_handling: "Explain the policy kindly. Have the user clear saved passwords and autofill, use 'Forgot your password' on the login screen, and if it still fails, call support or use live chat for a verified manual reset." },
    { id: "KI-403", title: "IntelliCentrics and symplr Access are separate systems", products: ["symplr Access"], category: "IntelliCentrics Acquisition", status: "by_design", linked_cases: 340,
      summary: "Despite the acquisition, IntelliCentrics SEC3URE and symplr Access still have separate accounts, subscriptions, and billing. symplr has no access to IntelliCentrics account data.",
      recommended_handling: "Acknowledge the confusion, explain the platforms are separate and payment on one does not cover the other, answer anything about the symplr account, and refer IntelliCentrics account, refund, and facility-list questions to IntelliCentrics directly." },
    { id: "KI-404", title: "Migration activation link blocked by corporate VPN", products: ["symplr Access"], category: "IntelliCentrics Acquisition", status: "by_design", linked_cases: 47,
      summary: "Facilities migrating from IntelliCentrics send an activation email from noreply@symplr.com. Corporate VPNs and web filters often block the link.",
      recommended_handling: "Confirm the activation email address, have the user open the link in a web browser (not the app) off VPN or ask IT to allow it, and resend the activation email if needed." },
    { id: "KI-405", title: "Gen 1 GO! badges are not supported in symplr Access", products: ["symplr Access"], category: "IntelliCentrics Acquisition", status: "by_design", linked_cases: 63,
      summary: "Gen 1 badges issued under IntelliCentrics are deactivated and incompatible with the symplr app. Hardware does not transfer with account migration.",
      recommended_handling: "Confirm the badge is Gen 1 and deactivated, acknowledge the frustration of paying twice, and direct the user to buy a new Smart Badge in their symplr Access account." },
  ];

  const incidents: Incident[] = [
    { id: "inc_2026_118", title: "Delayed time punch processing in symplr Workforce", products: ["symplr Workforce"], region: "US-East", status: "monitoring", severity: "major", started_at: iso(-0.3), resolved_at: null, customer_message: "Some time clock punches are processing with up to a 45 minute delay. No punches are lost. A fix has been deployed and we are monitoring." },
    { id: "inc_2026_112", title: "MSOW report exports timing out", products: ["MSOW"], region: "All", status: "resolved", severity: "minor", started_at: iso(-4), resolved_at: iso(-3.8), customer_message: "Large report exports were timing out. Resolved." },
  ];

  const escalations: Escalation[] = [];

  return { organizations, users, integrations, interface_messages, providers, directory_profiles, facility_mappings, sync_jobs, npdb_accounts, service_accounts, vendor_reps, known_issues, incidents, escalations };
}

export type DB = ReturnType<typeof buildSeed>;
