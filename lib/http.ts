import { NextRequest, NextResponse } from "next/server";


export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
export function error(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

// Accepts the key as "x-api-key: <key>" or "Authorization: Bearer <key>".
export function authorized(req: NextRequest): boolean {
  const expected = process.env.MOCK_API_KEY;
  if (!expected) return false;
  const header = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === expected;
}

type Handler = (req: NextRequest) => Promise<Response> | Response;
export function withAuth(handler: Handler): Handler {
  return async (req) => {
    if (!process.env.MOCK_API_KEY) return error(500, "NOT_CONFIGURED", "Set MOCK_API_KEY in the environment.");
    if (!authorized(req)) return error(401, "UNAUTHORIZED", "Missing or invalid API key.");
    try {
      return await handler(req);
    } catch (e) {
      return error(500, "INTERNAL", e instanceof Error ? e.message : "Unknown error");
    }
  };
}

export async function body(req: NextRequest): Promise<Record<string, unknown>> {
  try { return (await req.json()) as Record<string, unknown>; } catch { return {}; }
}
export const q = (req: NextRequest, key: string) => req.nextUrl.searchParams.get(key)?.trim() || null;
export const orgFromEmail = (email: string) => email.split("@")[1]?.toLowerCase();
