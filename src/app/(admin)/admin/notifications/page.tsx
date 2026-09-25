import { requireAdmin } from "@/lib/auth/session";
import { listNotifications } from "@/server/services/notifications";
import { NotificationList } from "@/components/notification-list";
import { EmailPreference } from "@/components/email-preference";

export const metadata = { title: "Notifications" };

export default async function AdminNotifications() {
  const user = await requireAdmin();
  const items = await listNotifications(user.id);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
      <NotificationList items={items} />
      <EmailPreference enabled={user.emailNotifications} />
    </div>
  );
}
