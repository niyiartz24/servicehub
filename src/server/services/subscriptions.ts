import "server-only";
import { db } from "@/lib/db";
import { addCycle } from "@/lib/billing-dates";
import { UserError } from "@/server/errors";
import type { AssignInput, SubscriptionUpdateInput } from "@/server/validation";
import { audit, diffFields } from "./audit";

const include = {
  client: { select: { id: true, name: true } },
  plan: true,
  service: { include: { serviceType: true, project: { select: { id: true, name: true } } } },
} as const;

export const listSubscriptions = () => db.subscription.findMany({ include, orderBy: [{ nextBillingDate: "asc" }], take: 300 });
export const getSubscription = (id: string) => db.subscription.findUnique({ where: { id }, include });

/**
 * CLIENT → PROJECT → SERVICE → SUBSCRIPTION.
 * clientId is derived from the project, never accepted from the form.
 * Price = explicit custom price, else the plan default; both are recorded.
 */
export async function assignService(actorId: string, input: AssignInput) {
  return db.$transaction(async (tx) => {
    const project = await tx.project.findUnique({ where: { id: input.projectId }, include: { client: { select: { isActive: true } } } });
    if (!project) throw new UserError("Project not found.");
    if (!project.client.isActive) throw new UserError("This client is deactivated.");

    const plan = await tx.servicePlan.findUnique({ where: { id: input.planId } });
    if (!plan || !plan.isActive) throw new UserError("Choose an active plan.");

    const billingCycle = input.billingCycle ?? plan.billingCycle;
    const nextBillingDate = input.nextBillingDate ?? addCycle(input.startDate, billingCycle);
    if (billingCycle === "CUSTOM" && !nextBillingDate) throw new UserError("Custom billing cycles need a next billing date.");
    const price = input.price ?? plan.defaultPrice;

    const service = await tx.service.create({
      data: { projectId: project.id, serviceTypeId: plan.serviceTypeId, name: input.serviceName },
    });
    const sub = await tx.subscription.create({
      data: {
        clientId: project.clientId, serviceId: service.id, planId: plan.id,
        price, defaultPriceAtSet: plan.defaultPrice, isCustomPrice: price !== plan.defaultPrice,
        billingCycle, status: input.status, autoRenew: input.autoRenew,
        startDate: input.startDate, nextBillingDate, notes: input.notes,
      },
    });
    await audit(tx, { actorId, action: "service.created", entity: "Service", entityId: service.id, metadata: { projectId: project.id, name: service.name } });
    await audit(tx, {
      actorId, action: "subscription.created", entity: "Subscription", entityId: sub.id,
      metadata: { clientId: project.clientId, planId: plan.id, price, defaultPrice: plan.defaultPrice, billingCycle },
    });
    return sub;
  });
}

export async function updateSubscription(actorId: string, input: SubscriptionUpdateInput) {
  await db.$transaction(async (tx) => {
    const cur = await tx.subscription.findUnique({ where: { id: input.id }, include: { service: true } });
    if (!cur) throw new UserError("Subscription not found.");

    const plan = await tx.servicePlan.findUnique({ where: { id: input.planId } });
    if (!plan) throw new UserError("Plan not found.");
    if (plan.serviceTypeId !== cur.service.serviceTypeId) throw new UserError("That plan belongs to a different service type.");
    if (!plan.isActive && plan.id !== cur.planId) throw new UserError("Choose an active plan.");

    const next = {
      planId: plan.id, price: input.price, defaultPriceAtSet: plan.defaultPrice,
      isCustomPrice: input.price !== plan.defaultPrice, billingCycle: input.billingCycle,
      nextBillingDate: input.nextBillingDate ?? null, status: input.status,
      autoRenew: input.autoRenew, notes: input.notes ?? null,
    };
    const changes = diffFields(cur, next);
    if (Object.keys(changes).length === 0) return;

    await tx.subscription.update({ where: { id: cur.id }, data: next });
    await audit(tx, { actorId, action: "subscription.updated", entity: "Subscription", entityId: cur.id, metadata: { changes } });
    if (changes.price) {
      await audit(tx, {
        actorId, action: "subscription.price_changed", entity: "Subscription", entityId: cur.id,
        metadata: { from: cur.price, to: input.price, planDefault: plan.defaultPrice },
      });
    }
  });
}
