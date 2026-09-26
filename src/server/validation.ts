import { z } from "zod";
import { BillingCycle, DomainRequestStatus, SubscriptionStatus, TicketCategory, TicketPriority, TicketStatus } from "@prisma/client";

const blank = (v: unknown) => (v === "" || v === null ? undefined : v);
const optStr = (max = 500) => z.preprocess(blank, z.string().trim().max(max).optional());
const reqStr = (max = 200) => z.string().trim().min(1, "Required").max(max);
/** Admin enters naira; we store kobo. */
const naira = z.coerce.number().min(0, "Cannot be negative").max(1_000_000_000).transform((n) => Math.round(n * 100));
const optNaira = z.preprocess(blank, naira.optional());
const optDate = z.preprocess(blank, z.coerce.date().optional());
const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());
const id = z.string().min(1);

export const clientSchema = z.object({
  name: reqStr(120),
  contactName: optStr(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: optStr(40),
  address: optStr(300),
  notes: optStr(1000),
  sendInvite: checkbox,
});
export const clientUpdateSchema = clientSchema.omit({ sendInvite: true }).extend({ id });

export const projectSchema = z.object({
  clientId: id,
  name: reqStr(120),
  primaryUrl: z.preprocess(blank, z.string().trim().url("Enter a full URL, e.g. https://ravers.ng").optional()),
  description: optStr(500),
});

export const planSchema = z.object({
  serviceTypeId: id,
  name: reqStr(120),
  description: optStr(300),
  defaultPrice: naira,
  billingCycle: z.nativeEnum(BillingCycle),
  storageGb: z.preprocess(blank, z.coerce.number().positive().optional()),
  bandwidthGb: z.preprocess(blank, z.coerce.number().positive().optional()),
});
export const planUpdateSchema = planSchema.omit({ serviceTypeId: true, billingCycle: true }).extend({ id });

export const assignSchema = z.object({
  projectId: id,
  planId: id,
  serviceName: reqStr(160),
  price: optNaira, // blank = use plan default
  billingCycle: z.preprocess(blank, z.nativeEnum(BillingCycle).optional()),
  startDate: z.coerce.date(),
  nextBillingDate: optDate,
  status: z.nativeEnum(SubscriptionStatus).default("ACTIVE"),
  autoRenew: checkbox,
  notes: optStr(1000),
});

export const subscriptionUpdateSchema = z.object({
  id,
  planId: id,
  price: naira, // required on edit so the admin always sees the effective price
  billingCycle: z.nativeEnum(BillingCycle),
  nextBillingDate: optDate,
  status: z.nativeEnum(SubscriptionStatus),
  autoRenew: checkbox,
  notes: optStr(1000),
});

export type ClientInput = z.output<typeof clientSchema>;
export type ClientUpdateInput = z.output<typeof clientUpdateSchema>;
export type ProjectInput = z.output<typeof projectSchema>;
export type PlanInput = z.output<typeof planSchema>;
export type PlanUpdateInput = z.output<typeof planUpdateSchema>;
export type AssignInput = z.output<typeof assignSchema>;
export type SubscriptionUpdateInput = z.output<typeof subscriptionUpdateSchema>;

// ───────── Phase 5 ─────────
const domain = z.string().trim().toLowerCase().regex(/^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/, "Enter a valid domain, e.g. example.com");

export const domainRequestSchema = z.object({
  domain,
  durationYears: z.coerce.number().int().min(1).max(10),
  projectId: z.preprocess(blank, id.optional()),
  purpose: optStr(300),
  notes: optStr(1000),
});

export const domainAdminSchema = z.object({
  id,
  status: z.nativeEnum(DomainRequestStatus),
  registrarCost: optNaira,
  clientPrice: optNaira,
  adminNotes: optStr(1000),
});

export const ticketSchema = z.object({
  subject: reqStr(160),
  description: z.string().trim().min(1, "Required").max(5000),
  category: z.nativeEnum(TicketCategory),
  priority: z.nativeEnum(TicketPriority).default("MEDIUM"),
  serviceId: z.preprocess(blank, id.optional()),
});
export const ticketReplySchema = z.object({ ticketId: id, body: z.string().trim().min(1, "Write a message").max(5000) });
export const adminTicketSchema = z.object({
  ticketId: id,
  body: z.preprocess(blank, z.string().trim().max(5000).optional()),
  isInternal: checkbox,
  status: z.nativeEnum(TicketStatus),
});

export const manualPaymentSchema = z.object({
  invoiceId: id,
  declaredAmount: naira,
  transferReference: reqStr(80),
});
export const approveManualSchema = z.object({ paymentId: id, amountReceived: naira, note: optStr(300) });
export const rejectManualSchema = z.object({ paymentId: id, note: z.string().trim().min(1, "Give the client a reason").max(300) });

export const bankSchema = z.object({ bankName: reqStr(80), accountName: reqStr(120), accountNumber: z.string().trim().regex(/^\d{10}$/, "Nigerian account numbers are 10 digits") });
export const taxSchema = z.object({ enabled: checkbox, ratePercent: z.coerce.number().min(0).max(100) });

export type DomainRequestInput = z.output<typeof domainRequestSchema>;
export type DomainAdminInput = z.output<typeof domainAdminSchema>;
export type TicketInput = z.output<typeof ticketSchema>;
export type AdminTicketInput = z.output<typeof adminTicketSchema>;
export type ManualPaymentInput = z.output<typeof manualPaymentSchema>;

// ───────── Admin: /admin/services ─────────
export const serviceUpdateSchema = z.object({
  id,
  name: reqStr(160),
  provider: optStr(120),
  usageUsed: z.preprocess(blank, z.coerce.number().min(0).optional()),
  usageLimit: z.preprocess(blank, z.coerce.number().positive().optional()),
  usageUnit: optStr(20),
  notes: optStr(1000),
});
export type ServiceUpdateInput = z.output<typeof serviceUpdateSchema>;