import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { LogOut } from "lucide-react";
import { brand } from "@/config/brand";
import { logout } from "@/lib/auth/actions";

export type NavItem = { href: string; label: string; icon: LucideIcon };

type Props = {
  nav: NavItem[];
  userLabel: string;
  areaLabel?: string;
  unread?: number;
  children: React.ReactNode;
};

/** Sidebar on lg+, horizontally scrolling tab bar below lg. Server component, no JS needed. */
export function AppShell({ nav, userLabel, areaLabel, unread = 0, children }: Props) {
  const badge = (href: string) =>
    unread > 0 && href.endsWith("/notifications") ? (
      <span aria-label={`${unread} unread`} className="ml-auto rounded-full bg-accent px-1.5 text-[11px] font-medium text-white">{unread > 99 ? "99+" : unread}</span>
    ) : null;
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="hidden border-r border-line bg-charcoal lg:flex lg:flex-col">
        <div className="px-6 py-6">
          <p className="text-lg font-semibold tracking-tight">{brand.name}</p>
          <p className="text-xs text-muted">by {brand.parent}</p>
          {areaLabel && <p className="mt-3 text-[11px] font-medium uppercase tracking-wider text-accent-soft">{areaLabel}</p>}
        </div>
        <nav aria-label="Primary" className="flex-1 space-y-1 px-3">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted transition hover:bg-surface hover:text-ink">
              <Icon className="h-4 w-4" aria-hidden /> {label}{badge(href)}
            </Link>
          ))}
        </nav>
        <div className="border-t border-line p-4">
          <p className="truncate text-sm">{userLabel}</p>
          <form action={logout}>
            <button className="mt-2 flex items-center gap-2 text-xs text-muted hover:text-ink">
              <LogOut className="h-3.5 w-3.5" aria-hidden /> Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="border-b border-line bg-charcoal lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="font-semibold">{brand.name}</p>
            <form action={logout}>
              <button className="text-xs text-muted hover:text-ink" aria-label="Sign out"><LogOut className="h-4 w-4" /></button>
            </form>
          </div>
          <nav aria-label="Primary" className="flex gap-1 overflow-x-auto px-3 pb-2">
            {nav.map(({ href, label }) => (
              <Link key={href} href={href} className="flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted hover:bg-surface hover:text-ink">
                {label}{badge(href)}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
