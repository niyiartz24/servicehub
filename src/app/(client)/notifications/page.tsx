import { requireClientUser } from "@/lib/auth/session";
import { listNotifications } from "@/server/services/notifications";
import { NotificationList } from "@/components/notification-list";
import { PageHeader } from "@/components/detail-list";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireClientUser();
  const items = await listNotifications(user.id);
  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" />
      <NotificationList items={items} />
    </div>
  );
}
