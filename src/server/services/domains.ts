import "server-only";
import type { DomainRequestStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { brand, formatNaira } from "@/config/brand";
import { UserError } from "@/server/errors";
import type { z } from "zod";
import type { domainAdminSchema, domainRequestSchema } from "@/server/validation";
import { audit, diffFields } from "./audit";
import { nextNumber } from "./numbering";
import { notifyAdmins, notifyClient } from "./notifications";
import { taxRatePercent } from "./renewals";

type ClientInput = z.output<typeof domainRequestSchema>;
type AdminInput = z.output<typeof domainAdminSchema>;

/** Client-facing select: registrarCost and adminNotes are internal and never returned. */
export const listClientDomainRequests = (clientId: string) =>
  db.domainRequest.findMany({
    where: { clientId },
    select: { id: true, domain: true, durationYears: true, status: true, clientPrice: true, invoiceId: true, createdAt: true },
    orderBy: { createdAt: "desc" }, take: 50,
  });

export async function createDomainRequest(user: { id: string; clientId: string }, input: ClientInput) {
  if (input.projectId) {
    const p = await db.project.findFirst({ where: { id: input.projectId, clientId: user.clientId }, select: { id: true } });
    if (!p) throw new UserError("Project not found.");
  }
  const dup = await db.domainRequest.findFirst({ where: { clientId: user.clientId, domain: input.domain, status: { notIn: ["REJECTED", "UNAVAILABLE"] } } });
  if (dup) throw new UserError("You already have an open request for that domain.");

  return db.$transaction(async (tx) => {
    const client = await tx.client.findUniqueOrThrow({ where: { id: user.clientId }, select: { name: true } });
    const req = await tx.domainRequest.create({
      data: { clientId: user.clientId, projectId: input.projectId, domain: input.domain, durationYears: input.durationYears, purpose: input.purpose, notes: input.notes },
    });
    await audit(tx, { actorId: user.id, action: "domain_request.created", entity: "DomainRequest", entityId: req.id, metadata: { domain: req.domain } });
    await notifyAdmins(tx, { type: "DOMAIN_REQUEST_UPDATE", title: "New domain request", body: `${client.name} requested ${req.domain} for ${req.durationYears} year(s).`, link: "/admin/domains" });
    return req;
  });
}

export async function listDomainRequests(status?: DomainRequestStatus) {
  const rows = await db.domainRequest.findMany({
    where: status ? { status } : {}, orderBy: { createdAt: "desc" }, take: 200,
    include: { client: { select: { id: true, name: true } }, project: { select: { name: true } } },
  });
  const ids = rows.map((r) => r.invoiceId).filter((x): x is string => Boolean(x));
  const invoices = ids.length ? await db.invoice.findMany({ where: { id: { in: ids } }, select: { id: true, number: true, status: true } }) : [];
  const byId = new Map(invoices.map((i) => [i.id, i]));
  return rows.map((r) => ({ ...r, invoice: r.invoiceId ? byId.get(r.invoiceId) ?? null : null }));
}

const CLIENT_MESSAGES: Partial<Record<DomainRequestStatus, (d: string) => string>> = {
  AVAILABLE: (d) => `${d} appears to be available. We will send a payment request shortly.`,
  UNAVAILABLE: (d) => `${d} isn't available. You can request a different domain.`,
  PURCHASED: (d) => `${d} has been purchased and is being configured.`,
  ACTIVE: (d) => `Your domain request has been approved: ${d} is now active.`,
  REJECTED: (d) => `We couldn't proceed with your request for ${d}. Contact support for details.`,
};

export async function updateDomainRequest(actorId: string, input: AdminInput) {
  await db.$transaction(async (tx) => {
    const cur = await tx.domainRequest.findUnique({ where: { id: input.id } });
    if (!cur) throw new UserError("Request not found.");
    const next = { status: input.status, registrarCost: input.registrarCost ?? null, clientPrice: input.clientPrice ?? null, adminNotes: input.adminNotes ?? null };
    const changes = diffFields(cur, next);
    if (Object.keys(changes).length === 0) return;
    await tx.domainRequest.update({ where: { id: cur.id }, data: next });
    await audit(tx, { actorId, action: cur.status !== input.status ? "domain_request.status_changed" : "domain_request.updated", entity: "DomainRequest", entityId: cur.id, metadata: { changes } });
    const msg = cur.status !== input.status ? CLIENT_MESSAGES[input.status] : undefined;
    if (msg) await notifyClient(tx, cur.clientId, { type: "DOMAIN_REQUEST_UPDATE", title: "Domain request update", body: msg(cur.domain), link: "/services" });
  });
}

/** Turns a priced request into a normal invoice; the client pays it like any other. */
export async function createDomainPaymentRequest(actorId: string, id: string) {
  return db.$transaction(async (tx) => {
    const dr = await tx.domainRequest.findUnique({ where: { id } });
    if (!dr) throw new UserError("Request not found.");
    if (!dr.clientPrice || dr.clientPrice <= 0) throw new UserError("Set the client price first.");
    if (!["AVAILABLE", "PAYMENT_PENDING"].includes(dr.status)) throw new UserError("Mark the domain as Available before requesting payment.");
    if (dr.invoiceId) {
      const existing = await tx.invoice.findUnique({ where: { id: dr.invoiceId } });
      if (existing && ["PENDING", "OVERDUE", "PAID"].includes(existing.status)) throw new UserError("A payment request already exists for this domain.");
    }
    const rate = await taxRatePercent();
    const tax = Math.round((dr.clientPrice * rate) / 100);
    const number = await nextNumber(tx, "invoice", brand.invoicePrefix);
    const label = `Domain registration: ${dr.domain} (${dr.durationYears} year${dr.durationYears > 1 ? "s" : ""})`;
    const invoice = await tx.invoice.create({
      data: {
        number, clientId: dr.clientId, projectId: dr.projectId, description: label,
        subtotal: dr.clientPrice, tax, total: dr.clientPrice + tax, status: "PENDING",
        dueDate: new Date(Date.now() + 7 * 86_400_000),
        items: { create: [{ description: label, quantity: 1, unitPrice: dr.clientPrice, amount: dr.clientPrice }] },
      },
    });
    await tx.domainRequest.update({ where: { id }, data: { status: "PAYMENT_PENDING", invoiceId: invoice.id } });
    await audit(tx, { actorId, action: "domain_request.payment_requested", entity: "DomainRequest", entityId: id, metadata: { invoiceId: invoice.id, total: invoice.total } });
    await notifyClient(tx, dr.clientId, { type: "DOMAIN_REQUEST_UPDATE", title: "Payment requested", body: `Please pay ${formatNaira(invoice.total)} to register ${dr.domain}.`, link: `/invoices/${invoice.id}` });
    return invoice;
  });
}
