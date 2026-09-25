import Link from "next/link";
import { requireClientUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { DetailList, PageHeader } from "@/components/detail-list";
import { EmailPreference } from "@/components/email-preference";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireClientUser();
  const client = await db.client.findUniqueOrThrow({ where: { id: user.clientId }, select: { name: true, contactName: true, email: true, phone: true } });
  return (
    <div className="space-y-8">
      <PageHeader title="Account" subtitle="To change company details, contact SynthaxLab." />
      <DetailList items={[
        { label: "Company", value: client.name },
        { label: "Contact", value: client.contactName ?? "—" },
        { label: "Company email", value: client.email },
        { label: "Phone", value: client.phone ?? "—" },
        { label: "Your sign-in email", value: user.email },
      ]} />
      <EmailPreference enabled={user.emailNotifications} />
      <div className="rounded-lg border border-line bg-charcoal p-4">
        <h2 className="font-medium">Password</h2>
        <Link href="/set-password" className="mt-2 inline-block text-sm text-accent-soft hover:underline">Change your password</Link>
      </div>
    </div>
  );
}
