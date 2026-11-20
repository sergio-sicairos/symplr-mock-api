import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Zip (procurement orchestration) mock back office, served as a stateless MCP server.
// All data is synthetic: no real companies, people, bank details, or card numbers.
// Auth: x-api-key header, Authorization: Bearer <key>, or ?key=<key>. Reset: POST ?reset=1

const DAY = 86400000;
const iso = (d: number) => new Date(Date.now() + d * DAY).toISOString();
const date = (d: number) => iso(d).slice(0, 10);
const now = () => new Date().toISOString();

function seed() {
  const organizations = [
    { id: "org_halcyon", name: "Halcyon Bank", domain: "halcyonbank-demo.com", industry: "Financial services", employees: 8200, tier: "Enterprise", support_plan: "Premier",
      erp: "Oracle Fusion", idp: "Okta (SSO + SCIM)", csm: { name: "Jordan Ames", email: "jordan.ames@zip-demo.com" }, contract_renewal_date: date(38), arr_usd: 690000, health_score: "yellow",
      modules: ["Intake-to-Procure", "Procure-to-Pay", "Supplier Onboarding", "Risk Orchestration", "AI Contract Orchestration", "AP Automation"],
      seats: { purchased: 1500, used: 1462 }, notes: "Renewal in about 5 weeks. Exec sponsor frustrated by approval delays." },
    { id: "org_northwind", name: "Northwind Robotics", domain: "northwindrobotics-demo.com", industry: "Hardware / robotics", employees: 1400, tier: "Mid-Market", support_plan: "Standard",
      erp: "NetSuite", idp: "Google Workspace (SSO)", csm: { name: "Tessa Grant", email: "tessa.grant@zip-demo.com" }, contract_renewal_date: date(190), arr_usd: 145000, health_score: "green",
      modules: ["Intake-to-Procure", "Procure-to-Pay", "Budgets", "AP Automation", "Global Payments"],
      seats: { purchased: 400, used: 311 }, notes: "Expanding to EMEA with a new German subsidiary." },
    { id: "org_ferrous", name: "Ferrous Energy", domain: "ferrousenergy-demo.com", industry: "Energy", employees: 12500, tier: "Enterprise", support_plan: "Premier",
      erp: "SAP S/4HANA", idp: "Microsoft Entra ID (SSO + SCIM)", csm: { name: "Jordan Ames", email: "jordan.ames@zip-demo.com" }, contract_renewal_date: date(260), arr_usd: 980000, health_score: "red",
      modules: ["Intake-to-Procure", "Procure-to-Pay", "Supplier Onboarding", "Risk Orchestration", "Vendor Cards"],
      seats: { purchased: 3000, used: 2710 }, notes: "SAP integration outage this week. Quarter-end close in 10 days." },
    { id: "org_lumen", name: "Lumen Bio", domain: "lumenbio-demo.com", industry: "Biotech", employees: 650, tier: "Mid-Market", support_plan: "Premier",
      erp: "Workday Financials", idp: "Okta (SSO)", csm: { name: "Tessa Grant", email: "tessa.grant@zip-demo.com" }, contract_renewal_date: date(120), arr_usd: 118000, health_score: "green",
      modules: ["Intake-to-Procure", "Supplier Onboarding", "AI Contract Orchestration", "Budgets"],
      seats: { purchased: 200, used: 164 }, notes: "Legal ops team heavy user of contract orchestration." },
  ];

  const users = [
    { email: "priya.shah@halcyonbank-demo.com", org_id: "org_halcyon", name: "Priya Shah", title: "Procurement Operations Manager", role: "Procurement Admin", status: "active", department: "Procurement", manager: null, out_of_office: null, delegate: null },
    { email: "mark.oduya@halcyonbank-demo.com", org_id: "org_halcyon", name: "Mark Oduya", title: "Marketing Programs Lead", role: "Requester", status: "active", department: "Marketing", manager: "lisa.chen@halcyonbank-demo.com", out_of_office: null, delegate: null },
    { email: "lisa.chen@halcyonbank-demo.com", org_id: "org_halcyon", name: "Lisa Chen", title: "VP Marketing (former)", role: "Approver", status: "deactivated", deactivated_at: iso(-9), department: "Marketing", manager: "omar.haddad@halcyonbank-demo.com", out_of_office: null, delegate: null },
    { email: "omar.haddad@halcyonbank-demo.com", org_id: "org_halcyon", name: "Omar Haddad", title: "Chief Marketing Officer", role: "Approver", status: "active", department: "Marketing", manager: null, out_of_office: null, delegate: null },
    { email: "grace.liu@halcyonbank-demo.com", org_id: "org_halcyon", name: "Grace Liu", title: "Chief Financial Officer", role: "Approver", status: "active", department: "Finance", manager: null, out_of_office: null, delegate: null },
    { email: "kevin.ross@halcyonbank-demo.com", org_id: "org_halcyon", name: "Kevin Ross", title: "IT Identity Engineer", role: "IT Admin", status: "active", department: "IT", manager: null, out_of_office: null, delegate: null },
    { email: "ana.ruiz@halcyonbank-demo.com", org_id: "org_halcyon", name: "Ana Ruiz", title: "Procurement Analyst (new hire)", role: "Procurement User", status: "not_provisioned", department: null, manager: "priya.shah@halcyonbank-demo.com", out_of_office: null, delegate: null },
    { email: "tom.becker@halcyonbank-demo.com", org_id: "org_halcyon", name: "Tom Becker", title: "AP Specialist (new hire)", role: "AP User", status: "not_provisioned", department: "Finance", manager: "priya.shah@halcyonbank-demo.com", out_of_office: null, delegate: null },
    { email: "elena.voss@northwindrobotics-demo.com", org_id: "org_northwind", name: "Elena Voss", title: "Head of Procurement", role: "Procurement Admin", status: "active", department: "Procurement", manager: null, out_of_office: null, delegate: null },
    { email: "jared.kim@northwindrobotics-demo.com", org_id: "org_northwind", name: "Jared Kim", title: "AP Specialist", role: "AP User", status: "active", department: "Finance", manager: "elena.voss@northwindrobotics-demo.com", out_of_office: null, delegate: null },
    { email: "lee.wong@northwindrobotics-demo.com", org_id: "org_northwind", name: "Lee Wong", title: "Senior Hardware Engineer", role: "Requester", status: "active", department: "Engineering", manager: "sam.patel@northwindrobotics-demo.com", out_of_office: null, delegate: null },
    { email: "sam.patel@northwindrobotics-demo.com", org_id: "org_northwind", name: "Sam Patel", title: "Director of Engineering", role: "Approver", status: "active", department: "Engineering", manager: "marcus.hale@northwindrobotics-demo.com", out_of_office: { from: date(-4), until: date(6), note: "Parental leave" }, delegate: null },
    { email: "marcus.hale@northwindrobotics-demo.com", org_id: "org_northwind", name: "Marcus Hale", title: "VP Engineering", role: "Approver, Budget Owner", status: "active", department: "Engineering", manager: null, out_of_office: null, delegate: null },
    { email: "rhea.nair@ferrousenergy-demo.com", org_id: "org_ferrous", name: "Rhea Nair", title: "Procurement Director", role: "Procurement Admin", status: "active", department: "Procurement", manager: null, out_of_office: null, delegate: null },
    { email: "dmitri.ivanov@ferrousenergy-demo.com", org_id: "org_ferrous", name: "Dmitri Ivanov", title: "AP Manager", role: "AP Admin", status: "active", department: "Finance", manager: null, out_of_office: null, delegate: null },
    { email: "owen.price@lumenbio-demo.com", org_id: "org_lumen", name: "Owen Price", title: "Legal Operations Manager", role: "Legal Admin", status: "active", department: "Legal", manager: null, out_of_office: null, delegate: null },
    { email: "nora.blake@lumenbio-demo.com", org_id: "org_lumen", name: "Nora Blake", title: "FP&A Manager", role: "Budget Owner", status: "active", department: "Finance", manager: null, out_of_office: null, delegate: null },
  ];

  const requests = [
    { id: "REQ-10482", org_id: "org_halcyon", requester: "mark.oduya@halcyonbank-demo.com", title: "Social listening platform renewal", vendor: "Brandwatch (synthetic)", amount: 86000, currency: "USD", status: "pending_approval", submitted_at: iso(-11),
      approvals: [ { step: 1, name: "Manager approval", approver: "lisa.chen@halcyonbank-demo.com", status: "approved", decided_at: iso(-10) },
        { step: 2, name: "VP Marketing approval", approver: "lisa.chen@halcyonbank-demo.com", status: "waiting", waiting_since: iso(-10) },
        { step: 3, name: "Procurement review", approver: "priya.shah@halcyonbank-demo.com", status: "not_started" } ],
      blocking_reason: "APPROVER_DEACTIVATED", blocking_detail: "Step 2 approver Lisa Chen was deactivated 9 days ago (left the company). No delegate or fallback approver is set, so the request is stuck.", routing_detail: null, po_id: null, known_issue_id: "KI-Z01" },
    { id: "REQ-10511", org_id: "org_halcyon", requester: "mark.oduya@halcyonbank-demo.com", title: "EMEA event agency retainer", vendor: "Lumière Events (synthetic)", amount: 62000, currency: "EUR", status: "approved", submitted_at: iso(-6),
      approvals: [ { step: 1, name: "Manager approval", approver: "omar.haddad@halcyonbank-demo.com", status: "approved", decided_at: iso(-5) },
        { step: 2, name: "Procurement review", approver: "priya.shah@halcyonbank-demo.com", status: "approved", decided_at: iso(-4) } ],
      blocking_reason: null, blocking_detail: null,
      routing_detail: "Workflow 'Marketing spend' should add CFO approval above USD 50,000. The threshold rule compared EUR 62,000 (about USD 67,000) to 50,000 without converting currency, so the request took the under-50k path and skipped CFO approval.", po_id: "PO-10520", known_issue_id: "KI-Z05" },
    { id: "REQ-10470", org_id: "org_halcyon", requester: "mark.oduya@halcyonbank-demo.com", title: "Trade show booth materials", vendor: "Signal Print Co (synthetic)", amount: 18400, currency: "USD", status: "approved", submitted_at: iso(-30),
      approvals: [ { step: 1, name: "Manager approval", approver: "omar.haddad@halcyonbank-demo.com", status: "approved", decided_at: iso(-29) } ], blocking_reason: null, blocking_detail: null, routing_detail: null, po_id: "PO-10470", known_issue_id: null },
    { id: "REQ-10498", org_id: "org_halcyon", requester: "priya.shah@halcyonbank-demo.com", title: "Branch facilities maintenance", vendor: "Kepler Cloud (synthetic)", amount: 41000, currency: "USD", status: "approved", submitted_at: iso(-8),
      approvals: [ { step: 1, name: "Procurement review", approver: "priya.shah@halcyonbank-demo.com", status: "approved", decided_at: iso(-7) } ], blocking_reason: null, blocking_detail: null, routing_detail: null, po_id: "PO-10498", known_issue_id: null },
    { id: "REQ-20931", org_id: "org_northwind", requester: "lee.wong@northwindrobotics-demo.com", title: "Oscilloscopes for test lab", vendor: "Tektron Instruments (synthetic)", amount: 38500, currency: "USD", status: "pending_approval", submitted_at: iso(-5),
      approvals: [ { step: 1, name: "Engineering Director approval", approver: "sam.patel@northwindrobotics-demo.com", status: "waiting", waiting_since: iso(-4) },
        { step: 2, name: "Procurement review", approver: "elena.voss@northwindrobotics-demo.com", status: "not_started" } ],
      blocking_reason: "APPROVER_OUT_OF_OFFICE", blocking_detail: "Sam Patel is out of office (parental leave) until " + date(6) + " with no delegate set. Reminders are going unanswered.", routing_detail: null, po_id: null, known_issue_id: "KI-Z02" },
    { id: "REQ-20955", org_id: "org_northwind", requester: "lee.wong@northwindrobotics-demo.com", title: "Additional cloud compute reservation", vendor: "CloudCo (synthetic)", amount: 140000, currency: "USD", status: "blocked", submitted_at: iso(-2),
      approvals: [], blocking_reason: "BUDGET_INSUFFICIENT", blocking_detail: "Engineering FY26 Q4 budget has USD 62,400 remaining; request needs USD 140,000. Zip blocks submission until the budget owner reallocates or increases the budget.", routing_detail: null, po_id: null, known_issue_id: null },
  ];

  const erp_values: Record<string, Record<string, string[]>> = {
    org_northwind: { subsidiary: ["Northwind Robotics Inc. (ID 1)", "Northwind Robotics GmbH (ID 4)"] },
  };
  const erp_mappings = [
    { org_id: "org_northwind", field: "subsidiary", zip_value: "Northwind US", erp_value: "Northwind Robotics Inc. (ID 1)" },
  ];

  const purchase_orders = [
    { id: "PO-20877", org_id: "org_northwind", request_title: "Clean room supplies for Munich site", vendor: "Alpen Lab Supply (synthetic)", amount: 22800, currency: "EUR", zip_subsidiary: "Northwind GmbH", gl_account: "6100", erp_sync_status: "failed", erp_po_number: null,
      erp_error_code: "SUBSIDIARY_NOT_MAPPED", erp_error: "NetSuite rejected the PO: Zip subsidiary 'Northwind GmbH' has no NetSuite subsidiary mapping.", last_attempt_at: iso(-1), known_issue_id: "KI-Z03" },
    { id: "PO-20890", org_id: "org_northwind", request_title: "Office supplies Q4", vendor: "Granite Office Supply (synthetic)", amount: 4200, currency: "USD", zip_subsidiary: "Northwind US", gl_account: "6400", erp_sync_status: "synced", erp_po_number: "NS-PO-88213", erp_error_code: null, erp_error: null, last_attempt_at: iso(-9), known_issue_id: null },
    { id: "PO-10498", org_id: "org_halcyon", request_title: "Branch facilities maintenance", vendor: "Kepler Cloud (synthetic)", amount: 41000, currency: "USD", zip_subsidiary: "Halcyon US", gl_account: "6150", erp_sync_status: "failed", erp_po_number: null,
      erp_error_code: "GL_ACCOUNT_INACTIVE", erp_error: "Oracle Fusion rejected the PO: GL account 6150 (Facilities Maintenance) is inactive for posting in ledger HAL-US.", last_attempt_at: iso(-0.5), known_issue_id: "KI-Z04" },
    { id: "PO-10470", org_id: "org_halcyon", request_title: "Trade show booth materials", vendor: "Signal Print Co (synthetic)", amount: 18400, currency: "USD", zip_subsidiary: "Halcyon US", gl_account: "6300", erp_sync_status: "synced", erp_po_number: "HAL-PO-55102", erp_error_code: null, erp_error: null, last_attempt_at: iso(-28), receipt_status: "not_received", known_issue_id: null },
    { id: "PO-10520", org_id: "org_halcyon", request_title: "EMEA event agency retainer", vendor: "Lumière Events (synthetic)", amount: 62000, currency: "EUR", zip_subsidiary: "Halcyon EU", gl_account: "6300", erp_sync_status: "synced", erp_po_number: "HAL-PO-55188", erp_error_code: null, erp_error: null, last_attempt_at: iso(-3), known_issue_id: null },
  ];

  const integrations = [
    { id: "int_hal_oracle", org_id: "org_halcyon", system: "Oracle Fusion", objects: "Vendors, POs, invoices, GL", status: "healthy", credential_owner: "customer", last_successful_sync_at: iso(-0.1), error_code: null, error_message: null, records_queued: 0, alerting_enabled: true },
    { id: "int_nw_netsuite", org_id: "org_northwind", system: "NetSuite", objects: "Vendors, POs, bills, payments", status: "degraded", credential_owner: "customer", last_successful_sync_at: iso(-0.2), error_code: "RECORD_ERRORS", error_message: "1 PO failed in the last 24 hours (unmapped subsidiary). Other records syncing normally.", records_queued: 1, alerting_enabled: true },
    { id: "int_fe_sap", org_id: "org_ferrous", system: "SAP S/4HANA (via Zip Cloud Connector)", objects: "Vendors, POs, invoices, payments", status: "failing", credential_owner: "zip", last_successful_sync_at: iso(-2.3), error_code: "CONNECTOR_CERT_EXPIRED",
      error_message: "The Zip-managed TLS client certificate for the SAP Cloud Connector expired. All sync jobs have failed since. No expiry alert was configured.", records_queued: 64, queued_breakdown: { purchase_orders: 23, invoices: 41 }, alerting_enabled: false },
    { id: "int_lm_workday", org_id: "org_lumen", system: "Workday Financials", objects: "Suppliers, POs, budgets", status: "failing", credential_owner: "customer", last_successful_sync_at: iso(-3), error_code: "OAUTH_TOKEN_REVOKED",
      error_message: "Workday returned invalid_grant: the OAuth refresh token was revoked, usually because the Workday API client was regenerated or the integration system user changed. A Lumen Workday admin must reconnect in Zip Admin > Integrations > Workday.", records_queued: 12, alerting_enabled: true },
  ];

  const suppliers = [
    { id: "SUP-501", org_id: "org_lumen", name: "Kestrel Data Labs (synthetic)", contact_email: "maria@kestreldatalabs-demo.com", onboarding_status: "invited", erp_vendor_id: null,
      steps: { invite: { status: "link_expired", sent_at: iso(-16), expires_after_days: 14, opened: false }, tax_form: "not_started", bank_verification: "not_started", risk_review: "not_started" },
      payments_on_hold: false, blocking_detail: "Supplier never opened the onboarding invite. Invite links expire after 14 days; this one expired 2 days ago.", known_issue_id: "KI-Z07" },
    { id: "SUP-502", org_id: "org_ferrous", name: "Arcadia Facility Services Inc. (synthetic)", contact_email: "ap@arcadiafs-demo.com", onboarding_status: "approved", erp_vendor_id: "SAP-V-200481",
      steps: { invite: { status: "completed" }, tax_form: "W-9 verified", bank_verification: "failed", risk_review: "passed" },
      bank_verification_detail: { result: "ACCOUNT_NAME_MISMATCH", bank_account_last4: "6612", bank_holder_name: "Arcadia FS LLC", legal_name_on_w9: "Arcadia Facility Services Inc.", checked_at: iso(-5) },
      payments_on_hold: true, held_invoice_total_usd: 57300, blocking_detail: "Payments are held because the bank account holder name does not match the legal name on the W-9. The supplier must update bank details or provide a bank letter in the supplier portal.", known_issue_id: "KI-Z08" },
    { id: "SUP-503", org_id: "org_ferrous", name: "Volga Industrial Supply (synthetic)", contact_email: "sales@volgaindustrial-demo.com", onboarding_status: "on_hold", erp_vendor_id: null,
      steps: { invite: { status: "completed" }, tax_form: "W-8BEN-E submitted", bank_verification: "not_started", risk_review: "sanctions_review" },
      sanctions_screening: { result: "POTENTIAL_MATCH", list: "OFAC SDN (screening provider)", match_score: 0.87, screened_at: iso(-3) },
      payments_on_hold: false, blocking_detail: "Sanctions screening returned a potential match. Onboarding is held until the customer's compliance team reviews and clears or rejects it in Zip. Zip support cannot override this.", known_issue_id: "KI-Z09" },
    { id: "SUP-504", org_id: "org_northwind", name: "Bluefin Creative (synthetic)", contact_email: "billing@bluefincreative-demo.com", onboarding_status: "approved", erp_vendor_id: "NS-V-3391",
      steps: { invite: { status: "completed" }, tax_form: "W-9 verified", bank_verification: "verified", risk_review: "passed" },
      bank_details_updated_at: iso(-200), payments_on_hold: false, blocking_detail: null, known_issue_id: null },
    { id: "SUP-505", org_id: "org_halcyon", name: "Kepler Cloud (synthetic)", contact_email: "security@keplercloud-demo.com", onboarding_status: "in_progress", erp_vendor_id: "HAL-V-7719",
      steps: { invite: { status: "completed" }, tax_form: "W-9 verified", bank_verification: "verified", risk_review: "awaiting_supplier" },
      risk_detail: "Security questionnaire (SIG Lite) sent 21 days ago; supplier has not submitted. Halcyon policy requires it for vendors handling customer data.", payments_on_hold: false, blocking_detail: "Waiting on the supplier's security questionnaire.", known_issue_id: null },
    { id: "SUP-506", org_id: "org_northwind", name: "Granite Office Supply (synthetic)", contact_email: "orders@graniteoffice-demo.com", onboarding_status: "approved", erp_vendor_id: "NS-V-1022",
      steps: { invite: { status: "completed" }, tax_form: "W-9 verified", bank_verification: "verified", risk_review: "passed" }, payments_on_hold: false, blocking_detail: null, known_issue_id: null },
    { id: "SUP-507", org_id: "org_halcyon", name: "Signal Print Co (synthetic)", contact_email: "ar@signalprint-demo.com", onboarding_status: "approved", erp_vendor_id: "HAL-V-6610",
      steps: { invite: { status: "completed" }, tax_form: "W-9 verified", bank_verification: "verified", risk_review: "passed" }, payments_on_hold: false, blocking_detail: null, known_issue_id: null },
  ];

  const invoices = [
    { id: "INV-7720", org_id: "org_northwind", supplier_id: "SUP-506", supplier_invoice_number: "GOS-44817", po_id: "PO-20890", amount: 4553.0, currency: "USD", received_at: iso(-3), status: "exception",
      match: { type: "3-way", result: "PRICE_VARIANCE", po_amount: 4200, invoice_amount: 4553, variance_pct: 8.4, tolerance_pct: 5, detail: "Unit price on 3 lines is higher than the PO (supplier applied a Q4 price increase)." },
      payment: null, known_issue_id: "KI-Z10" },
    { id: "INV-7725", org_id: "org_halcyon", supplier_id: "SUP-507", supplier_invoice_number: "SP-2219", po_id: "PO-10470", amount: 18400, currency: "USD", received_at: iso(-12), status: "exception",
      match: { type: "3-way", result: "NO_RECEIPT", detail: "No goods receipt recorded on PO-10470. The requester (Mark Oduya) must confirm receipt in Zip before the invoice can match and be paid." },
      payment: null, due_date: date(-2), known_issue_id: "KI-Z11" },
    { id: "INV-7731", org_id: "org_northwind", supplier_id: "SUP-504", supplier_invoice_number: "BC-1093", po_id: null, amount: 12750, currency: "USD", received_at: iso(-20), status: "payment_failed",
      match: { type: "2-way", result: "MATCHED" },
      payment: { method: "ACH", scheduled_for: date(-6), status: "returned", return_code: "R03", return_reason: "No account / unable to locate account", bank_account_last4: "0418", returned_at: iso(-3) }, known_issue_id: "KI-Z12" },
    { id: "INV-7702", org_id: "org_halcyon", supplier_id: "SUP-505", supplier_invoice_number: "KC-90031", po_id: "PO-10498", amount: 9800, currency: "USD", received_at: iso(-14), status: "approved", match: { type: "2-way", result: "MATCHED" }, payment: { method: "ACH", status: "scheduled", scheduled_for: date(4) }, known_issue_id: null },
    { id: "INV-7740", org_id: "org_halcyon", supplier_id: "SUP-505", supplier_invoice_number: "KC-90031", po_id: "PO-10498", amount: 9800, currency: "USD", received_at: iso(-1), status: "on_hold",
      match: { type: "duplicate_check", result: "POSSIBLE_DUPLICATE", detail: "Same supplier, same invoice number (KC-90031), and same amount as INV-7702, which is approved and scheduled for payment." }, payment: null, known_issue_id: "KI-Z13" },
  ];

  const budgets = [
    { org_id: "org_northwind", department: "Engineering", period: "FY26 Q4", owner: "marcus.hale@northwindrobotics-demo.com", currency: "USD", allocated: 1200000, committed: 945600, spent: 192000, remaining: 62400 },
    { org_id: "org_lumen", department: "R&D", period: "FY26 Q4", owner: "nora.blake@lumenbio-demo.com", currency: "USD", allocated: 850000, committed: 410000, spent: 300000, remaining: 140000 },
  ];

  const contracts = [
    { id: "CTR-881", org_id: "org_lumen", title: "Master Services Agreement", counterparty: "Kestrel Data Labs (synthetic)", owner: "owen.price@lumenbio-demo.com", status: "out_for_signature",
      esignature: { provider: "DocuSign", envelope_status: "expired", sent_at: iso(-32), expired_at: iso(-2), counterparty_signer: "maria@kestreldatalabs-demo.com", counterparty_opened: false, internal_signed: true },
      renewal: null, known_issue_id: "KI-Z14" },
    { id: "CTR-882", org_id: "org_lumen", title: "Data warehouse subscription renewal", counterparty: "Snowfield Data (synthetic)", owner: "owen.price@lumenbio-demo.com", status: "active",
      esignature: null, renewal: { auto_renews_on: date(36), notice_period_days: 30, notice_deadline: date(6), annual_value_usd: 210000, renewal_review_request: null }, known_issue_id: null },
  ];

  const scim = [
    { org_id: "org_halcyon", idp: "Okta", last_sync_at: iso(-0.1), status: "partial_failure",
      failures: [
        { email: "ana.ruiz@halcyonbank-demo.com", error_code: "REQUIRED_ATTRIBUTE_MISSING", detail: "Okta profile is missing the 'department' attribute, which Halcyon's Zip SCIM mapping marks as required. User was not created.", fix_owner: "customer IT (Okta admin)" },
        { email: "tom.becker@halcyonbank-demo.com", error_code: "NOT_ASSIGNED_TO_APP", detail: "User is not assigned to the Zip application in Okta, so Okta never pushed the user.", fix_owner: "customer IT (Okta admin)" } ] },
  ];

  const incidents = [
    { id: "zinc-2026-41", title: "Delayed NetSuite PO sync", products: ["Procure-to-Pay", "NetSuite integration"], status: "monitoring", severity: "minor", started_at: iso(-0.4), resolved_at: null,
      customer_message: "Some purchase orders are taking up to 30 minutes to appear in NetSuite. No data is lost. A fix has been deployed and we are monitoring." },
    { id: "zinc-2026-38", title: "Intake form attachments failing to upload", products: ["Intake-to-Procure"], status: "resolved", severity: "minor", started_at: iso(-5), resolved_at: iso(-4.9), customer_message: "Resolved." },
  ];

  const known_issues = [
    { id: "KI-Z01", title: "Requests stuck when an approver is deactivated with no fallback", category: "Approvals", status: "by_design", linked_cases: 74, summary: "When an approver leaves and is deactivated, in-flight steps stay assigned to them unless a delegate or fallback approver exists.", recommended_handling: "Reassign the waiting step to the right approver (often the deactivated user's manager) with the customer admin's confirmation, and recommend setting a fallback approver on the workflow." },
    { id: "KI-Z02", title: "Approvals stall when an approver is out of office with no delegate", category: "Approvals", status: "by_design", linked_cases: 52, summary: "Out-of-office status does not reassign approvals unless a delegate is set.", recommended_handling: "Reassign the step to the approver's manager or a delegate the customer names, and suggest the approver set a delegate." },
    { id: "KI-Z03", title: "PO fails to sync when an ERP value has no Zip mapping", category: "ERP Integration", status: "by_design", linked_cases: 39, summary: "New subsidiaries, departments, or currencies must be mapped to ERP values before POs using them can sync.", recommended_handling: "Add the mapping to an existing ERP value, then retry the PO sync." },
    { id: "KI-Z04", title: "ERP rejects PO because a GL account is inactive", category: "ERP Integration", status: "by_design", linked_cases: 18, summary: "The ERP blocks posting to inactive GL accounts. Zip cannot change ERP account status.", recommended_handling: "Customer finance must reactivate the GL account in the ERP or change the GL account on the request, then retry the sync." },
    { id: "KI-Z05", title: "Approval threshold rules ignore currency conversion", category: "Workflows", status: "fix_in_progress", linked_cases: 7, summary: "Amount thresholds compare the request's own currency amount to a USD threshold without converting, so non-USD requests can skip approval steps.", recommended_handling: "Escalate (P2) linking KI-Z05. Tell the customer which requests may have skipped steps, and suggest a temporary currency-specific rule. Fix in progress." },
    { id: "KI-Z06", title: "Zip-managed SAP connector certificate expired with no alert", category: "ERP Integration", status: "open", linked_cases: 3, summary: "Connector certificates managed by Zip expired without an alert, so all SAP sync jobs failed silently.", recommended_handling: "Rotate the connector certificate, confirm queued records synced, and recommend expiry alerting." },
    { id: "KI-Z07", title: "Supplier onboarding invites expire after 14 days", category: "Supplier Onboarding", status: "by_design", linked_cases: 96, summary: "Invite links expire after 14 days. Unopened invites are a top reason onboarding stalls.", recommended_handling: "Resend the invite, confirm the supplier contact email, and suggest the requester give the supplier a heads-up." },
    { id: "KI-Z08", title: "Supplier payments held for bank account name mismatch", category: "Supplier Payments", status: "by_design", linked_cases: 64, summary: "Bank verification fails when the account holder name does not match the legal name on the tax form. Payments are held to prevent fraud.", recommended_handling: "Supplier must update bank details or upload a bank letter in the supplier portal. Zip cannot override verification." },
    { id: "KI-Z09", title: "Sanctions screening potential matches hold onboarding", category: "Risk", status: "by_design", linked_cases: 11, summary: "Potential sanctions matches require the customer's compliance team to clear or reject in Zip.", recommended_handling: "Route to the customer's compliance reviewer. Zip support cannot clear a sanctions hold." },
    { id: "KI-Z10", title: "Invoice price variance above tolerance", category: "AP Automation", status: "by_design", linked_cases: 140, summary: "Invoices above the configured tolerance go to exception for AP review.", recommended_handling: "AP decides: approve the variance, request a credit memo, or amend the PO. Optionally review the tolerance setting." },
    { id: "KI-Z11", title: "Invoice can't match because goods receipt is missing", category: "AP Automation", status: "by_design", linked_cases: 188, summary: "3-way match requires the requester to confirm receipt in Zip.", recommended_handling: "Ask the requester to confirm receipt on the PO, then re-run the match." },
    { id: "KI-Z12", title: "ACH payment returned (R03 no account)", category: "Supplier Payments", status: "by_design", linked_cases: 33, summary: "The supplier's bank returned the payment because the account could not be located, usually closed or mistyped.", recommended_handling: "Supplier updates bank details in the supplier portal (re-verified), then retry the payment." },
    { id: "KI-Z13", title: "Possible duplicate invoice held", category: "AP Automation", status: "by_design", linked_cases: 27, summary: "Same supplier, invoice number, and amount triggers a duplicate hold.", recommended_handling: "AP confirms whether it is a duplicate. If so, reject it; if not, release it." },
    { id: "KI-Z14", title: "DocuSign envelopes expire after 30 days unsigned", category: "Contracts", status: "by_design", linked_cases: 29, summary: "Unsigned envelopes expire after 30 days.", recommended_handling: "Confirm the signer email, resend the envelope, and suggest a reminder cadence." },
    { id: "KI-Z15", title: "SCIM users not provisioned due to identity provider setup", category: "SSO / SCIM", status: "by_design", linked_cases: 45, summary: "Users fail to provision when required attributes are missing or they are not assigned to the Zip app in the identity provider.", recommended_handling: "Customer IT fixes the user in the identity provider, then trigger a SCIM resync." },
  ];

  return { organizations, users, requests, erp_values, erp_mappings, purchase_orders, integrations, suppliers, invoices, budgets, contracts, scim, incidents, known_issues, escalations: [] as any[] };
}

