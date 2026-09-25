import "server-only";
import { after } from "next/server";
import { flushPendingEmails } from "./dispatch";

/** Flush the email outbox after the response has been sent. No-op outside a request (e.g. scripts). */
export function scheduleEmailFlush() {
  try {
    after(async () => {
      try { await flushPendingEmails(); } catch (e) { console.error("Email flush failed", e); }
    });
  } catch {
    // not in a request scope
  }
}
