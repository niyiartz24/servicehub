import { requireAdmin } from "@/lib/auth/session";
import { getSetting, type BankDetails, type TaxSettings } from "@/server/services/settings";
import { saveBankAction, saveTaxAction } from "../ops-actions";
import { ActionForm } from "@/components/action-form";
import { Checkbox, Field } from "@/components/form-fields";
import { Section } from "@/components/table";

export const metadata = { title: "Settings" };

export default async function AdminSettings() {
  await requireAdmin("settings:manage");
  const [bank, tax] = await Promise.all([getSetting<BankDetails>("bank"), getSetting<TaxSettings>("tax")]);
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <Section title="Bank transfer details">
        <p className="text-sm text-muted">Shown to clients who choose manual bank transfer. Leave unset to hide that option.</p>
        <div className="max-w-md rounded-lg border border-line bg-charcoal p-4">
          <ActionForm action={saveBankAction} submitLabel="Save bank details">
            <Field label="Bank name" name="bankName" required defaultValue={bank?.bankName ?? ""} />
            <Field label="Account name" name="accountName" required defaultValue={bank?.accountName ?? ""} />
            <Field label="Account number" name="accountNumber" required defaultValue={bank?.accountNumber ?? ""} />
          </ActionForm>
        </div>
      </Section>
      <Section title="Tax">
        <div className="max-w-md rounded-lg border border-line bg-charcoal p-4">
          <ActionForm action={saveTaxAction} submitLabel="Save tax settings">
            <Checkbox label="Add tax to new invoices" name="enabled" defaultChecked={tax?.enabled ?? false} />
            <Field label="Rate (%)" name="ratePercent" type="number" step="0.01" required defaultValue={tax?.ratePercent ?? 0} />
          </ActionForm>
        </div>
      </Section>
      <p className="text-sm text-muted">Company, branding, email, notification and support settings are planned for Phase 7.</p>
    </div>
  );
}