const g = globalThis as unknown as { __zipDb?: ReturnType<typeof seed> };
const db = () => (g.__zipDb ??= seed());

type Result = { ok: boolean; [k: string]: unknown };
const fail = (code: string, message: string, extra: Record<string, unknown> = {}): Result => ({ ok: false, error: { code, message }, ...extra });
const lc = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : "");
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const ki = (id: string | null | undefined) => (id ? db().known_issues.find((k) => k.id === id) ?? null : null);
const userName = (email: string) => db().users.find((u) => u.email === email)?.name ?? email;
const byId = <T extends { id: string }>(list: T[], id: unknown) => list.find((x) => x.id.toLowerCase() === lc(id));

// ---------- read tools ----------
function lookupOrganization(a: any): Result {
  const domain = lc(a.domain) || (a.email ? lc(a.email).split("@")[1] : "");
  const name = lc(a.name);
  const org = db().organizations.find((o) => (domain && o.domain === domain) || (name && o.name.toLowerCase().includes(name)) || (a.id && o.id === a.id));
  if (!org) {
    const sup = db().suppliers.find((s) => s.contact_email.split("@")[1] === domain);
    if (sup) return fail("IS_SUPPLIER", `That email belongs to a supplier (${sup.name}), not a Zip customer. Use lookup_supplier.`);
    return fail("ORG_NOT_FOUND", "No Zip customer matches that email, domain, or name.");
  }
  const days_to_renewal = Math.round((new Date(org.contract_renewal_date).getTime() - Date.now()) / DAY);
  return { ok: true, organization: { ...org, days_to_renewal } };
}
function lookupUser(a: any): Result {
  const u = db().users.find((x) => x.email === lc(a.email));
  if (!u) return fail("USER_NOT_FOUND", `No Zip user with email ${a.email}.`);
  const scimFailure = db().scim.find((s) => s.org_id === u.org_id)?.failures.find((f) => f.email === u.email) ?? null;
  return { ok: true, user: u, scim_failure: scimFailure };
}
function findRequests(a: any): Result {
  if (a.request_id) {
    const r = byId(db().requests, a.request_id);
    if (!r) return fail("REQUEST_NOT_FOUND", `No request ${a.request_id}.`);
    return { ok: true, requests: [{ ...r, approvals: r.approvals.map((s: any) => ({ ...s, approver_name: userName(s.approver), approver_status: db().users.find((u) => u.email === s.approver)?.status })), known_issue: ki(r.known_issue_id) }] };
  }
  const orgId = str(a.org_id), q = lc(a.query), requester = lc(a.requester_email), status = str(a.status);
  if (!orgId && !requester) return fail("MISSING_FILTER", "Provide request_id, org_id, or requester_email.");
  const list = db().requests.filter((r) => (!orgId || r.org_id === orgId) && (!requester || r.requester === requester) && (!status || r.status === status) &&
    (!q || `${r.title} ${r.vendor}`.toLowerCase().includes(q)));
  return { ok: true, count: list.length, requests: list.map((r) => ({ id: r.id, title: r.title, vendor: r.vendor, amount: r.amount, currency: r.currency, status: r.status, blocking_reason: r.blocking_reason, po_id: r.po_id })) };
}
function getPurchaseOrder(a: any): Result {
  if (a.po_id) {
    const po = byId(db().purchase_orders, a.po_id);
    if (!po) return fail("PO_NOT_FOUND", `No PO ${a.po_id}.`);
    return { ok: true, purchase_orders: [{ ...po, known_issue: ki(po.known_issue_id) }] };
  }
  const orgId = str(a.org_id);
  if (!orgId) return fail("MISSING_FILTER", "Provide po_id or org_id.");
  const list = db().purchase_orders.filter((p) => p.org_id === orgId && (!a.sync_status || p.erp_sync_status === a.sync_status));
  return { ok: true, count: list.length, purchase_orders: list };
}
function listIntegrations(a: any): Result {
  const list = db().integrations.filter((i) => i.org_id === str(a.org_id));
  if (!list.length) return fail("NO_INTEGRATIONS", "No ERP integrations for that org.");
  return { ok: true, integrations: list.map((i) => ({ ...i, known_issue: i.error_code === "CONNECTOR_CERT_EXPIRED" ? ki("KI-Z06") : null })) };
}
function getErpMappings(a: any): Result {
  const orgId = str(a.org_id);
  return { ok: true, mappings: db().erp_mappings.filter((m) => m.org_id === orgId), valid_erp_values: db().erp_values[orgId] ?? {} };
}
function lookupSupplier(a: any): Result {
  const q = lc(a.name), email = lc(a.email), id = lc(a.supplier_id), orgId = str(a.org_id);
  const list = db().suppliers.filter((s) => (!orgId || s.org_id === orgId) && ((id && s.id.toLowerCase() === id) || (email && (s.contact_email === email || s.contact_email.split("@")[1] === email.split("@")[1])) || (q && s.name.toLowerCase().includes(q))));
  if (!list.length) return fail("SUPPLIER_NOT_FOUND", "No supplier matches.");
  return { ok: true, suppliers: list.map((s) => ({ ...s, customer: db().organizations.find((o) => o.id === s.org_id)?.name, known_issue: ki(s.known_issue_id) })) };
}
function getInvoices(a: any): Result {
  if (a.invoice_id) {
    const inv = byId(db().invoices, a.invoice_id);
    if (!inv) return fail("INVOICE_NOT_FOUND", `No invoice ${a.invoice_id}.`);
    return { ok: true, invoices: [{ ...inv, supplier: db().suppliers.find((s) => s.id === inv.supplier_id)?.name, known_issue: ki(inv.known_issue_id) }] };
  }
  const orgId = str(a.org_id), supplierId = str(a.supplier_id), status = str(a.status);
  if (!orgId && !supplierId) return fail("MISSING_FILTER", "Provide invoice_id, org_id, or supplier_id.");
  const list = db().invoices.filter((i) => (!orgId || i.org_id === orgId) && (!supplierId || i.supplier_id === supplierId) && (!status || i.status === status));
  return { ok: true, count: list.length, invoices: list.map((i) => ({ ...i, supplier: db().suppliers.find((s) => s.id === i.supplier_id)?.name, known_issue: ki(i.known_issue_id) })) };
}
function getBudget(a: any): Result {
  const list = db().budgets.filter((b) => b.org_id === str(a.org_id) && (!a.department || b.department.toLowerCase() === lc(a.department)));
  if (!list.length) return fail("BUDGET_NOT_FOUND", "No budget found.");
  return { ok: true, budgets: list.map((b) => ({ ...b, owner_name: userName(b.owner) })) };
}
function getContracts(a: any): Result {
  const id = lc(a.contract_id), orgId = str(a.org_id), q = lc(a.query);
  const list = db().contracts.filter((c) => (id ? c.id.toLowerCase() === id : (!orgId || c.org_id === orgId) && (!q || `${c.title} ${c.counterparty}`.toLowerCase().includes(q))));
  if (!list.length) return fail("CONTRACT_NOT_FOUND", "No contract matches.");
  return { ok: true, contracts: list.map((c) => ({ ...c, known_issue: ki(c.known_issue_id) })) };
}
function getScimStatus(a: any): Result {
  const s = db().scim.find((x) => x.org_id === str(a.org_id));
  if (!s) return fail("NO_SCIM", "SCIM provisioning is not configured for this org.");
  return { ok: true, scim: s, known_issue: s.failures.length ? ki("KI-Z15") : null };
}
function getPlatformStatus(): Result {
  const active = db().incidents.filter((i) => i.status !== "resolved");
  return { ok: true, summary: active.length ? `${active.length} active incident(s).` : "All systems operational.", active_incidents: active, recently_resolved: db().incidents.filter((i) => i.status === "resolved") };
}
function searchKnownIssues(a: any): Result {
  const words = lc(a.query).split(/\s+/).filter((w) => w.length > 2);
  const list = db().known_issues.map((k) => ({ k, score: words.filter((w) => `${k.title} ${k.summary} ${k.category}`.toLowerCase().includes(w)).length }))
    .filter((x) => !words.length || x.score > 0).sort((x, y) => y.score - x.score || y.k.linked_cases - x.k.linked_cases).slice(0, 5).map((x) => x.k);
  return { ok: true, count: list.length, known_issues: list };
}

