import { notFound } from "next/navigation";
import { requireClientUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatNaira } from "@/config/brand";
import { simulateMockPayment } from "./actions";

export const metadata = { title: "Test payment" };

export default async function MockPayPage({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  if (process.env.NODE_ENV === "production" || process.env.PAYSTACK_SECRET_KEY) notFound();
  const user = await requireClientUser();
  const { reference } = await searchParams;
  const p = reference
    ? await db.payment.findFirst({ where: { reference, clientId: user.clientId, gateway: "mock", status: "PENDING" }, select: { reference: true, amount: true, invoice: { select: { number: true } } } })
    : null;
  if (!p) notFound();

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div role="note" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
        <strong>TEST MODE.</strong> This is a simulated gateway for development. No real payment is taken. Set PAYSTACK_SECRET_KEY to use Paystack.
      </div>
      <div>
        <h1 className="text-xl font-semibold">Simulated payment</h1>
        <p className="mt-1 text-sm text-muted">{p.invoice.number} · {p.reference} · {formatNaira(p.amount)}</p>
      </div>
      <div className="flex gap-3">
        {(["success", "failed"] as const).map((o) => (
          <form key={o} action={simulateMockPayment}>
            <input type="hidden" name="reference" value={p.reference} />
            <input type="hidden" name="outcome" value={o} />
            <button className={`rounded-md px-4 py-2 text-sm ${o === "success" ? "bg-accent text-white" : "border border-line"}`}>
              Simulate {o === "success" ? "successful" : "failed"} payment
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
