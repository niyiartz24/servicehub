import "server-only";
import { db } from "@/lib/db";
import { UserError } from "@/server/errors";
import type { PlanInput, PlanUpdateInput } from "@/server/validation";
import { audit, diffFields } from "./audit";

export const listServiceTypes = () => db.serviceType.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });

export const listPlans = (opts: { includeArchived?: boolean } = {}) =>
  db.servicePlan.findMany({
    where: opts.includeArchived ? {} : { archivedAt: null },
    include: { serviceType: true, _count: { select: { subscriptions: true } } },
    orderBy: [{ serviceType: { sortOrder: "asc" } }, { defaultPrice: "asc" }],
  });

function specsOf(i: { storageGb?: number; bandwidthGb?: number }) {
  const s: Record<string, number> = {};
  if (i.storageGb) s.storageGb = i.storageGb;
  if (i.bandwidthGb) s.bandwidthGb = i.bandwidthGb;
  return s;
}

export async function createPlan(actorId: string, input: PlanInput) {
  const { storageGb, bandwidthGb, ...data } = input;
  return db.$transaction(async (tx) => {
    const p = await tx.servicePlan.create({ data: { ...data, specs: specsOf({ storageGb, bandwidthGb }) } });
    await audit(tx, { actorId, action: "plan.created", entity: "ServicePlan", entityId: p.id, metadata: { name: p.name, defaultPrice: p.defaultPrice } });
    return p;
  });
}

/** Changing a default price does NOT touch existing subscriptions: they keep their own price. */
export async function updatePlan(actorId: string, input: PlanUpdateInput) {
  const { id, storageGb, bandwidthGb, ...rest } = input;
  const data = { name: rest.name, defaultPrice: rest.defaultPrice, description: rest.description ?? null };
  await db.$transaction(async (tx) => {
    const cur = await tx.servicePlan.findUnique({ where: { id } });
    if (!cur) throw new UserError("Plan not found.");
    const changes = diffFields(cur, data);
    await tx.servicePlan.update({ where: { id }, data: { ...data, specs: specsOf({ storageGb, bandwidthGb }) } });
    await audit(tx, {
      actorId, action: changes.defaultPrice ? "plan.price_changed" : "plan.updated",
      entity: "ServicePlan", entityId: id, metadata: { changes },
    });
  });
}

export async function setPlanActive(actorId: string, id: string, isActive: boolean) {
  await db.$transaction(async (tx) => {
    await tx.servicePlan.update({ where: { id }, data: { isActive } });
    await audit(tx, { actorId, action: isActive ? "plan.activated" : "plan.deactivated", entity: "ServicePlan", entityId: id });
  });
}

/** Hard-delete only if never used; otherwise archive so history stays intact. */
export async function removePlan(actorId: string, id: string): Promise<"deleted" | "archived"> {
  return db.$transaction(async (tx) => {
    const used = await tx.subscription.count({ where: { planId: id } });
    if (used === 0) {
      await tx.servicePlan.delete({ where: { id } });
      await audit(tx, { actorId, action: "plan.deleted", entity: "ServicePlan", entityId: id });
      return "deleted";
    }
    await tx.servicePlan.update({ where: { id }, data: { isActive: false, archivedAt: new Date() } });
    await audit(tx, { actorId, action: "plan.archived", entity: "ServicePlan", entityId: id, metadata: { subscriptions: used } });
    return "archived";
  });
}
