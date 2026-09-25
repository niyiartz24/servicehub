import "server-only";
import type { Prisma } from "@prisma/client";

/** Race-free sequence: one atomic UPSERT, so two concurrent requests can never get the same number. */
export async function nextNumber(tx: Prisma.TransactionClient, name: "invoice" | "payment" | "ticket", prefix: string): Promise<string> {
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO "Counter" ("name", "value") VALUES (${name}, 1)
    ON CONFLICT ("name") DO UPDATE SET "value" = "Counter"."value" + 1
    RETURNING "value"`;
  const n = rows[0]?.value;
  if (!n) throw new Error(`Could not allocate ${name} number`);
  return `${prefix}-${String(n).padStart(5, "0")}`;
}
