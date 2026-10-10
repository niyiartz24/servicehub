import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { brand, formatNaira } from "@/config/brand";
import { formatDate } from "@/lib/format";
import type { ReceiptData } from "@/server/services/receipts";

const hex = (c: string) => {
  const n = parseInt(c.replace("#", ""), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
const muted = rgb(0.42, 0.45, 0.52);
const ink = rgb(0.08, 0.09, 0.12);
const faint = rgb(0.9, 0.9, 0.93);

export async function generateReceiptPdf(data: ReceiptData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const navy = hex(brand.colors.navy);
  const accent = hex(brand.colors.accent);
  const left = 48, right = width - 48;

  page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: navy });
  page.drawText(brand.name, { x: left, y: height - 50, size: 20, font: bold, color: rgb(1, 1, 1) });
  page.drawText(`by ${brand.parent}`, { x: left, y: height - 68, size: 10, font, color: rgb(0.7, 0.73, 0.82) });
  page.drawText("RECEIPT", { x: right - 95, y: height - 50, size: 16, font: bold, color: accent });
  page.drawText(data.receiptNumber, { x: right - 130, y: height - 68, size: 10, font, color: rgb(0.85, 0.85, 0.9) });

  let y = height - 130;
  const col2 = 320;
  page.drawText("Billed to", { x: left, y, size: 9, font: bold, color: muted });
  page.drawText("Payment details", { x: col2, y, size: 9, font: bold, color: muted });
  y -= 16;
  page.drawText(data.clientName, { x: left, y, size: 12, font: bold, color: ink });
  page.drawText(`Paid ${formatDate(data.paidAt)}`, { x: col2, y, size: 11, font: bold, color: ink });
  y -= 14;
  page.drawText(data.clientEmail, { x: left, y, size: 10, font, color: muted });
  page.drawText(`Method: ${data.method}`, { x: col2, y, size: 10, font, color: muted });

  y -= 30;
  page.drawText(`Invoice ${data.invoiceNumber}`, { x: left, y, size: 11, font: bold, color: ink });
  y -= 14;
  page.drawText(data.invoiceDescription.slice(0, 70), { x: left, y, size: 10, font, color: muted });
  if (data.periodStart && data.periodEnd) {
    y -= 14;
    page.drawText(`Billing period: ${formatDate(data.periodStart)} \u2013 ${formatDate(data.periodEnd)}`, { x: left, y, size: 10, font, color: muted });
  }

  y -= 30;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: faint });
  y -= 20;

  const col = { desc: left, qty: 340, unit: 400, amt: 480 };
  page.drawText("Description", { x: col.desc, y, size: 9, font: bold, color: muted });
  page.drawText("Qty", { x: col.qty, y, size: 9, font: bold, color: muted });
  page.drawText("Unit price", { x: col.unit, y, size: 9, font: bold, color: muted });
  page.drawText("Amount", { x: col.amt, y, size: 9, font: bold, color: muted });
  y -= 10;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: faint });
  y -= 18;

  for (const item of data.items) {
    page.drawText(item.description.slice(0, 48), { x: col.desc, y, size: 10, font, color: ink });
    page.drawText(String(item.quantity), { x: col.qty, y, size: 10, font, color: ink });
    page.drawText(formatNaira(item.unitPrice), { x: col.unit, y, size: 10, font, color: ink });
    page.drawText(formatNaira(item.amount), { x: col.amt, y, size: 10, font, color: ink });
    y -= 20;
  }

  y -= 10;
  page.drawLine({ start: { x: 320, y }, end: { x: right, y }, thickness: 0.5, color: faint });
  y -= 18;
  const row = (label: string, val: string, isTotal = false) => {
    page.drawText(label, { x: 400, y, size: 10, font: isTotal ? bold : font, color: isTotal ? ink : muted });
    page.drawText(val, { x: col.amt, y, size: 10, font: isTotal ? bold : font, color: ink });
    y -= 16;
  };
  row("Subtotal", formatNaira(data.subtotal));
  if (data.tax > 0) row("Tax", formatNaira(data.tax));
  row("Total paid", formatNaira(data.total), true);

  page.drawLine({ start: { x: left, y: 70 }, end: { x: right, y: 70 }, thickness: 0.5, color: faint });
  page.drawText(`${brand.lockup}. This receipt confirms payment received.`, { x: left, y: 50, size: 8, font, color: muted });
  page.drawText(brand.contact.email, { x: left, y: 38, size: 8, font, color: muted });

  return doc.save();
}