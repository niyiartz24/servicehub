import { LayoutDashboard, Server, Repeat, FileText, CreditCard, LifeBuoy, Bell, User } from "lucide-react";
import { AppShell, type NavItem } from "@/components/app-shell";
import { requireClientUser } from "@/lib/auth/session";
import { unreadCount } from "@/server/services/notifications";

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/services", label: "Services", icon: Server },
  { href: "/subscriptions", label: "Subscriptions", icon: Repeat },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/support", label: "Support", icon: LifeBuoy },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/account", label: "Account", icon: User },
];

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const user = await requireClientUser(); // server-side authorization
  const unread = await unreadCount(user.id);
  return <AppShell nav={NAV} userLabel={user.fullName ?? user.email} unread={unread}>{children}</AppShell>;
}