// ---------- write tools ----------
function reassignApproval(a: any): Result {
  const r = byId(db().requests, a.request_id);
  if (!r) return fail("REQUEST_NOT_FOUND", `No request ${a.request_id}.`);
  const step = r.approvals.find((s: any) => s.status === "waiting");
  if (!step) return fail("NO_WAITING_STEP", "No approval step is currently waiting.");
  const to = db().users.find((u) => u.email === lc(a.new_approver_email));
  if (!to || to.org_id !== r.org_id) return fail("INVALID_APPROVER", "New approver must be an active user in the same organization.");
  if (to.status !== "active") return fail("INVALID_APPROVER", `${to.name} is ${to.status}.`);
  const from = step.approver;
  Object.assign(step, { approver: to.email, waiting_since: now(), reassigned_from: from });
  Object.assign(r, { blocking_reason: null, blocking_detail: null });
  return { ok: true, changed: true, message: `Step ${step.step} (${step.name}) reassigned from ${userName(from)} to ${to.name}. ${to.name} has been notified. Recommend the customer admin set a fallback approver or delegate.`, request_id: r.id };
}
function nudgeApprover(a: any): Result {
  const r = byId(db().requests, a.request_id);
  if (!r) return fail("REQUEST_NOT_FOUND", `No request ${a.request_id}.`);
  const step = r.approvals.find((s: any) => s.status === "waiting");
  if (!step) return fail("NO_WAITING_STEP", "No approval step is waiting.");
  const u = db().users.find((x) => x.email === step.approver);
  if (u?.status !== "active") return fail("APPROVER_INACTIVE", `${userName(step.approver)} is ${u?.status}. A reminder will not help; reassign the step.`);
  if (u.out_of_office) return { ok: true, changed: false, warning: `Reminder sent, but ${u.name} is out of office until ${u.out_of_office.until} with no delegate. Reassigning is likely needed.` };
  return { ok: true, changed: true, message: `Reminder sent to ${u.name}.` };
}
function mapErpValue(a: any): Result {
  const orgId = str(a.org_id), field = lc(a.field), zipValue = str(a.zip_value), erpValue = str(a.erp_value);
  const valid = db().erp_values[orgId]?.[field];
  if (!valid) return fail("UNSUPPORTED_FIELD", `No mappable ERP field '${field}' for this org.`);
  if (!valid.includes(erpValue)) return fail("UNKNOWN_ERP_VALUE", `'${erpValue}' does not exist in the ERP. Valid values: ${valid.join("; ")}.`);
  const ex = db().erp_mappings.find((m) => m.org_id === orgId && m.field === field && m.zip_value === zipValue);
  if (ex) ex.erp_value = erpValue; else db().erp_mappings.push({ org_id: orgId, field, zip_value: zipValue, erp_value: erpValue });
  return { ok: true, changed: true, message: `Mapped ${field} '${zipValue}' to '${erpValue}'. Retry affected PO syncs.` };
}
function retryPoSync(a: any): Result {
  const po: any = byId(db().purchase_orders, a.po_id);
  if (!po) return fail("PO_NOT_FOUND", `No PO ${a.po_id}.`);
  if (po.erp_sync_status === "synced") return { ok: true, changed: false, message: `${po.id} is already synced as ${po.erp_po_number}.` };
  const integ = db().integrations.find((i) => i.org_id === po.org_id);
  if (integ && integ.status === "failing") return fail("INTEGRATION_DOWN", `The ${integ.system} integration is failing (${integ.error_code}). Fix the integration first.`);
  if (po.erp_error_code === "SUBSIDIARY_NOT_MAPPED" && !db().erp_mappings.some((m) => m.org_id === po.org_id && m.field === "subsidiary" && m.zip_value === po.zip_subsidiary))
    return fail("SUBSIDIARY_NOT_MAPPED", `Still unmapped: '${po.zip_subsidiary}'. Use map_erp_value first.`);
  if (po.erp_error_code === "GL_ACCOUNT_INACTIVE") return fail("GL_ACCOUNT_INACTIVE", "The ERP still rejects GL account 6150. Customer finance must reactivate it in Oracle Fusion or change the GL on the request.");
  Object.assign(po, { erp_sync_status: "synced", erp_po_number: `NS-PO-${88300 + Math.floor(Math.random() * 99)}`, erp_error_code: null, erp_error: null, last_attempt_at: now() });
  if (integ && integ.status === "degraded") Object.assign(integ, { status: "healthy", error_code: null, error_message: null, records_queued: 0 });
  return { ok: true, changed: true, message: `${po.id} synced to the ERP as ${po.erp_po_number}.` };
}
function rotateConnectorCredential(a: any): Result {
  const i: any = byId(db().integrations, a.integration_id);
  if (!i) return fail("INTEGRATION_NOT_FOUND", `No integration ${a.integration_id}.`);
  if (i.credential_owner !== "zip") return fail("CUSTOMER_OWNED_CREDENTIAL", `This credential belongs to the customer. ${i.error_message ?? "They must reconnect in Zip Admin > Integrations."}`);
  if (i.status === "healthy") return { ok: true, changed: false, message: "Integration is healthy; no rotation needed." };
  const q = i.records_queued;
  Object.assign(i, { status: "healthy", error_code: null, error_message: null, records_queued: 0, last_successful_sync_at: now() });
  return { ok: true, changed: true, message: `Connector certificate rotated. Sync resumed: ${q} queued records (23 POs, 41 invoices) delivered to SAP. Expiry alerting is still off (KI-Z06).` };
}
function resendSupplierInvite(a: any): Result {
  const s: any = byId(db().suppliers, a.supplier_id);
  if (!s) return fail("SUPPLIER_NOT_FOUND", `No supplier ${a.supplier_id}.`);
  if (s.onboarding_status !== "invited") return fail("NOT_PENDING_INVITE", `Supplier is ${s.onboarding_status}; no invite to resend.`);
  const to = lc(a.contact_email) || s.contact_email;
  Object.assign(s.steps.invite, { status: "sent", sent_at: now(), opened: false });
  s.contact_email = to; s.blocking_detail = "Invite resent; waiting for supplier to start onboarding.";
  return { ok: true, changed: true, message: `New onboarding invite sent to ${to}. It expires in 14 days.` };
}
function rerunInvoiceMatch(a: any): Result {
  const inv: any = byId(db().invoices, a.invoice_id);
  if (!inv) return fail("INVOICE_NOT_FOUND", `No invoice ${a.invoice_id}.`);
  if (inv.match.result === "NO_RECEIPT") {
    const po: any = db().purchase_orders.find((p) => p.id === inv.po_id);
    if (po?.receipt_status !== "received") return fail("STILL_NO_RECEIPT", `Match failed again: no goods receipt on ${inv.po_id}. The requester must confirm receipt in Zip first.`);
    Object.assign(inv, { status: "approved", match: { type: "3-way", result: "MATCHED" }, payment: { method: "ACH", status: "scheduled", scheduled_for: date(2) } });
    return { ok: true, changed: true, message: "Invoice matched and scheduled for payment." };
  }
  if (inv.match.result === "PRICE_VARIANCE") return fail("NEEDS_AP_DECISION", "Variance is still above tolerance. Customer AP must approve the variance, request a credit memo, or amend the PO.");
  if (inv.match.result === "POSSIBLE_DUPLICATE") return fail("NEEDS_AP_DECISION", "Possible duplicate. Customer AP must confirm and release or reject it.");
  return { ok: true, changed: false, message: `Invoice match result: ${inv.match.result}.` };
}
function confirmReceiptOnBehalf(a: any): Result {
  return fail("NOT_ALLOWED", "Zip support cannot record goods receipts on a customer's behalf; the requester or a receiving user must confirm receipt in Zip. Send them the PO link.");
}
function retryPayment(a: any): Result {
  const inv: any = byId(db().invoices, a.invoice_id);
  if (!inv) return fail("INVOICE_NOT_FOUND", `No invoice ${a.invoice_id}.`);
  if (inv.status !== "payment_failed") return fail("NOT_FAILED", `Invoice status is ${inv.status}; nothing to retry.`);
  const s: any = db().suppliers.find((x) => x.id === inv.supplier_id);
  if (new Date(s.bank_details_updated_at).getTime() < new Date(inv.payment.returned_at).getTime())
    return fail("BANK_DETAILS_NOT_UPDATED", `Retry blocked: ${s.name} has not updated bank details since the R03 return. Retrying would send to the same account (ending ${inv.payment.bank_account_last4}). Ask the supplier to update bank details in the supplier portal.`);
  Object.assign(inv, { status: "approved", payment: { method: "ACH", status: "scheduled", scheduled_for: date(1) } });
  return { ok: true, changed: true, message: "Payment rescheduled to the updated bank account." };
}
function resendContractEnvelope(a: any): Result {
  const c: any = byId(db().contracts, a.contract_id);
  if (!c?.esignature) return fail("NO_ENVELOPE", "No e-signature envelope on that contract.");
  if (c.esignature.envelope_status === "completed") return { ok: true, changed: false, message: "Already signed." };
  const signer = lc(a.signer_email) || c.esignature.counterparty_signer;
  Object.assign(c.esignature, { envelope_status: "sent", sent_at: now(), expired_at: null, counterparty_signer: signer, counterparty_opened: false });
  return { ok: true, changed: true, message: `New DocuSign envelope sent to ${signer}. Expires in 30 days. Internal signatures carried over.` };
}
function createRenewalReview(a: any): Result {
  const c: any = byId(db().contracts, a.contract_id);
  if (!c?.renewal) return fail("NO_RENEWAL", "That contract has no upcoming renewal.");
  if (c.renewal.renewal_review_request) return { ok: true, changed: false, message: `Renewal review already exists: ${c.renewal.renewal_review_request}.` };
  c.renewal.renewal_review_request = "REQ-RNW-" + c.id.slice(4);
  return { ok: true, changed: true, message: `Renewal review request ${c.renewal.renewal_review_request} created and assigned to ${userName(c.owner)}. Notice deadline: ${c.renewal.notice_deadline}.` };
}
function triggerScimResync(a: any): Result {
  const s = db().scim.find((x) => x.org_id === str(a.org_id));
  if (!s) return fail("NO_SCIM", "SCIM is not configured.");
  s.last_sync_at = now();
  if (s.failures.length) return { ok: false, changed: false, message: `Resync ran but ${s.failures.length} user(s) still failed. These must be fixed in the identity provider by customer IT.`, failures: s.failures };
  return { ok: true, changed: true, message: "SCIM resync complete. All users provisioned." };
}
function createEscalation(a: any): Result {
  const org_id = str(a.org_id), summary = str(a.summary);
  if (!org_id || !summary) return fail("MISSING_FIELDS", "org_id and summary are required.");
  const severity = ["P1", "P2", "P3"].includes(String(a.severity)) ? String(a.severity) : "P3";
  const esc = { id: `ZESC-${2200 + db().escalations.length + 1}`, org_id, area: str(a.area) || "unspecified", severity, summary, created_at: now() };
  db().escalations.push(esc);
  const sla = severity === "P1" ? "1 hour" : severity === "P2" ? "4 hours" : "1 business day";
  return { ok: true, escalation: esc, message: `Engineering escalation ${esc.id} created. Target first response: ${sla}.` };
}

