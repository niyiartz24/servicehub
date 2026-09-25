import "server-only";
import { db } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserError } from "@/server/errors";
import type { ClientInput, ClientUpdateInput } from "@/server/validation";
import { audit, diffFields } from "./audit";

export async function listClients(q?: string) {
  return db.client.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {},
    include: { _count: { select: { projects: true, subscriptions: { where: { status: { in: ["ACTIVE", "EXPIRING"] } } } } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getClientDetail(id: string) {
  return db.client.findUnique({
    where: { id },
    include: {
      users: { select: { id: true, email: true, isActive: true, role: true } },
      projects: { orderBy: { createdAt: "asc" } },
      subscriptions: { include: { plan: true, service: { include: { serviceType: true, project: true } } }, orderBy: { nextBillingDate: "asc" } },
      invoices: { orderBy: { createdAt: "desc" }, take: 10 },
      payments: { orderBy: { createdAt: "desc" }, take: 10, include: { invoice: { select: { number: true } } } },
      tickets: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
}

export async function createClientAccount(actorId: string, input: ClientInput) {
  const { sendInvite, ...data } = input;
  let authUserId: string | undefined;

  if (sendInvite) {
    const { data: res, error } = await createAdminClient().auth.admin.inviteUserByEmail(input.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
    });
    if (error || !res.user) throw new UserError(`Could not invite ${input.email}: ${error?.message ?? "unknown error"}`);
    authUserId = res.user.id;
  }

  try {
    return await db.$transaction(async (tx) => {
      const client = await tx.client.create({ data });
      if (authUserId) {
        await tx.user.create({
          data: { id: authUserId, email: input.email, fullName: input.contactName ?? input.name, role: "CLIENT", clientId: client.id },
        });
      }
      await audit(tx, { actorId, action: "client.created", entity: "Client", entityId: client.id, metadata: { name: client.name, invited: Boolean(authUserId) } });
      return client;
    });
  } catch (e) {
    // Compensate: don't leave an orphaned auth user behind.
    if (authUserId) await createAdminClient().auth.admin.deleteUser(authUserId).catch(() => undefined);
    throw e;
  }
}

export async function updateClientAccount(actorId: string, input: ClientUpdateInput) {
  const { id, ...rest } = input;
  // Blank optional fields must clear the column (undefined would mean "leave unchanged").
  const data = {
    name: rest.name, email: rest.email,
    contactName: rest.contactName ?? null, phone: rest.phone ?? null,
    address: rest.address ?? null, notes: rest.notes ?? null,
  };
  await db.$transaction(async (tx) => {
    const cur = await tx.client.findUnique({ where: { id } });
    if (!cur) throw new UserError("Client not found.");
    const changes = diffFields(cur, data);
    if (Object.keys(changes).length === 0) return;
    await tx.client.update({ where: { id }, data });
    await audit(tx, { actorId, action: "client.updated", entity: "Client", entityId: id, metadata: { changes } });
  });
}

/** Deactivating a client also blocks their logins (getSessionUser checks User.isActive). */
export async function setClientActive(actorId: string, id: string, isActive: boolean) {
  await db.$transaction(async (tx) => {
    await tx.client.update({ where: { id }, data: { isActive } });
    await tx.user.updateMany({ where: { clientId: id, role: "CLIENT" }, data: { isActive } });
    await audit(tx, { actorId, action: isActive ? "client.activated" : "client.deactivated", entity: "Client", entityId: id });
  });
}
