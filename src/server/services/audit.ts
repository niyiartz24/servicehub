import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type Runner = Prisma.TransactionClient | typeof db;
type Json = string | number | boolean | null;
export type Diff = Record<string, { from: Json; to: Json }>;

/** Pass the transaction client so the audit row commits or rolls back with the change. */
export async function audit(
  runner: Runner,
  e: { actorId: string | null; action: string; entity: string; entityId: string; metadata?: Prisma.InputJsonObject },
) {
  await runner.auditLog.create({ data: e });
}

const norm = (v: unknown): Json => (v instanceof Date ? v.toISOString() : ((v ?? null) as Json));

export function diffFields<T extends object>(before: T, after: Partial<T>): Diff {
  const out: Diff = {};
  for (const k of Object.keys(after) as (keyof T)[]) {
    const a = norm(before[k]);
    const b = norm(after[k]);
    if (a !== b) out[String(k)] = { from: a, to: b };
  }
  return out;
}