// ---------- MCP registry ----------
type Tool = { name: string; title: string; description: string; inputSchema: any; annotations: Record<string, boolean>; run: (a: any) => Result };
const s = (description: string) => ({ type: "string", description });
const obj = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "object", properties, required });
const READ = { readOnlyHint: true };
const WRITE = { readOnlyHint: false, destructiveHint: false };
const ORG = s("Org id from lookup_organization, e.g. org_halcyon");

const TOOLS: Tool[] = [
  { name: "lookup_organization", title: "Look up Zip customer", description: "Find the Zip customer by email, domain, or name: modules, ERP, identity provider, seats, support plan, CSM, renewal, health. Tells you if the email belongs to a supplier instead.", inputSchema: obj({ email: s("Email"), domain: s("Domain"), name: s("Partial name") }), annotations: READ, run: lookupOrganization },
  { name: "lookup_user", title: "Look up Zip user", description: "A customer's Zip user: role, status (active, deactivated, not_provisioned), department, manager, out-of-office and delegate, and any SCIM provisioning failure.", inputSchema: obj({ email: s("User email") }, ["email"]), annotations: READ, run: lookupUser },
  { name: "find_requests", title: "Find purchase requests", description: "Get a request by id, or search by org, requester, status, or keyword. A single request includes the approval chain, approver status, why it is blocked, any routing problem, and a linked known issue.", inputSchema: obj({ request_id: s("e.g. REQ-10482"), org_id: ORG, requester_email: s("Requester email"), status: s("pending_approval, approved, blocked"), query: s("Title or vendor keyword") }), annotations: READ, run: findRequests },
  { name: "get_purchase_order", title: "Get purchase orders", description: "A PO by id, or an org's POs (filter sync_status=failed). Includes ERP sync status, ERP error, subsidiary, GL account, and receipt status.", inputSchema: obj({ po_id: s("e.g. PO-20877"), org_id: ORG, sync_status: s("synced or failed") }), annotations: READ, run: getPurchaseOrder },
  { name: "list_erp_integrations", title: "List ERP integrations", description: "ERP integrations (Oracle, NetSuite, SAP, Workday) with status, error, who owns the credential (zip or customer), and queued records.", inputSchema: obj({ org_id: ORG }, ["org_id"]), annotations: READ, run: listIntegrations },
  { name: "get_erp_mappings", title: "Get ERP value mappings", description: "Zip-to-ERP value mappings (for example subsidiaries) and the valid ERP values available.", inputSchema: obj({ org_id: ORG }, ["org_id"]), annotations: READ, run: getErpMappings },
  { name: "lookup_supplier", title: "Look up supplier", description: "Supplier onboarding and payment readiness: invite status, tax form, bank verification, risk and sanctions review, payment holds, ERP vendor id. Search by supplier_id, name, or contact email.", inputSchema: obj({ supplier_id: s("e.g. SUP-501"), name: s("Supplier name"), email: s("Supplier email"), org_id: ORG }), annotations: READ, run: lookupSupplier },
  { name: "get_invoices", title: "Get invoices", description: "An invoice by id, or by org or supplier: match result (price variance, missing receipt, duplicate), and payment status including ACH return codes.", inputSchema: obj({ invoice_id: s("e.g. INV-7731"), org_id: ORG, supplier_id: s("Supplier id"), status: s("exception, payment_failed, on_hold, approved") }), annotations: READ, run: getInvoices },
  { name: "get_budget", title: "Get budget", description: "Department budget: allocated, committed, spent, remaining, and owner.", inputSchema: obj({ org_id: ORG, department: s("e.g. Engineering") }, ["org_id"]), annotations: READ, run: getBudget },
  { name: "get_contracts", title: "Get contracts", description: "Contracts by id, org, or keyword: status, DocuSign envelope state, signer, and renewal and notice deadlines.", inputSchema: obj({ contract_id: s("e.g. CTR-881"), org_id: ORG, query: s("Title or counterparty") }), annotations: READ, run: getContracts },
  { name: "get_scim_status", title: "Get SCIM provisioning status", description: "Identity provider provisioning status and per-user failures with cause and who must fix it.", inputSchema: obj({ org_id: ORG }, ["org_id"]), annotations: READ, run: getScimStatus },
  { name: "get_platform_status", title: "Get platform status", description: "Active and recently resolved Zip incidents.", inputSchema: obj({}), annotations: READ, run: getPlatformStatus },
  { name: "search_known_issues", title: "Search known issues", description: "Known recurring issues and policies with linked case counts and recommended handling. Use to spot patterns.", inputSchema: obj({ query: s("Keywords from the ticket") }), annotations: READ, run: searchKnownIssues },
  { name: "reassign_approval", title: "Reassign approval step", description: "Reassign the waiting approval step on a request to another active user in the same org.", inputSchema: obj({ request_id: s("Request id"), new_approver_email: s("Active user email") }, ["request_id", "new_approver_email"]), annotations: WRITE, run: reassignApproval },
  { name: "nudge_approver", title: "Send approval reminder", description: "Send a reminder to the current approver. Warns if they are out of office or inactive.", inputSchema: obj({ request_id: s("Request id") }, ["request_id"]), annotations: WRITE, run: nudgeApprover },
  { name: "map_erp_value", title: "Map Zip value to ERP value", description: "Map a Zip value (e.g. subsidiary) to an existing ERP value.", inputSchema: obj({ org_id: ORG, field: s("e.g. subsidiary"), zip_value: s("Value in Zip"), erp_value: s("Exact valid ERP value") }, ["org_id", "field", "zip_value", "erp_value"]), annotations: WRITE, run: mapErpValue },
  { name: "retry_po_sync", title: "Retry PO sync", description: "Retry sending a failed PO to the ERP. Refuses with the reason if the underlying problem remains.", inputSchema: obj({ po_id: s("PO id") }, ["po_id"]), annotations: WRITE, run: retryPoSync },
  { name: "rotate_connector_credential", title: "Rotate Zip-managed connector credential", description: "Rotate an expired Zip-managed connector certificate or token and resume sync. Not for customer-owned credentials.", inputSchema: obj({ integration_id: s("Integration id") }, ["integration_id"]), annotations: WRITE, run: rotateConnectorCredential },
  { name: "resend_supplier_invite", title: "Resend supplier invite", description: "Resend an expired or unopened supplier onboarding invite, optionally to a corrected email.", inputSchema: obj({ supplier_id: s("Supplier id"), contact_email: s("Optional corrected email") }, ["supplier_id"]), annotations: WRITE, run: resendSupplierInvite },
  { name: "rerun_invoice_match", title: "Re-run invoice match", description: "Re-run matching on an invoice exception after the cause is fixed.", inputSchema: obj({ invoice_id: s("Invoice id") }, ["invoice_id"]), annotations: WRITE, run: rerunInvoiceMatch },
  { name: "record_goods_receipt", title: "Record goods receipt", description: "Attempt to record a goods receipt for a PO. Support is not allowed to do this; the tool explains who must.", inputSchema: obj({ po_id: s("PO id") }, ["po_id"]), annotations: WRITE, run: confirmReceiptOnBehalf },
  { name: "retry_payment", title: "Retry failed payment", description: "Retry a returned or failed supplier payment. Blocked until the supplier updates bank details.", inputSchema: obj({ invoice_id: s("Invoice id") }, ["invoice_id"]), annotations: WRITE, run: retryPayment },
  { name: "resend_contract_envelope", title: "Resend DocuSign envelope", description: "Send a new e-signature envelope for an expired or voided contract, optionally to a corrected signer.", inputSchema: obj({ contract_id: s("Contract id"), signer_email: s("Optional corrected signer email") }, ["contract_id"]), annotations: WRITE, run: resendContractEnvelope },
  { name: "create_renewal_review", title: "Create renewal review request", description: "Open a renewal review request for a contract approaching its notice deadline.", inputSchema: obj({ contract_id: s("Contract id") }, ["contract_id"]), annotations: WRITE, run: createRenewalReview },
  { name: "trigger_scim_resync", title: "Trigger SCIM resync", description: "Re-run identity provider provisioning. Reports users that still fail.", inputSchema: obj({ org_id: ORG }, ["org_id"]), annotations: WRITE, run: triggerScimResync },
  { name: "create_escalation", title: "Create engineering escalation", description: "File an engineering escalation with severity and summary.", inputSchema: obj({ org_id: ORG, area: s("Product area"), severity: { type: "string", enum: ["P1", "P2", "P3"] }, summary: s("What is broken, impact, what was tried, known issue") }, ["org_id", "summary"]), annotations: WRITE, run: createEscalation },
];

