import { LayoutDashboard, Users, FolderKanban, Server, Repeat, CreditCard, FileText, Globe, Layers, LifeBuoy, Bell, Settings } from "lucide-react";
import { AppShell, type NavItem } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth/session";
import { unreadCount } from "@/server/services/notifications";

const NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/services", label: "Services", icon: Server },
  { href: "/admin/plans", label: "Plans", icon: Layers },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: Repeat },
  { href: "/admin/invoices", label: "Invoices", icon: FileText },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/domains", label: "Domain requests", icon: Globe },
  { href: "/admin/support", label: "Support", icon: LifeBuoy },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const unread = await unreadCount(user.id);
  return <AppShell nav={NAV} userLabel={user.fullName ?? user.email} areaLabel="Admin" unread={unread}>{children}</AppShell>;
}
