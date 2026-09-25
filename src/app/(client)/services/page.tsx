import Link from "next/link";
import { requireClientUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listClientServices } from "@/server/services/client-portal";
import { listClientDomainRequests } from "@/server/services/domains";
import { requestDomainAction } from "../actions";
import { ActionForm } from "@/components/action-form";
import { Field, Select, TextArea } from "@/components/form-fields";
import { Disclosure } from "@/components/table";
import { PageHeader } from "@/components/detail-list";
import { StatusBadge } from "@/components/status-badge";
import { formatNaira } from "@/config/brand";
import { cycleLabel, formatDate } from "@/lib/format";

export const metadata = { title: "Services" };

export default async function ServicesPage() {
  const user = await requireClientUser();
  const [services, requests, projects] = await Promise.all([
    listClientServices(user.clientId),
    listClientDomainRequests(user.clientId),
    db.project.findMany({ where: { clientId: user.clientId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const byProject = new Map<string, typeof services>();
  for (const s of services) byProject.set(s.project.name, [...(byProject.get(s.project.name) ?? []), s]);

  return (
    <div className="space-y-8">
      <PageHeader title="Services" subtitle="Everything SynthaxLab manages for you, by project." />
      {services.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-8 text-center text-sm text-muted">No services found.</p>
      ) : (
        [...byProject].map(([project, list]) => (
          <section key={project} aria-label={project} className="space-y-3">
            <h2 className="text-sm font-medium text-muted">{project}</h2>
            <ul className="divide-y divide-line rounded-lg border border-line bg-charcoal">
              {list.map((s) => {
                const sub = s.subscriptions[0];
                return (
                  <li key={s.id}>
                    <Link href={`/services/${s.id}`} className="flex flex-col gap-2 p-4 hover:bg-surface sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{s.serviceType.name}</p>
                        <p className="font-medium">{s.name}</p>
                        {sub && <p className="text-sm text-muted">{sub.plan.name} · {formatNaira(sub.price)}{sub.billingCycle !== "ONE_TIME" && `/${cycleLabel[sub.billingCycle]}`}</p>}
                      </div>
                      {sub ? (
                        <div className="sm:text-right">
                          <StatusBadge status={sub.status} />
                          <p className="mt-1 text-xs text-muted">Renews {formatDate(sub.nextBillingDate)}</p>
                        </div>
                      ) : <span className="text-sm text-muted">No active subscription</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <section aria-labelledby="domains" className="space-y-3">
        <h2 id="domains" className="text-lg font-medium">Domain requests</h2>
        <Disclosure summary="Request new domain">
          <ActionForm action={requestDomainAction} submitLabel="Submit request">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Desired domain" name="domain" required placeholder="example.com" />
              <Select label="Duration" name="durationYears" options={[1, 2, 3, 5].map((y) => ({ value: String(y), label: `${y} year${y > 1 ? "s" : ""}` }))} />
              {projects.length > 0 && <Select label="Project (optional)" name="projectId" options={[{ value: "", label: "None" }, ...projects.map((p) => ({ value: p.id, label: p.name }))]} />}
              <Field label="Purpose" name="purpose" />
            </div>
            <TextArea label="Notes (optional)" name="notes" />
            <p className="text-xs text-muted">SynthaxLab checks availability and sends you a price. You only pay once we confirm.</p>
          </ActionForm>
        </Disclosure>
        {requests.length > 0 && (
          <ul className="divide-y divide-line rounded-lg border border-line bg-charcoal text-sm">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <span className="font-medium">{r.domain}</span>
                <span className="text-muted">{r.durationYears} yr{r.durationYears > 1 ? "s" : ""}{r.clientPrice ? ` · ${formatNaira(r.clientPrice)}` : ""}</span>
                <span className="flex items-center gap-3">
                  <StatusBadge status={r.status} />
                  {r.invoiceId && r.status === "PAYMENT_PENDING" && <Link href={`/invoices/${r.invoiceId}`} className="text-accent-soft">Pay</Link>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
