import { withAuth, json, error, body } from "@/lib/http";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
// POST /api/escalations  { org_id, product, severity: "P1"|"P2"|"P3", summary }
// GET  /api/escalations  (list, to see what the agent filed)
export const POST = withAuth(async (req) => {
  const b = await body(req);
  const org_id = String(b.org_id ?? ""), summary = String(b.summary ?? "");
  if (!org_id || !summary) return error(400, "MISSING_FIELDS", "org_id and summary are required.");
  const severity = ["P1", "P2", "P3"].includes(String(b.severity)) ? String(b.severity) : "P3";
  const esc = { id: `ESC-${4100 + db().escalations.length + 1}`, org_id, product: String(b.product ?? "unspecified"), severity, summary, created_at: new Date().toISOString(), status: "open" as const };
  db().escalations.push(esc);
  const sla = severity === "P1" ? "1 hour" : severity === "P2" ? "4 hours" : "1 business day";
  return json({ ok: true, escalation: esc, message: `Engineering escalation ${esc.id} created. Target first response: ${sla}.` }, 201);
});
export const GET = withAuth(() => json({ ok: true, escalations: db().escalations }));
