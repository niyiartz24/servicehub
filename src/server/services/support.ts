import "server-only";
import type { TicketStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { brand } from "@/config/brand";
import { UserError } from "@/server/errors";
import type { AdminReplyInput, ReplyInput, TicketInput } from "@/server/validation";
import { audit } from "./audit";
import { nextNumber } from "./numbering";
import { notifyAdmins, notifyClient } from "./notifications";

// ── client ──
export const listClientTickets = (clientId: string) =>
  db.supportTicket.findMany({
    where: { clientId },
    select: { id: true, number: true, subject: true, category: true, status: true, priority: true, updatedAt: true },
    orderBy: { updatedAt: "desc" }, take: 100,
  });

export const getClientTicket = (clientId: string, id: string) =>
  db.supportTicket.findFirst({
    where: { id, clientId },
    select: {
      id: true, number: true, subject: true, description: true, category: true, priority: true, status: true, createdAt: true,
      messages: { where: { isInternal: false }, orderBy: { createdAt: "asc" }, select: { id: true, body: true, createdAt: true, author: { select: { fullName: true, role: true } } } },
    },
  });

export async function createTicket(user: { id: string; clientId: string }, input: TicketInput) {
  let serviceId: string | undefined, projectId: string | undefined;
  if (input.serviceId) {
    const svc = await db.service.findFirst({ where: { id: input.serviceId, project: { clientId: user.clientId } }, select: { id: true, projectId: true } });
    if (!svc) throw new UserError("Service not found.");
    serviceId = svc.id; projectId = svc.projectId;
  }
  return db.$transaction(async (tx) => {
    const number = await nextNumber(tx, "ticket", brand.ticketPrefix);
    const t = await tx.supportTicket.create({
      data: { number, clientId: user.clientId, projectId, serviceId, subject: input.subject, description: input.description, category: input.category, priority: input.priority },
    });
    await audit(tx, { actorId: user.id, action: "ticket.created", entity: "SupportTicket", entityId: t.id, metadata: { category: t.category, priority: t.priority } });
    await notifyAdmins(tx, { type: "TICKET_UPDATE", title: `New support request ${number}`, body: t.subject, link: `/admin/support/${t.id}` });
    return t;
  });
}

export async function clientReply(user: { id: string; clientId: string }, input: ReplyInput) {
  await db.$transaction(async (tx) => {
    const t = await tx.supportTicket.findFirst({ where: { id: input.ticketId, clientId: user.clientId } });
    if (!t) throw new UserError("Request not found.");
    if (t.status === "CLOSED") throw new UserError("This request is closed. Please open a new one.");
    await tx.ticketMessage.create({ data: { ticketId: t.id, authorId: user.id, body: input.body } });
    // A client reply always puts the ball back in SynthaxLab's court.
    if (t.status === "WAITING_FOR_CLIENT" || t.status === "RESOLVED") await tx.supportTicket.update({ where: { id: t.id }, data: { status: "OPEN" } });
    else await tx.supportTicket.update({ where: { id: t.id }, data: { updatedAt: new Date() } });
    await notifyAdmins(tx, { type: "TICKET_UPDATE", title: `Client replied on ${t.number}`, body: t.subject, link: `/admin/support/${t.id}` });
  });
}

// ── admin ──
export const listTickets = (status?: TicketStatus) =>
  db.supportTicket.findMany({
    where: status ? { status } : {},
    include: { client: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" }, take: 200,
  });

export const getTicketAdmin = (id: string) =>
  db.supportTicket.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      service: { select: { name: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { fullName: true, email: true, role: true } } } },
    },
  });

export async function adminReply(adminId: string, input: AdminReplyInput) {
  await db.$transaction(async (tx) => {
    const t = await tx.supportTicket.findUnique({ where: { id: input.ticketId } });
    if (!t) throw new UserError("Request not found.");
    await tx.ticketMessage.create({ data: { ticketId: t.id, authorId: adminId, body: input.body, isInternal: input.isInternal } });
    const status = t.status === "OPEN" && !input.isInternal ? "IN_PROGRESS" : t.status;
    await tx.supportTicket.update({ where: { id: t.id }, data: { status } });
    await audit(tx, { actorId: adminId, action: input.isInternal ? "ticket.internal_note" : "ticket.replied", entity: "SupportTicket", entityId: t.id });
    if (!input.isInternal) {
      await notifyClient(tx, t.clientId, { type: "TICKET_UPDATE", title: `SynthaxLab replied to ${t.number}`, body: t.subject, link: `/support/${t.id}` });
    }
  });
}

export async function setTicketStatus(adminId: string, ticketId: string, status: TicketStatus) {
  await db.$transaction(async (tx) => {
    const t = await tx.supportTicket.findUnique({ where: { id: ticketId } });
    if (!t) throw new UserError("Request not found.");
    if (t.status === status) return;
    await tx.supportTicket.update({ where: { id: t.id }, data: { status } });
    await audit(tx, { actorId: adminId, action: "ticket.status_changed", entity: "SupportTicket", entityId: t.id, metadata: { from: t.status, to: status } });
    await notifyClient(tx, t.clientId, { type: "TICKET_UPDATE", title: `${t.number} is now ${status.replaceAll("_", " ").toLowerCase()}`, body: t.subject, link: `/support/${t.id}` });
  });
}
