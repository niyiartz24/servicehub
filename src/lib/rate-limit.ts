import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { UserError } from "@/server/errors";

/** Atomic fixed-window counter in one SQL statement. Two racing requests cannot both slip under the limit. */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<{ ok: boolean; retryAfterSec: number }> {
  const rows = await db.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, now() + make_interval(secs => ${windowSec}::double precision))
    ON CONFLICT ("key") DO UPDATE SET
      "count"   = CASE WHEN "RateLimit"."resetAt" < now() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" < now() THEN EXCLUDED."resetAt" ELSE "RateLimit"."resetAt" END
    RETURNING "count", "resetAt"`;
  const row = rows[0];
  if (!row) return { ok: true, retryAfterSec: 0 }; // fail open: a limiter fault must not lock everyone out
  return { ok: row.count <= limit, retryAfterSec: Math.max(1, Math.ceil((row.resetAt.getTime() - Date.now()) / 1000)) };
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** For server actions: throws a friendly UserError when the caller is over the limit. */
export async function enforce(key: string, limit: number, windowSec: number) {
  const r = await rateLimit(key, limit, windowSec);
  if (!r.ok) throw new UserError(`Too many attempts. Please try again in ${Math.ceil(r.retryAfterSec / 60)} minute(s).`);
}
