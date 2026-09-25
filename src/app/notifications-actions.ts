"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import type { ActionState } from "@/server/errors";

/** Scoped to the signed-in user in the WHERE clause: you can only ever touch your own notifications. */
export async function markReadAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(fd.get("id") ?? "");
  await db.notification.updateMany({ where: { id, userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
}

export async function markAllReadAction(): Promise<void> {
  const user = await requireUser();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
}

export async function setEmailPreferenceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const enabled = z.preprocess((v) => v === "on", z.boolean()).parse(fd.get("emailNotifications"));
  await db.user.update({ where: { id: user.id }, data: { emailNotifications: enabled } });
  revalidatePath("/account");
  return { ok: enabled ? "Email notifications are on." : "Email notifications are off. You will still see them in the app." };
}
