"use server";

import { after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { clientIp, enforce } from "@/lib/rate-limit";
import { toErrorState, type ActionState } from "@/server/errors";
import { sendEmail } from "@/server/email/resend";
import { notificationEmail } from "@/server/email/templates";

const schema = z.object({
  project: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
});

/**
 * Public lookup, so it must never reveal whether a project exists.
 * The reply is identical for a match and a miss; a match only ever emails the address already on file,
 * and the email is sent after the response so timing doesn't leak either.
 */
export async function findProjectAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Enter your project name or domain and the email address SynthaxLab has on file." };
  try {
    await enforce(`findproject:ip:${await clientIp()}`, 5, 3600);
    await enforce(`findproject:email:${parsed.data.email}`, 3, 3600);
  } catch (e) { return toErrorState(e); }

  const q = parsed.data.project;
  const project = await db.project.findFirst({
    where: {
      isActive: true,
      client: { isActive: true, email: { equals: parsed.data.email, mode: "insensitive" } },
      OR: [{ name: { equals: q, mode: "insensitive" } }, { primaryUrl: { contains: q, mode: "insensitive" } }],
    },
    select: { name: true },
  });

  if (project) {
    after(async () => {
      const mail = notificationEmail({
        title: "Access your ServiceHub portal",
        body: `Someone asked to find the project "${project.name}". Sign in to see its services, renewal dates and invoices. If this wasn't you, you can ignore this email.`,
        link: "/login",
      });
      await sendEmail({ to: parsed.data.email, ...mail });
    });
  }
  return { ok: "If those details match a SynthaxLab project, we have emailed sign-in instructions to the address on file." };
}
