"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireClientUser } from "@/lib/auth/session";
import { enforce } from "@/lib/rate-limit";
import { parseForm, toErrorState, type ActionState } from "@/server/errors";
import { createRenewalInvoice } from "@/server/services/renewals";
import { startInvoicePayment } from "@/server/services/checkout";

const renewSchema = z.object({ subscriptionId: z.string().min(1) });
const paySchema = z.object({ invoiceId: z.string().min(1), method: z.enum(["CARD", "BANK_TRANSFER_PAYSTACK"]) });

export async function renewSubscriptionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireClientUser();
  let invoiceId: string;
  try {
    await enforce(`renew:${user.id}`, 20, 3600);
    const { subscriptionId } = parseForm(renewSchema, fd);
    invoiceId = (await createRenewalInvoice(user, subscriptionId)).id;
  } catch (e) { return toErrorState(e); }
  redirect(`/invoices/${invoiceId}`);
}

export async function payInvoiceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireClientUser();
  let url: string;
  try {
    const { invoiceId, method } = parseForm(paySchema, fd);
    await enforce(`pay:${user.id}`, 10, 600);
    url = await startInvoicePayment(user, invoiceId, method);
  } catch (e) { return toErrorState(e); }
  redirect(url);
}

// ───────── Phase 5 ─────────
import { revalidatePath } from "next/cache";
import * as v from "@/server/validation";
import { submitManualPayment } from "@/server/services/manual-payments";
import { createDomainRequest } from "@/server/services/domains";
import { createTicket, replyAsClient } from "@/server/services/tickets";

export async function submitManualPaymentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireClientUser();
  try {
    const input = parseForm(v.manualPaymentSchema, fd);
    await enforce(`manual:${user.id}`, 5, 3600);
    const file = fd.get("proof");
    await submitManualPayment(user, input, file instanceof File ? file : null);
    revalidatePath(`/invoices/${input.invoiceId}`);
    return { ok: "Transfer submitted. We will confirm it shortly." };
  } catch (e) { return toErrorState(e); }
}

export async function requestDomainAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireClientUser();
  try {
    await enforce(`domain:${user.id}`, 10, 3600);
    const r = await createDomainRequest(user, parseForm(v.domainRequestSchema, fd));
    revalidatePath("/services");
    return { ok: `Request for ${r.domain} submitted.` };
  } catch (e) { return toErrorState(e); }
}

export async function createTicketAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireClientUser();
  let id: string;
  try { await enforce(`ticket:${user.id}`, 10, 3600); id = (await createTicket(user, parseForm(v.ticketSchema, fd))).id; }
  catch (e) { return toErrorState(e); }
  redirect(`/support/${id}`);
}

export async function replyTicketAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireClientUser();
  try {
    const i = parseForm(v.ticketReplySchema, fd);
    await enforce(`reply:${user.id}`, 30, 3600);
    await replyAsClient(user, i.ticketId, i.body);
    revalidatePath(`/support/${i.ticketId}`);
    return { ok: "Reply sent." };
  } catch (e) { return toErrorState(e); }
}
