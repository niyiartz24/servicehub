import "server-only";
import { after } from "next/server";
import { flushPendingEmails } from "./dispatch";
import { sendReceiptEmail } from "./receipt-email";

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

/** Sends the PDF receipt once, right after the response — never inside the payment's own transaction. */
export function scheduleReceiptEmail(paymentId: string) {
  try {
    after(async () => {
      try { await sendReceiptEmail(paymentId); } catch (e) { console.error("Receipt email failed", e); }
    });
  } catch {
    // not in a request scope
  }
}