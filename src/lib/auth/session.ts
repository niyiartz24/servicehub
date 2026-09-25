import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role, User } from "@prisma/client";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { can, isAdminRole, type Capability } from "./roles";

/** Verified Supabase user joined to our User row. Null if signed out or no profile. */
export const getSessionUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); // validates JWT with Supabase
  if (!user) return null;
  const profile = await db.user.findUnique({ where: { id: user.id } });
  return profile?.isActive ? profile : null;
});

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(cap?: Capability): Promise<User> {
  const user = await requireUser();
  if (!isAdminRole(user.role) || (cap && !can(user.role, cap))) redirect("/dashboard");
  return user;
}

/** Returns the user AND their clientId. Every client-side query must be scoped by this. */
export async function requireClientUser(): Promise<User & { clientId: string }> {
  const user = await requireUser();
  if (user.role !== "CLIENT") redirect("/admin");
  if (!user.clientId) redirect("/login?error=no-client");
  return user as User & { clientId: string };
}

export type { Role };