// ---------- JSON-RPC ----------
const SERVER = { name: "zip-mock", version: "1.0.0" };
const SUPPORTED = ["2025-06-18", "2025-03-26", "2024-11-05"];
type Rpc = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: any };
const ok = (id: Rpc["id"], result: unknown) => ({ jsonrpc: "2.0", id, result });
const err = (id: Rpc["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
function authorized(req: NextRequest) {
  const expected = process.env.MOCK_API_KEY;
  const k = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? req.nextUrl.searchParams.get("key");
  return !!expected && k === expected;
}
function handle(m: Rpc) {
  switch (m.method) {
    case "initialize": {
      const v = m.params?.protocolVersion;
      return ok(m.id, { protocolVersion: SUPPORTED.includes(v) ? v : SUPPORTED[0], capabilities: { tools: { listChanged: false } }, serverInfo: SERVER,
        instructions: "Mock Zip procurement back office with synthetic data. Identify the customer (or supplier) first, investigate with read tools, check search_known_issues for patterns, then act." });
    }
    case "ping": return ok(m.id, {});
    case "tools/list": return ok(m.id, { tools: TOOLS.map(({ run, ...t }) => t) });
    case "tools/call": {
      const t = TOOLS.find((x) => x.name === m.params?.name);
      if (!t) return err(m.id, -32602, `Unknown tool: ${m.params?.name}`);
      try {
        const r = t.run(m.params?.arguments ?? {});
        return ok(m.id, { content: [{ type: "text", text: JSON.stringify(r, null, 2) }], structuredContent: r, isError: r.ok === false });
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
  if (req.nextUrl.searchParams.get("reset")) { g.__zipDb = seed(); return NextResponse.json({ ok: true, message: "Zip mock data reset to seed." }); }
  let payload: Rpc | Rpc[];
  try { payload = await req.json(); } catch { return NextResponse.json(err(null, -32700, "Parse error"), { status: 400 }); }
  const batch = Array.isArray(payload) ? payload : [payload];
  const responses = batch.filter((m) => m.id !== undefined && m.id !== null).map(handle);
  batch.filter((m) => m.id === undefined || m.id === null).forEach(handle);
  if (!responses.length) return new NextResponse(null, { status: 202 });
  return NextResponse.json(Array.isArray(payload) ? responses : responses[0]);
}
export function GET() { return new NextResponse("Method Not Allowed", { status: 405, headers: { Allow: "POST" } }); }
export function DELETE() { return new NextResponse(null, { status: 405 }); }
