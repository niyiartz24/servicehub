import { ActionForm } from "@/components/action-form";
import { Checkbox } from "@/components/form-fields";
import { setEmailPreferenceAction } from "@/app/notifications-actions";

export function EmailPreference({ enabled }: { enabled: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-charcoal p-4">
      <h2 className="mb-1 font-medium">Email notifications</h2>
      <p className="mb-3 text-sm text-muted">Renewal reminders, payment receipts and support updates. In-app notifications are always on.</p>
      <ActionForm action={setEmailPreferenceAction} submitLabel="Save">
        <Checkbox label="Send me notification emails" name="emailNotifications" defaultChecked={enabled} />
      </ActionForm>
    </div>
  );
}
