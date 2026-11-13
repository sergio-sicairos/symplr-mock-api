import { withAuth, json, q } from "@/lib/http";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
// GET /api/status?product=symplr%20Workforce
export const GET = withAuth((req) => {
  const product = q(req, "product")?.toLowerCase();
  let incidents = db().incidents;
  if (product) incidents = incidents.filter((i) => i.products.some((p) => p.toLowerCase().includes(product.replace(/^symplr\s*/, ""))));
  const active = incidents.filter((i) => i.status !== "resolved");
  return json({
    ok: true,
    summary: active.length ? `${active.length} active incident(s).` : "All systems operational.",
    active_incidents: active,
    recently_resolved: incidents.filter((i) => i.status === "resolved"),
  });
});
