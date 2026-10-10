import "server-only";
import { brand, formatNaira } from "@/config/brand";
import { formatDate } from "@/lib/format";
import { getReceiptData } from "@/server/services/receipts";
import { generateReceiptPdf } from "@/server/receipts/generate";
import { sendEmail } from "./resend";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

/**
 * Called once, right after a payment is confirmed (see applyPaid in settlement.ts). Transactional —
 * always sent regardless of the client's "email notifications" preference, like any payment receipt.
 * Goes to the client's registered billing email, not each individual portal login.
 */
export async function sendReceiptEmail(paymentId: string): Promise<void> {
  // "ADMIN" viewer bypasses the per-client ownership check by design: this is a system send, not a user request.
  const data = await getReceiptData(paymentId, { role: "ADMIN", clientId: null });
  if (!data) return; // not found, or somehow not actually PAID — nothing to send

  const pdfBytes = await generateReceiptPdf(data);
  const subject = `Receipt for your payment · ${brand.name}`;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f5f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0B1020">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:8px;border:1px solid #e3e6ee">
<tr><td style="padding:24px 28px;border-bottom:1px solid #e3e6ee"><strong style="font-size:16px">${esc(brand.name)}</strong> <span style="color:#6b7385;font-size:13px">by ${esc(brand.parent)}</span></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 12px;font-size:18px">Payment received</h1>
<p style="margin:0 0 8px;font-size:15px;line-height:1.55;color:#2a3147">We've received your payment of <strong>${esc(formatNaira(data.total))}</strong> for ${esc(data.invoiceDescription)}.</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#2a3147">Paid via <strong>${esc(data.method)}</strong> on ${esc(formatDate(data.paidAt))}. Your receipt is attached as a PDF.</p>
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e3e6ee;font-size:12px;color:#6b7385">${esc(brand.lockup)}.</td></tr>
</table></td></tr></table></body></html>`;
  const text = `Payment received\n\nWe've received your payment of ${formatNaira(data.total)} for ${data.invoiceDescription}.\nPaid via ${data.method} on ${formatDate(data.paidAt)}.\n\nYour receipt is attached.\n\n${brand.lockup}`;

  await sendEmail({
    to: data.clientEmail,
    subject, html, text,
    attachments: [{ filename: `${data.receiptNumber}-Receipt.pdf`, content: Buffer.from(pdfBytes).toString("base64") }],
  });
}