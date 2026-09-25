/**
 * DEVELOPMENT / DEMO DATA ONLY.
 * Every client created here has isDemo = true and a "[DEMO]" note so it is easy to find and remove:
 *   DELETE via admin UI, or run: npx tsx prisma/seed.ts --purge
 * Prices below are examples of negotiated pricing, not application rules.
 */
import { PrismaClient, type BillingCycle } from "@prisma/client";

const db = new PrismaClient();

const TYPES = [
  ["DOMAIN", "Domain"], ["HOSTING", "Hosting"], ["DATABASE", "Database"], ["MAINTENANCE", "Maintenance"],
  ["SSL", "SSL"], ["EMAIL", "Email hosting"], ["OTHER", "Other"],
] as const;

const naira = (n: number) => n * 100; // → kobo

const DB_PLANS = [
  { name: "Starter", gb: 5, price: 5000 },
  { name: "Standard", gb: 10, price: 9000 },
  { name: "Professional", gb: 25, price: 15000 },
  { name: "Business", gb: 50, price: 25000 },
];

async function purge() {
  const clients = await db.client.findMany({ where: { isDemo: true }, select: { id: true } });
  const ids = clients.map((c) => c.id);
  await db.invoiceItem.deleteMany({ where: { invoice: { clientId: { in: ids } } } });
  await db.payment.deleteMany({ where: { clientId: { in: ids } } });
  await db.invoice.deleteMany({ where: { clientId: { in: ids } } });
  await db.subscription.deleteMany({ where: { clientId: { in: ids } } });
  await db.supportTicket.deleteMany({ where: { clientId: { in: ids } } });
  await db.domainRequest.deleteMany({ where: { clientId: { in: ids } } });
  await db.service.deleteMany({ where: { project: { clientId: { in: ids } } } });
  await db.project.deleteMany({ where: { clientId: { in: ids } } });
  await db.user.updateMany({ where: { clientId: { in: ids } }, data: { clientId: null } });
  await db.client.deleteMany({ where: { id: { in: ids } } });
  console.log(`Purged ${ids.length} demo clients.`);
}

async function main() {
  if (process.argv.includes("--purge")) return purge();
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) {
    throw new Error("Refusing to seed demo data in production. Pass --force if you really mean it.");
  }

  // Catalogue (real, keep in production)
  const type: Record<string, string> = {};
  for (const [i, [code, name]] of TYPES.entries()) {
    const t = await db.serviceType.upsert({ where: { code }, update: {}, create: { code, name, sortOrder: i } });
    type[code] = t.id;
  }
  const plan: Record<string, { id: string; price: number }> = {};
  for (const p of DB_PLANS) {
    const row = await db.servicePlan.upsert({
      where: { serviceTypeId_name: { serviceTypeId: type.DATABASE!, name: `PostgreSQL ${p.name}` } },
      update: {},
      create: {
        serviceTypeId: type.DATABASE!, name: `PostgreSQL ${p.name}`, defaultPrice: naira(p.price),
        billingCycle: "MONTHLY", specs: { storageGb: p.gb },
      },
    });
    plan[p.name] = { id: row.id, price: row.defaultPrice };
  }
  const hosting = await db.servicePlan.upsert({
    where: { serviceTypeId_name: { serviceTypeId: type.HOSTING!, name: "Standard Hosting" } },
    update: {},
    create: { serviceTypeId: type.HOSTING!, name: "Standard Hosting", defaultPrice: naira(25000), billingCycle: "YEARLY", specs: { storageGb: 20, bandwidthGb: 200 } },
  });
  const domain = await db.servicePlan.upsert({
    where: { serviceTypeId_name: { serviceTypeId: type.DOMAIN!, name: "Domain Management (.ng)" } },
    update: {},
    create: { serviceTypeId: type.DOMAIN!, name: "Domain Management (.ng)", defaultPrice: naira(15000), billingCycle: "YEARLY" },
  });

  // Demo clients
  async function demoClient(name: string, project: string, url: string, dbCustom: number | null, dbRenews: string) {
    const client = await db.client.create({
      data: { name, email: `demo+${project}@example.invalid`, isDemo: true, notes: "[DEMO] Development data. Not real." },
    });
    const proj = await db.project.create({ data: { clientId: client.id, name: project, primaryUrl: url } });
    const svc = await db.service.create({
      data: { projectId: proj.id, serviceTypeId: type.DATABASE!, name: "PostgreSQL Standard", details: { engine: "PostgreSQL" }, usageUsed: 2.4, usageLimit: 10, usageUnit: "GB" },
    });
    const std = plan.Standard!;
    const price = dbCustom ? naira(dbCustom) : std.price;
    await db.subscription.create({
      data: {
        clientId: client.id, serviceId: svc.id, planId: std.id, price, defaultPriceAtSet: std.price,
        isCustomPrice: price !== std.price, billingCycle: "MONTHLY" as BillingCycle, status: "ACTIVE",
        startDate: new Date("2026-01-19"), nextBillingDate: new Date(dbRenews),
      },
    });
    return { client, proj };
  }

  const ravers = await demoClient("Ravers", "ravers.ng", "https://ravers.ng", null, "2026-10-19");
  await demoClient("Ticket9jaPay", "ticket9japay", "", 7500, "2026-10-05");
  await demoClient("Greatness Football Academy", "greatness-fa", "", null, "2026-10-12");

  // Ravers: domain + hosting
  for (const [t, name, p, cycle] of [
    ["DOMAIN", "ravers.ng", domain, "YEARLY"], ["HOSTING", "Standard Hosting", hosting, "YEARLY"],
  ] as const) {
    const svc = await db.service.create({ data: { projectId: ravers.proj.id, serviceTypeId: type[t]!, name } });
    await db.subscription.create({
      data: {
        clientId: ravers.client.id, serviceId: svc.id, planId: p.id, price: p.defaultPrice, defaultPriceAtSet: p.defaultPrice,
        billingCycle: cycle, status: "ACTIVE", startDate: new Date("2026-10-19"), nextBillingDate: new Date("2027-10-19"),
      },
    });
  }
  console.log("Seeded catalogue and 3 DEMO clients (isDemo = true).");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
