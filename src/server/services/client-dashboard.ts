import "server-only";
import type { BillingCycle, SubscriptionStatus } from "@prisma/client";
import { db } from "@/lib/db";

export type ServiceCard = {
  subscriptionId: string;
  serviceId: string;
  typeCode: string;
  typeName: string;
  serviceName: string;
  planName: string;
  projectName: string;
  price: number; // kobo
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  nextBillingDate: Date | null;
};

export type ClientDashboard = {
  clientName: string;
  activeServices: number;
  upcomingPayments: number;
  amountDue: number; // kobo
  openTickets: number;
  services: ServiceCard[];
};

/** Every query is scoped by clientId, which comes from the verified session, never from the URL. */
export async function getClientDashboard(clientId: string): Promise<ClientDashboard> {
  const [client, subs, dueInvoices, openTickets] = await Promise.all([
    db.client.findUniqueOrThrow({ where: { id: clientId }, select: { name: true } }),
    db.subscription.findMany({
      where: { clientId, status: { not: "CANCELLED" } },
      include: { plan: true, service: { include: { serviceType: true, project: true } } },
      orderBy: [{ nextBillingDate: "asc" }],
    }),
    db.invoice.aggregate({
      where: { clientId, status: { in: ["PENDING", "OVERDUE"] } },
      _sum: { total: true },
      _count: true,
    }),
    db.supportTicket.count({ where: { clientId, status: { notIn: ["RESOLVED", "CLOSED"] } } }),
  ]);

  return {
    clientName: client.name,
    activeServices: subs.filter((s) => s.status === "ACTIVE" || s.status === "EXPIRING").length,
    upcomingPayments: dueInvoices._count,
    amountDue: dueInvoices._sum.total ?? 0,
    openTickets,
    services: subs.map((s) => ({
      subscriptionId: s.id,
      serviceId: s.serviceId,
      typeCode: s.service.serviceType.code,
      typeName: s.service.serviceType.name,
      serviceName: s.service.name,
      planName: s.plan.name,
      projectName: s.service.project.name,
      price: s.price, // client's actual price, never plan.defaultPrice
      billingCycle: s.billingCycle,
      status: s.status,
      nextBillingDate: s.nextBillingDate,
    })),
  };
}
