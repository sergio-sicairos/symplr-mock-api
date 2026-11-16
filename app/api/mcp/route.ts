import { NextRequest, NextResponse } from "next/server";
import * as A from "@/lib/actions";

export const dynamic = "force-dynamic";

// Minimal stateless MCP server (Streamable HTTP transport, JSON responses).
// Auth: x-api-key header, Authorization: Bearer <key>, or ?key=<key> in the URL.

const SERVER = { name: "symplr-mock", version: "1.0.0" };
const SUPPORTED = ["2025-06-18", "2025-03-26", "2024-11-05"];

type Tool = {
  name: string; title: string; description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean; destructiveHint?: boolean; idempotentHint?: boolean };
  run: (args: any) => Record<string, unknown>;
};
const s = (description: string) => ({ type: "string", description });
const obj = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "object", properties, required });
const READ = { readOnlyHint: true };
const WRITE = { readOnlyHint: false, destructiveHint: false };

const TOOLS: Tool[] = [
  { name: "lookup_organization", title: "Look up customer organization",
    description: "Find the symplr customer (health system) by a requester's email, a domain, or a name. Returns licensed products, seat usage, support plan, CSM, renewal date, and health score. Good first step on any ticket.",
    inputSchema: obj({ email: s("Requester email; the domain is used to find the org"), domain: s("e.g. riverbendhealth.org"), name: s("Partial org name") }),
    annotations: READ, run: A.lookupOrganization },
  { name: "lookup_user", title: "Look up symplr user",
    description: "Look up a symplr user by email. Returns status (active, locked, deactivated, pending_invite), whether SSO is enabled, failed login attempts, and their organization. Use for login, lockout, or access issues.",
    inputSchema: obj({ email: s("The email the user signs in with") }, ["email"]),
    annotations: READ, run: A.lookupUser },
  { name: "unlock_user", title: "Unlock user account",
    description: "Unlock a locked symplr user. Only use after lookup_user shows status 'locked' and sso_enabled false, and after a teammate has approved. Fails for SSO-managed or deactivated accounts.",
    inputSchema: obj({ email: s("The email of the locked user") }, ["email"]),
    annotations: { ...WRITE, idempotentHint: true }, run: A.unlockUser },
  { name: "send_password_reset", title: "Send password reset",
    description: "Email a password reset link to a symplr user. Not available for SSO users.",
    inputSchema: obj({ email: s("The user's email") }, ["email"]),
    annotations: WRITE, run: A.sendPasswordReset },
  { name: "list_integrations", title: "List integrations",
    description: "List an organization's integrations (Epic, Workday, UKG, Lawson, badge systems) with status, last successful sync, error code, and pending records.",
    inputSchema: obj({ org_id: s("Organization id, e.g. org_mesavalley"), status: { type: "string", enum: ["healthy", "degraded", "failing", "disabled"], description: "Optional filter" } }, ["org_id"]),
    annotations: READ, run: A.listIntegrations },
  { name: "resync_integration", title: "Resync integration",
    description: "Retry a degraded or failing integration. If credentials are expired it returns requires_customer_action; explain re-authorization steps instead of retrying.",
    inputSchema: obj({ integration_id: s("Integration id from list_integrations, e.g. int_nf_epic") }, ["integration_id"]),
    annotations: WRITE, run: A.resyncIntegration },
  { name: "search_providers", title: "Search provider credentialing files",
    description: "Find a provider's credentialing file by name or NPI. Returns application status, blocking items, committee date, and credentials with verification status.",
    inputSchema: obj({ org_id: s("Optional organization id to narrow the search"), name: s("Provider name, e.g. Vasquez"), npi: s("10-digit NPI") }),
    annotations: READ, run: A.searchProviders },
  { name: "list_expiring_credentials", title: "List expiring credentials",
    description: "List provider credentials (licenses, DEA, board certs, insurance) expiring within N days for an organization, including already-expired items.",
    inputSchema: obj({ org_id: s("Organization id"), days: { type: "integer", description: "Window in days (default 60, max 365)" } }, ["org_id"]),
    annotations: READ, run: A.listExpiringCredentials },
  { name: "lookup_vendor_rep", title: "Look up vendor rep (symplr Access)",
    description: "Look up a vendor rep's badge status and missing requirements by email. Use when a rep can't check in or print a badge at a facility.",
    inputSchema: obj({ email: s("Vendor rep email") }, ["email"]),
    annotations: READ, run: A.lookupVendorRep },
  { name: "get_platform_status", title: "Get platform status",
    description: "Check active and recently resolved symplr incidents, optionally for one product. Use when a customer reports slowness or an outage.",
    inputSchema: obj({ product: s("Optional product, e.g. symplr Workforce") }),
    annotations: READ, run: A.getPlatformStatus },
  { name: "create_escalation", title: "Create engineering escalation",
    description: "File an engineering escalation when the issue can't be resolved with other tools. Returns an escalation id and response SLA.",
    inputSchema: obj({ org_id: s("Organization id"), product: s("Affected product"), severity: { type: "string", enum: ["P1", "P2", "P3"] }, summary: s("What is broken, impact, and what was tried") }, ["org_id", "summary"]),
    annotations: WRITE, run: A.createEscalation },
];

function authorized(req: NextRequest) {
  const expected = process.env.MOCK_API_KEY;
  if (!expected) return false;
  const k = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? req.nextUrl.searchParams.get("key");
  return k === expected;
}

type RpcReq = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: any };
const ok = (id: RpcReq["id"], result: unknown) => ({ jsonrpc: "2.0", id, result });
const err = (id: RpcReq["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

function handle(m: RpcReq) {
  switch (m.method) {
    case "initialize": {
      const v = m.params?.protocolVersion;
      return ok(m.id, {
        protocolVersion: SUPPORTED.includes(v) ? v : SUPPORTED[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER,
        instructions: "Mock symplr back office with synthetic data. Look up the user or organization first, then act. Get teammate approval before any write tool.",
      });
    }
    case "ping": return ok(m.id, {});
    case "tools/list":
      return ok(m.id, { tools: TOOLS.map(({ run, ...t }) => t) });
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
  // Notifications (no id) get no response body.
  const responses = batch.filter((m) => m.id !== undefined && m.id !== null).map(handle);
  batch.filter((m) => m.id === undefined || m.id === null).forEach(handle);
  if (!responses.length) return new NextResponse(null, { status: 202 });
  return NextResponse.json(Array.isArray(payload) ? responses : responses[0]);
}

// This server doesn't push messages over SSE.
export function GET() { return new NextResponse("Method Not Allowed", { status: 405, headers: { Allow: "POST" } }); }
export function DELETE() { return new NextResponse(null, { status: 405 }); }
