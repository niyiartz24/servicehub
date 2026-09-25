import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { UserError } from "@/server/errors";
import type { ServiceUpdateInput } from "@/server/validation";
import { audit, diffFields } from "./audit";

export function listServicesAdmin(opts: { q?: string; serviceTypeId?: string } = {}) {
  const q = opts.q?.trim();
  const where: Prisma.ServiceWhereInput = {
    ...(opts.serviceTypeId ? { serviceTypeId: opts.serviceTypeId } : {}),
    ...(q ? { OR: [
      { name: { contains: q, mode: "insensitive" } },
      { project: { name: { contains: q, mode: "insensitive" } } },
      { project: { client: { name: { contains: q, mode: "insensitive" } } } },
    ] } : {}),
  };
  return db.service.findMany({
    where,
    include: {
      serviceType: true,
      project: { select: { id: true, name: true, client: { select: { id: true, name: true } } } },
      subscriptions: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, status: true, price: true, billingCycle: true, nextBillingDate: true } },
    },
    orderBy: [{ project: { client: { name: "asc" } } }, { project: { name: "asc" } }],
    take: 300,
  });
}

export const getServiceAdmin = (id: string) =>
  db.service.findUnique({
    where: { id },
    include: {
      serviceType: true,
      project: { select: { id: true, name: true, client: { select: { id: true, name: true } } } },
      subscriptions: { orderBy: { createdAt: "desc" }, include: { plan: true } },
    },
  });

/** Fields owned by the Service record itself: name, provider, usage, notes. Pricing lives on Subscription. */
export async function updateServiceDetails(actorId: string, input: ServiceUpdateInput) {
  const { id, usageUsed, usageLimit, usageUnit, ...rest } = input;
  const data = {
    name: rest.name,
    provider: rest.provider ?? null,
    usageUsed: usageUsed ?? null,
    usageLimit: usageLimit ?? null,
    usageUnit: usageUnit ?? null,
    notes: rest.notes ?? null,
  };
  await db.$transaction(async (tx) => {
    const cur = await tx.service.findUnique({ where: { id } });
    if (!cur) throw new UserError("Service not found.");
    const changes = diffFields(
      { name: cur.name, provider: cur.provider, usageUsed: cur.usageUsed ? Number(cur.usageUsed) : null, usageLimit: cur.usageLimit ? Number(cur.usageLimit) : null, usageUnit: cur.usageUnit, notes: cur.notes },
      data,
    );
    if (Object.keys(changes).length === 0) return;
    await tx.service.update({ where: { id }, data });
    await audit(tx, { actorId, action: "service.updated", entity: "Service", entityId: id, metadata: { changes } });
  });
}

/**
 * Only safe to delete a service with no subscription history; otherwise it must stay for the record
 * (invoices and audit entries reference it). Mirrors the plan delete/archive pattern: never throws,
 * so it's safe to call from a plain <form action> with no error UI.
 */
export async function deleteUnusedService(actorId: string, id: string): Promise<"deleted" | "kept"> {
  return db.$transaction(async (tx) => {
    const used = await tx.subscription.count({ where: { serviceId: id } });
    if (used > 0) return "kept";
    const svc = await tx.service.delete({ where: { id } });
    await audit(tx, { actorId, action: "service.deleted", entity: "Service", entityId: id, metadata: { name: svc.name } });
    return "deleted";
  });
}