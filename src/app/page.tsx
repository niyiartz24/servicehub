import Link from "next/link";
import { ArrowRight, CreditCard, Database, FileText, Globe, LifeBuoy, Lock, Mail, RefreshCw, ScrollText, Server, ShieldCheck, Wrench } from "lucide-react";
import { brand } from "@/config/brand";

const CONTACT = `mailto:${brand.contact.email}`;

const STEPS = [
  { n: "01", title: "Sign in", body: "Use the account SynthaxLab set up for you. Everything on your project is in one place." },
  { n: "02", title: "See what you have", body: "Every domain, hosting plan and database with its status and next renewal date." },
  { n: "03", title: "Renew or request", body: "Pay a renewal, ask for an upgrade or a new domain, or open a support request." },
];

const SERVICES = [
  { icon: Globe, name: "Domains", body: "Registration requests and renewals." },
  { icon: Server, name: "Hosting", body: "Plans, renewals and upgrades." },
  { icon: Database, name: "Databases", body: "Managed databases with usage information." },
  { icon: Wrench, name: "Maintenance", body: "Ongoing website and app maintenance." },
  { icon: ShieldCheck, name: "SSL", body: "Certificates kept current." },
  { icon: Mail, name: "Email hosting", body: "Business email on your domain." },
];

const FEATURES = [
  { icon: CreditCard, title: "Simple billing", body: "Clear invoices and a full payment history. Pay by card or bank transfer, and see exactly what each charge covers." },
  { icon: RefreshCw, title: "Service renewals", body: "Reminders before anything expires, and one click to create a renewal invoice at the price agreed with SynthaxLab." },
  { icon: LifeBuoy, title: "Support", body: "Raise a request against a specific service and follow the conversation, instead of chasing messages." },
];

const TRUST = [
  { icon: Lock, title: "Your data stays yours", body: "Each client can only ever see their own services, invoices and payments." },
  { icon: ShieldCheck, title: "Payments confirmed by the server", body: "A payment only counts once our server has verified it with the payment provider." },
  { icon: ScrollText, title: "A trail for every change", body: "Important actions on your account are recorded so they can be reviewed." },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
          <p className="font-semibold tracking-tight">{brand.name} <span className="hidden text-xs font-normal text-muted sm:inline">by {brand.parent}</span></p>
          <Link href="/login" className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-surface">Client login</Link>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-8 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{brand.tagline}</h1>
            <p className="mt-5 max-w-lg text-lg text-muted">{brand.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white">Access Client Portal <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              <a href={CONTACT} className="rounded-md border border-line px-5 py-2.5 text-sm hover:bg-surface">Contact SynthaxLab</a>
            </div>
            <p className="mt-4 text-sm text-muted">New here? <Link href="/find-project" className="text-accent-soft hover:underline">Find your project</Link></p>
          </div>

          <figure aria-label="Illustrative example of the client dashboard" className="rounded-xl border border-line bg-charcoal p-5">
            <div className="grid grid-cols-2 gap-3">
              {[["Active services", "3"], ["Amount due", "₦0"]].map(([l, v]) => (
                <div key={l} className="rounded-lg border border-line bg-navy p-4"><p className="text-[11px] uppercase tracking-wider text-muted">{l}</p><p className="mt-1 text-xl font-semibold">{v}</p></div>
              ))}
            </div>
            <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-navy text-sm">
              {[["Domain", "example.com"], ["Hosting", "Standard Hosting"], ["Database", "PostgreSQL Standard"]].map(([t, n]) => (
                <li key={t} className="flex items-center justify-between p-3"><span><span className="block text-[11px] uppercase tracking-wider text-muted">{t}</span>{n}</span><span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300 ring-1 ring-inset ring-emerald-500/30">ACTIVE</span></li>
              ))}
            </ul>
            <figcaption className="mt-3 text-xs text-muted">Illustrative example with sample data.</figcaption>
          </figure>
        </section>

        <section aria-labelledby="how" className="border-t border-line bg-charcoal/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
            <h2 id="how" className="text-2xl font-semibold tracking-tight">How ServiceHub works</h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n} className="rounded-lg border border-line bg-charcoal p-6">
                  <p className="text-sm text-accent-soft">{s.n}</p><h3 className="mt-2 font-medium">{s.title}</h3><p className="mt-2 text-sm text-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="services" className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
          <h2 id="services" className="text-2xl font-semibold tracking-tight">Managed services</h2>
          <p className="mt-2 max-w-xl text-muted">The recurring services SynthaxLab runs for your website or app, listed and priced per project.</p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map(({ icon: Icon, name, body }) => (
              <li key={name} className="flex gap-4 rounded-lg border border-line bg-charcoal p-5">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent-soft" aria-hidden />
                <div><h3 className="font-medium">{name}</h3><p className="mt-1 text-sm text-muted">{body}</p></div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Billing, renewals and support" className="border-t border-line bg-charcoal/40">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:px-8 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title}><Icon className="h-5 w-5 text-accent-soft" aria-hidden /><h3 className="mt-3 font-medium">{title}</h3><p className="mt-2 text-sm text-muted">{body}</p></div>
            ))}
          </div>
        </section>

        <section aria-labelledby="trust" className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
          <h2 id="trust" className="text-2xl font-semibold tracking-tight">Built to be trusted with billing</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {TRUST.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-lg border border-line bg-charcoal p-6"><Icon className="h-5 w-5 text-accent-soft" aria-hidden /><h3 className="mt-3 font-medium">{title}</h3><p className="mt-2 text-sm text-muted">{body}</p></div>
            ))}
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-8 md:flex-row md:items-center">
            <div>
              <p className="flex items-center gap-2 text-sm text-accent-soft"><FileText className="h-4 w-4" aria-hidden /> Powered by {brand.parent}</p>
              <p className="mt-2 max-w-xl text-muted">{brand.parent} builds and manages websites and applications. ServiceHub is where its clients manage the services behind them.</p>
            </div>
            <Link href="/login" className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white">Access Client Portal</Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:px-8">
          <p>© {new Date().getFullYear()} {brand.parent}. {brand.lockup}.</p>
          <nav aria-label="Footer" className="flex gap-4"><Link href="/login" className="hover:text-ink">Client login</Link><Link href="/find-project" className="hover:text-ink">Find your project</Link><a href={CONTACT} className="hover:text-ink">Contact</a></nav>
        </div>
      </footer>
    </div>
  );
}
