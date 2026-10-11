import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getReceiptData } from "@/server/services/receipts";
import { generateReceiptPdf } from "@/server/receipts/generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(); // redirects to /login if signed out
  const { id } = await params;
  const data = await getReceiptData(id, { role: user.role, clientId: user.clientId });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const pdfBytes = await generateReceiptPdf(data);
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${data.receiptNumber}-Receipt.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
                          }
