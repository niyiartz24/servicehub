import "server-only";
import type { Prisma, TicketStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { brand } from "@/config/brand";
import { UserError } from "@/server/errors";
import type { z } from "zod";
import type { adminTicketSchema, ticketSchema } from "@/server/validation";
import { audit } from "./audit";
import { nextNumber } from "./numbering";
import { notifyAdmins, notifyClient } from "./notifications";

type TicketInput = z.output<typeof ticketSchema>;
type AdminReply = z.output<typeof adminTicketSchema>;

// ───────── Client ─────────
export const listClientTickets = (clientId: string) =>
  db.supportTicket.findMany({
    where: { clientId },
    select: { id: true, number: true, subject: true, category: true, priority: true, status: true, updatedAt: true },
    orderBy: { updatedAt: "desc" }, take: 100,
  });

/** Internal notes (isInternal) are filtered out here, at the query, not in the UI. */
export const getClientTicket = (clientId: string, id: string) =>
  db.supportTicket.findFirst({
    where: { id, clientId },
    select: {
      id: true, number: true, subject: true, description: true, category: true, priority: true, status: true, createdAt: true,
      service: { select: { name: true } },
      messages: { where: { isInternal: false }, orderBy: { createdAt: "asc" }, select: { id: true, body: true, createdAt: true, author: { select: { role: true, fullName: true } } } },
    },
  });

export async function createTicket(user: { id: string; clientId: string }, input: TicketInput) {
  let projectId: string | undefined;
  if (input.serviceId) {
    const svc = await db.service.findFirst({ where: { id: input.serviceId, project: { clientId: user.clientId } }, select: { projectId: true } });
    if (!svc) throw new UserError("Service not found.");
    projectId = svc.projectId;
  }
  return db.$transaction(async (tx) => {
    const number = await nextNumber(tx, "ticket", brand.ticketPrefix);
    const t = await tx.supportTicket.create({
      data: { number, clientId: user.clientId, projectId, serviceId: input.serviceId, subject: input.subject, description: input.description, category: input.category, priority: input.priority },
    });
    await audit(tx, { actorId: user.id, action: "ticket.created", entity: "SupportTicket", entityId: t.id, metadata: { category: t.category, priority: t.priority } });
    await notifyAdmins(tx, { type: "TICKET_UPDATE", title: `New support request ${t.number}`, body: t.subject, link: `/admin/support/${t.id}` });
    return t;
  });
}

export async function replyAsClient(user: { id: string; clientId: string }, ticketId: string, body: string) {
  await db.$transaction(async (tx) => {
    const t = await tx.supportTicket.findFirst({ where: { id: ticketId, clientId: user.clientId } });
    if (!t) throw new UserError("Ticket not found.");
    if (t.status === "CLOSED") throw new UserError("This request is closed. Please open a new one.");
    await tx.ticketMessage.create({ data: { ticketId, authorId: user.id, body } });
    // A client reply always puts the ball back in SynthaxLab's court.
    await tx.supportTicket.update({ where: { id: ticketId }, data: { status: "OPEN" } });
    await notifyAdmins(tx, { type: "TICKET_UPDATE", title: `Reply on ${t.number}`, body: t.subject, link: `/admin/support/${t.id}` });
  });
}

// ───────── Admin ─────────
export function listTicketsAdmin(opts: { status?: TicketStatus; q?: string }) {
  const q = opts.q?.trim();
  const where: Prisma.SupportTicketWhereInput = {
    ...(opts.status ? { status: opts.status } : {}),
    ...(q ? { OR: [{ number: { contains: q, mode: "insensitive" } }, { subject: { contains: q, mode: "insensitive" } }, { client: { name: { contains: q, mode: "insensitive" } } }] } : {}),
  };
  return db.supportTicket.findMany({ where, include: { client: { select: { id: true, name: true } } }, orderBy: { updatedAt: "desc" }, take: 200 });
}

export const getTicketAdmin = (id: string) =>
  db.supportTicket.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } }, project: { select: { name: true } }, service: { select: { name: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { role: true, fullName: true, email: true } } } },
    },
  });

export async function adminUpdateTicket(actorId: string, input: AdminReply) {
  await db.$transaction(async (tx) => {
    const t = await tx.supportTicket.findUnique({ where: { id: input.ticketId } });
    if (!t) throw new UserError("Ticket not found.");
    if (input.body) await tx.ticketMessage.create({ data: { ticketId: t.id, authorId: actorId, body: input.body, isInternal: input.isInternal } });
    if (input.status !== t.status) await tx.supportTicket.update({ where: { id: t.id }, data: { status: input.status } });
    else await tx.supportTicket.update({ where: { id: t.id }, data: { updatedAt: new Date() } });
    await audit(tx, { actorId, action: "ticket.updated", entity: "SupportTicket", entityId: t.id, metadata: { statusFrom: t.status, statusTo: input.status, replied: Boolean(input.body), internal: Boolean(input.body) && input.isInternal } });
    const visible = Boolean(input.body) && !input.isInternal;
    if (visible || input.status !== t.status) {
      await notifyClient(tx, t.clientId, {
        type: "TICKET_UPDATE", title: visible ? `New reply on ${t.number}` : `${t.number} is now ${input.status.replaceAll("_", " ").toLowerCase()}`,
        body: t.subject, link: `/support/${t.id}`,
      });
    }
  });
}
