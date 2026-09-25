import "server-only";
import type { NotificationType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { scheduleEmailFlush } from "@/server/email/schedule";

type Runner = Prisma.TransactionClient | typeof db;
export type NotificationPayload = { type: NotificationType; title: string; body: string; link?: string };

// Rows are created in the caller's transaction. Emails go out after the response, from the outbox.
export async function notifyClient(runner: Runner, clientId: string, p: NotificationPayload) {
  const users = await runner.user.findMany({ where: { clientId, isActive: true, role: "CLIENT" }, select: { id: true } });
  if (users.length) {
    await runner.notification.createMany({ data: users.map((u) => ({ userId: u.id, ...p })) });
    scheduleEmailFlush();
  }
}

export async function notifyAdmins(runner: Runner, p: NotificationPayload) {
  const admins = await runner.user.findMany({ where: { isActive: true, role: { in: ADMIN_ROLES } }, select: { id: true } });
  if (admins.length) {
    await runner.notification.createMany({ data: admins.map((u) => ({ userId: u.id, ...p })) });
    scheduleEmailFlush();
  }
}

export const unreadCount = (userId: string) => db.notification.count({ where: { userId, readAt: null } });

export const listNotifications = (userId: string) =>
  db.notification.findMany({
    where: { userId }, orderBy: { createdAt: "desc" }, take: 100,
    select: { id: true, type: true, title: true, body: true, link: true, readAt: true, createdAt: true },
  });
