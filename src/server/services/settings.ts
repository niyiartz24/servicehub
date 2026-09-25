import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "./audit";

export type BankDetails = { bankName: string; accountName: string; accountNumber: string };
export type TaxSettings = { enabled: boolean; ratePercent: number };

export async function getSetting<T>(key: string): Promise<T | null> {
  const s = await db.setting.findUnique({ where: { key } });
  return (s?.value as T | undefined) ?? null;
}

export async function saveSetting(actorId: string, key: string, value: Prisma.InputJsonObject) {
  const before = await db.setting.findUnique({ where: { key } });
  await db.$transaction(async (tx) => {
    await tx.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
    await audit(tx, { actorId, action: "settings.updated", entity: "Setting", entityId: key, metadata: { from: (before?.value ?? null) as Prisma.InputJsonValue | null, to: value } });
  });
}

export const getBankDetails = () => getSetting<BankDetails>("bank");
