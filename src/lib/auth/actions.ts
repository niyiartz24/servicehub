"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  next: z.string().optional(),
});

export type LoginState = { error?: string };

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a valid email and password." };

  const ip = await clientIp();
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`login:ip:${ip}`, 20, 600),
    rateLimit(`login:email:${parsed.data.email.toLowerCase()}`, 8, 600),
  ]);
  if (!byIp.ok || !byEmail.ok) return { error: "Too many attempts. Please wait a few minutes and try again." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { error: "Incorrect email or password." };

  // Only allow same-site relative redirects.
  const next = parsed.data.next;
  redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ───────── Password reset / invite acceptance ─────────
import { z as zod } from "zod";
import type { ActionState } from "@/server/errors";

const emailSchema = zod.object({ email: zod.string().trim().toLowerCase().email() });

/** Always returns the same message so this can't be used to discover which emails have accounts. */
export async function requestPasswordReset(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = emailSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Enter a valid email address." };
  const ip = await clientIp();
  const [byIp, byEmail] = await Promise.all([rateLimit(`reset:ip:${ip}`, 10, 3600), rateLimit(`reset:email:${parsed.data.email}`, 3, 3600)]);
  // Same message whether limited or not, so this reveals nothing.
  if (!byIp.ok || !byEmail.ok) return { ok: "If an account exists for that email, a reset link is on its way." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/set-password`,
  });
  return { ok: "If an account exists for that email, a reset link is on its way." };
}

const passwordSchema = zod.object({ password: zod.string().min(10, "Use at least 10 characters"), confirm: zod.string() })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match", path: ["confirm"] });

export async function setPassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = passwordSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid password." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "This link has expired. Request a new one from the sign-in page." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "Could not update your password. Try again or request a new link." };
  redirect("/dashboard");
}
