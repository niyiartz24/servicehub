import "server-only";
import type { InvoiceStatus } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Every function here takes clientId from the verified session and puts it in the WHERE clause.
 * A record belonging to another client is indistinguishable from one that doesn't exist (→ 404).
 * Queries use explicit `select`s so admin-only columns (notes, gateway payloads) never leave the server.
 */

export const effectiveInvoiceStatus = (i: { status: InvoiceStatus; dueDate: Date }, now = new Date()): InvoiceStatus =>
  i.status === "PENDING" && i.dueDate < now ? "OVERDUE" : i.status;

export const listClientServices = (clientId: string) =>
  db.service.findMany({
    where: { project: { clientId } },
    select: {
      id: true, name: true,
      serviceType: { select: { code: true, name: true } },
      project: { select: { id: true, name: true } },
      subscriptions: {
        where: { clientId }, orderBy: { createdAt: "desc" }, take: 1,
        select: { id: true, price: true, billingCycle: true, status: true, nextBillingDate: true, plan: { select: { name: true } } },
      },
    },
    orderBy: [{ project: { name: "asc" } }, { name: "asc" }],
  });

export const getClientService = (clientId: string, serviceId: string) =>
  db.service.findFirst({
    where: { id: serviceId, project: { clientId } },
    select: {
      id: true, name: true, provider: true, details: true, usageUsed: true, usageLimit: true, usageUnit: true,
      serviceType: { select: { code: true, name: true } },
      project: { select: { name: true } },
      subscriptions: {
        where: { clientId }, orderBy: { createdAt: "desc" }, take: 1,
        select: { id: true, price: true, billingCycle: true, customCycleDays: true, status: true, startDate: true, nextBillingDate: true, autoRenew: true, plan: { select: { name: true, specs: true } } },
      },
    },
  });

export const listServiceBilling = (clientId: string, serviceId: string) =>
  db.invoiceItem.findMany({
    where: { subscription: { serviceId }, invoice: { clientId } },
    select: { id: true, invoice: { select: { id: true, number: true, total: true, status: true, dueDate: true } } },
    orderBy: { invoice: { createdAt: "desc" } },
    take: 5,
  });

export const listClientSubscriptions = (clientId: string) =>
  db.subscription.findMany({
    where: { clientId },
    select: {
      id: true, price: true, billingCycle: true, status: true, nextBillingDate: true, autoRenew: true,
      plan: { select: { name: true } },
      service: { select: { id: true, name: true, serviceType: { select: { name: true } }, project: { select: { name: true } } } },
    },
    orderBy: { nextBillingDate: "asc" },
  });

export const listClientInvoices = (clientId: string) =>
  db.invoice.findMany({
    where: { clientId, status: { not: "DRAFT" } }, // drafts are internal
    select: { id: true, number: true, description: true, total: true, status: true, dueDate: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

export const getClientInvoice = (clientId: string, id: string) =>
  db.invoice.findFirst({
    where: { id, clientId, status: { not: "DRAFT" } },
    select: {
      id: true, number: true, description: true, periodStart: true, periodEnd: true,
      subtotal: true, tax: true, total: true, currency: true, status: true, dueDate: true, paidAt: true, createdAt: true,
      project: { select: { name: true } },
      items: { select: { id: true, description: true, quantity: true, unitPrice: true, amount: true } },
      payments: { select: { id: true, reference: true, status: true, amount: true, method: true, createdAt: true }, orderBy: { createdAt: "desc" } },
    },
  });

export const listClientPayments = (clientId: string) =>
  db.payment.findMany({
    where: { clientId },
    select: { id: true, reference: true, amount: true, method: true, status: true, createdAt: true, invoice: { select: { number: true, description: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

export const getClientPayment = (clientId: string, id: string) =>
  db.payment.findFirst({
    where: { id, clientId },
    select: {
      id: true, reference: true, amount: true, currency: true, method: true, status: true, verifiedAt: true, createdAt: true,
      invoice: { select: { id: true, number: true, description: true, periodStart: true, periodEnd: true } },
    },
  });

export const listClientProjects = (clientId: string) =>
  db.project.findMany({ where: { clientId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
