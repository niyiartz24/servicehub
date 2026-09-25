"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { parseForm, toErrorState, type ActionState } from "@/server/errors";
import * as v from "@/server/validation";
import { approveManualPayment, rejectManualPayment } from "@/server/services/manual-payments";
import { createDomainPaymentRequest, updateDomainRequest } from "@/server/services/domains";
import { adminUpdateTicket } from "@/server/services/tickets";
import { saveSetting } from "@/server/services/settings";

export async function approveManualPaymentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin("payments:manage");
  try {
    const i = parseForm(v.approveManualSchema, fd);
    const outcome = await approveManualPayment(admin.id, i.paymentId, i.amountReceived, i.note);
    revalidatePath("/admin/payments");
    return { ok: outcome === "duplicate" ? "Approved, but the invoice was already paid. Review for refund." : "Payment approved. Invoice paid and subscription extended." };
  } catch (e) { return toErrorState(e); }
}

export async function rejectManualPaymentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin("payments:manage");
  try {
    const i = parseForm(v.rejectManualSchema, fd);
    await rejectManualPayment(admin.id, i.paymentId, i.note);
    revalidatePath("/admin/payments");
    return { ok: "Payment rejected. The client has been notified." };
  } catch (e) { return toErrorState(e); }
}

export async function updateDomainRequestAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin("domains:manage");
  try {
    await updateDomainRequest(admin.id, parseForm(v.domainAdminSchema, fd));
    revalidatePath("/admin/domains");
    return { ok: "Saved." };
  } catch (e) { return toErrorState(e); }
}

export async function requestDomainPaymentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin("domains:manage");
  try {
    const inv = await createDomainPaymentRequest(admin.id, String(fd.get("id") ?? ""));
    revalidatePath("/admin/domains");
    return { ok: `Payment request ${inv.number} sent to the client.` };
  } catch (e) { return toErrorState(e); }
}

export async function adminTicketAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin("support:manage");
  try {
    const i = parseForm(v.adminTicketSchema, fd);
    await adminUpdateTicket(admin.id, i);
    revalidatePath(`/admin/support/${i.ticketId}`);
    revalidatePath("/admin/support");
    return { ok: "Ticket updated." };
  } catch (e) { return toErrorState(e); }
}

export async function saveBankAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin("settings:manage");
  try {
    await saveSetting(admin.id, "bank", parseForm(v.bankSchema, fd));
    revalidatePath("/admin/settings");
    return { ok: "Bank details saved." };
  } catch (e) { return toErrorState(e); }
}

export async function saveTaxAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin("settings:manage");
  try {
    await saveSetting(admin.id, "tax", parseForm(v.taxSchema, fd));
    revalidatePath("/admin/settings");
    return { ok: "Tax settings saved. Applies to invoices created from now on." };
  } catch (e) { return toErrorState(e); }
}
