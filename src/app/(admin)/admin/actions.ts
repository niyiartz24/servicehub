"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { parseForm, toErrorState, type ActionState } from "@/server/errors";
import * as v from "@/server/validation";
import { createClientAccount, setClientActive, updateClientAccount } from "@/server/services/clients";
import { createProject } from "@/server/services/projects";
import { createPlan, removePlan, setPlanActive, updatePlan } from "@/server/services/plans";
import { assignService, updateSubscription } from "@/server/services/subscriptions";
import { deleteUnusedService, updateServiceDetails } from "@/server/services/services-admin";

// Auth runs OUTSIDE try/catch so redirects from requireAdmin propagate.

export async function createClientAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin("clients:manage");
  try {
    const c = await createClientAccount(admin.id, parseForm(v.clientSchema, fd));
    revalidatePath("/admin/clients");
    return { ok: `Client "${c.name}" created.` };
  } catch (e) { return toErrorState(e); }
}

export async function updateClientAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin("clients:manage");
  try {
    const input = parseForm(v.clientUpdateSchema, fd);
    await updateClientAccount(admin.id, input);
    revalidatePath(`/admin/clients/${input.id}`);
    return { ok: "Client updated." };
  } catch (e) { return toErrorState(e); }
}

export async function setClientActiveAction(fd: FormData): Promise<void> {
  const admin = await requireAdmin("clients:manage");
  const id = String(fd.get("id") ?? "");
  await setClientActive(admin.id, id, fd.get("active") === "true");
  revalidatePath(`/admin/clients/${id}`);
  revalidatePath("/admin/clients");
}

export async function createProjectAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin("clients:manage");
  try {
    const p = await createProject(admin.id, parseForm(v.projectSchema, fd));
    revalidatePath("/admin/projects");
    revalidatePath(`/admin/clients/${p.clientId}`);
    return { ok: `Project "${p.name}" created.` };
  } catch (e) { return toErrorState(e); }
}

export async function createPlanAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin("plans:manage");
  try {
    const p = await createPlan(admin.id, parseForm(v.planSchema, fd));
    revalidatePath("/admin/plans");
    return { ok: `Plan "${p.name}" created.` };
  } catch (e) { return toErrorState(e); }
}

export async function updatePlanAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin("plans:manage");
  try {
    await updatePlan(admin.id, parseForm(v.planUpdateSchema, fd));
    revalidatePath("/admin/plans");
    return { ok: "Plan updated. Existing subscriptions keep their current price." };
  } catch (e) { return toErrorState(e); }
}

export async function setPlanActiveAction(fd: FormData): Promise<void> {
  const admin = await requireAdmin("plans:manage");
  await setPlanActive(admin.id, String(fd.get("id") ?? ""), fd.get("active") === "true");
  revalidatePath("/admin/plans");
}

export async function removePlanAction(fd: FormData): Promise<void> {
  const admin = await requireAdmin("plans:manage");
  await removePlan(admin.id, String(fd.get("id") ?? ""));
  revalidatePath("/admin/plans");
}

export async function assignServiceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin("subscriptions:manage");
  try {
    const s = await assignService(admin.id, parseForm(v.assignSchema, fd));
    revalidatePath("/admin/subscriptions");
    revalidatePath(`/admin/clients/${s.clientId}`);
    return { ok: "Service assigned." };
  } catch (e) { return toErrorState(e); }
}

export async function updateSubscriptionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin("subscriptions:manage");
  try {
    const input = parseForm(v.subscriptionUpdateSchema, fd);
    await updateSubscription(admin.id, input);
    revalidatePath("/admin/subscriptions");
    revalidatePath(`/admin/subscriptions/${input.id}`);
    return { ok: "Subscription updated." };
  } catch (e) { return toErrorState(e); }
}

export async function updateServiceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin("subscriptions:manage");
  try {
    const input = parseForm(v.serviceUpdateSchema, fd);
    await updateServiceDetails(admin.id, input);
    revalidatePath("/admin/services");
    revalidatePath(`/admin/services/${input.id}`);
    return { ok: "Service updated." };
  } catch (e) { return toErrorState(e); }
}

export async function deleteServiceAction(fd: FormData): Promise<void> {
  const admin = await requireAdmin("subscriptions:manage");
  const id = String(fd.get("id") ?? "");
  await deleteUnusedService(admin.id, id); // no-ops if the service has subscription history
  revalidatePath("/admin/services");
}