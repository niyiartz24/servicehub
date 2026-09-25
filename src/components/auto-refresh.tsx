"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-runs the server component (which re-verifies with the gateway) while a payment is pending. */
export function AutoRefresh({ active, everyMs = 5000, maxTries = 12 }: { active: boolean; everyMs?: number; maxTries?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    let n = 0;
    const t = setInterval(() => { if (++n > maxTries) clearInterval(t); else router.refresh(); }, everyMs);
    return () => clearInterval(t);
  }, [active, everyMs, maxTries, router]);
  return null;
}
