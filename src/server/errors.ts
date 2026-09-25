import { Prisma } from "@prisma/client";
import type { ZodError, ZodType, ZodTypeDef } from "zod";
import { reportError } from "@/lib/monitoring";

/** Safe-to-show message for the admin. Anything else is logged and shown generically. */
export class UserError extends Error {}

export type ActionState = { error?: string; ok?: string };

export function toErrorState(e: unknown): ActionState {
  if (e instanceof UserError) return { error: e.message };
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    return { error: "That already exists." };
  }
  reportError(e, { where: "server-action" });
  return { error: "Something went wrong. Please try again." };
}

function zodMessage(err: ZodError): string {
  const i = err.issues[0];
  return i ? `${i.path.join(".") || "Input"}: ${i.message}` : "Invalid input.";
}

export function parseForm<T>(schema: ZodType<T, ZodTypeDef, unknown>, fd: FormData): T {
  const r = schema.safeParse(Object.fromEntries(fd));
  if (!r.success) throw new UserError(zodMessage(r.error));
  return r.data;
}
