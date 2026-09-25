import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClientUser } from "@/lib/auth/session";
import { getClientService, listServiceBilling, effectiveInvoiceStatus } from "@/server/services/client-portal";
import { DetailList, PageHeader } from "@/components/detail-list";
import { ActionForm } from "@/components/action-form";
import { computeRenewalPeriod } from "@/server/services/renewals";
import { renewSubscriptionAction } from "../../actions";
import { StatusBadge } from "@/components/status-badge";
import { formatNaira } from "@/config/brand";
import { cycleLabel, formatDate } from "@/lib/format";

const RENEWABLE = new Set(["DOMAIN", "HOSTING", "DATABASE", "MAINTENANCE", "SSL", "EMAIL"]);
const UPGRADABLE = new Set(["HOSTING", "DATABASE", "EMAIL"]);
/** Only these keys of Service.details are shown to clients; everything else stays internal. */
const VISIBLE_DETAILS = ["engine", "version", "region", "registrar", "domain"];
const LABEL_MAX = 60;

const num = (v: unknown) => (v === null || v === undefined ? undefined : Number(v));
const spec = (s: unknown, k: string) => (s && typeof s === "object" ? num((s as Record<string, unknown>)[k]) : undefined);

export default async function ServiceDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ action?: string }>;
}) {
  const user = await requireClientUser();
  const { id } = await params;
  const { action } = await searchParams;
  const svc = await getClientService(user.clientId, id);
  if (!svc) notFound();

  const sub = svc.subscriptions[0];
  const billing = await listServiceBilling(user.clientId, svc.id);
  const renewal = sub ? computeRenewalPeriod({ nextBillingDate: sub.nextBillingDate, billingCycle: sub.billingCycle, customCycleDays: sub.customCycleDays }) : null;
  const used = num(svc.usageUsed), limit = num(svc.usageLimit);
  const pct = used !== undefined && limit ? Math.min(100, Math.round((used / limit) * 100)) : null;
  const storage = spec(sub?.plan.specs, "storageGb");
  const bandwidth = spec(sub?.plan.specs, "bandwidthGb");
  const extra = svc.details && typeof svc.details === "object"
    ? Object.entries(svc.details as Record<string, unknown>).filter(([k, v]) => VISIBLE_DETAILS.includes(k) && (typeof v === "string" || typeof v === "number"))
    : [];

  return (
    <div className="space-y-8">
      <PageHeader back={{ href: "/services", label: "Services" }} title={svc.name}
        subtitle={`${svc.serviceType.name} · ${svc.project.name}`} />

      {action === "upgrade" && (
        <div role="status" className="rounded-lg border border-accent/30 bg-accent/10 p-4 text-sm">
          Upgrades are arranged by SynthaxLab. Send us a support request and we will confirm pricing and timing.{" "}
          <Link href={`/support?service=${svc.id}&topic=upgrade`} className="text-accent-soft underline">Request upgrade</Link>
        </div>
      )}
      {action === "renew" && sub && renewal && (
        <section aria-labelledby="renew" className="rounded-lg border border-accent/30 bg-charcoal p-5">
          <h2 id="renew" className="font-medium">Renew {svc.name}</h2>
          {renewal.end ? (
            <>
              <p className="mt-2 text-sm text-muted">Billing period: {formatDate(renewal.start)} – {formatDate(renewal.end)}</p>
              <p className="text-sm text-muted">Amount: {formatNaira(sub.price)} (tax, if any, is added on the invoice)</p>
              <div className="mt-4">
                <ActionForm action={renewSubscriptionAction} submitLabel="Create renewal invoice">
                  <input type="hidden" name="subscriptionId" value={sub.id} />
                </ActionForm>
              </div>
            </>
          ) : <p className="mt-2 text-sm text-muted">This service needs a billing period set by SynthaxLab before it can be renewed online. Please request support.</p>}
        </section>
      )}

      {!sub ? (
        <p className="rounded-lg border border-dashed border-line p-8 text-center text-sm text-muted">Unable to load subscription for this service.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={sub.status} />
            {RENEWABLE.has(svc.serviceType.code) && <Link href={`/services/${svc.id}?action=renew`} className="rounded-md bg-accent px-4 py-2 text-sm text-white">Renew</Link>}
            {UPGRADABLE.has(svc.serviceType.code) && <Link href={`/services/${svc.id}?action=upgrade`} className="rounded-md border border-line px-4 py-2 text-sm hover:bg-surface">Upgrade</Link>}
            <Link href={`/support?service=${svc.id}`} className="rounded-md border border-line px-4 py-2 text-sm hover:bg-surface">Request support</Link>
          </div>

          <DetailList items={[
            { label: "Service type", value: svc.serviceType.name },
            { label: "Current plan", value: sub.plan.name },
            { label: "Current price", value: `${formatNaira(sub.price)}${sub.billingCycle !== "ONE_TIME" ? `/${cycleLabel[sub.billingCycle]}` : ""}` },
            { label: "Billing cycle", value: sub.billingCycle.replace("_", " ").toLowerCase() },
            { label: "Start date", value: formatDate(sub.startDate) },
            { label: "Next renewal", value: formatDate(sub.nextBillingDate) },
            { label: "Auto-renew", value: sub.autoRenew ? "On" : "Off" },
            ...(svc.provider ? [{ label: "Provider", value: svc.provider }] : []),
            ...(storage ? [{ label: "Storage allocation", value: `${storage} GB` }] : []),
            ...(bandwidth ? [{ label: "Bandwidth", value: `${bandwidth} GB` }] : []),
            ...extra.map(([k, v]) => ({ label: k.charAt(0).toUpperCase() + k.slice(1), value: String(v).slice(0, LABEL_MAX) })),
          ]} />
        </>
      )}

      {pct !== null && used !== undefined && limit !== undefined && (
        <section aria-labelledby="usage" className="rounded-lg border border-line bg-charcoal p-5">
          <h2 id="usage" className="text-sm font-medium">Usage</h2>
          <p className="mt-1 text-sm text-muted">{used} / {limit} {svc.usageUnit ?? ""}</p>
          <div role="progressbar" aria-label="Usage" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
            className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
            <div className={`h-full ${pct >= 90 ? "bg-red-400" : "bg-accent"}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted">Usage figures are updated by SynthaxLab and may not be real-time.</p>
        </section>
      )}

      <section aria-labelledby="billing-history" className="space-y-3">
        <h2 id="billing-history" className="text-lg font-medium">Billing history</h2>
        {billing.length === 0 ? (
          <p className="text-sm text-muted">No invoices yet.</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-charcoal text-sm">
            {billing.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 p-4">
                <Link href={`/invoices/${b.invoice.id}`} className="hover:text-accent-soft">{b.invoice.number}</Link>
                <span>{formatNaira(b.invoice.total)}</span>
                <StatusBadge status={effectiveInvoiceStatus(b.invoice)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
