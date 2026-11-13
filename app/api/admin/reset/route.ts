import { withAuth, json } from "@/lib/http";
import { resetDb } from "@/lib/db";
export const dynamic = "force-dynamic";
// POST /api/admin/reset  -> restores seed data (run before each demo)
export const POST = withAuth(() => { resetDb(); return json({ ok: true, message: "Mock data reset to seed." }); });
