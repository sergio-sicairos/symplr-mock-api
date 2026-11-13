import { buildSeed, type DB } from "./seed";

// In-memory store. Survives hot reloads in dev; on Vercel it lives per warm instance
// and resets on cold start, which is fine for demos (POST /api/admin/reset forces a reset).
const g = globalThis as unknown as { __symplrDb?: DB };
export function db(): DB {
  if (!g.__symplrDb) g.__symplrDb = buildSeed();
  return g.__symplrDb;
}
export function resetDb(): DB {
  g.__symplrDb = buildSeed();
  return g.__symplrDb;
}
