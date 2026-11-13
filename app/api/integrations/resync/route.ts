import { withAuth, json, error, body } from "@/lib/http";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
// POST /api/integrations/resync  { "integration_id": "..." }
export const POST = withAuth(async (req) => {
  const id = String((await body(req)).integration_id ?? "");
  const integ = db().integrations.find((i) => i.id === id);
  if (!integ) return error(404, "INTEGRATION_NOT_FOUND", `No integration ${id}.`);
  if (integ.status === "healthy") return json({ ok: true, changed: false, message: "Integration is healthy. No resync needed.", integration: integ });
  if (integ.error_code === "AUTH_TOKEN_EXPIRED") {
    return json({ ok: false, changed: false, requires_customer_action: true,
      message: "Resync failed: credentials are expired. The customer must re-authorize. A resync from symplr cannot fix this.", integration: integ }, 409);
  }
  const cleared = integ.records_pending;
  Object.assign(integ, { status: "healthy", error_code: null, error_message: null, records_pending: 0, last_successful_sync_at: new Date().toISOString() });
  return json({ ok: true, changed: true, message: `Resync succeeded. ${cleared} queued record(s) delivered.`, integration: integ });
});
