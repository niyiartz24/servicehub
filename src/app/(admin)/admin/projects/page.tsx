import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listProjects } from "@/server/services/projects";
import { createProjectAction } from "../actions";
import { ActionForm } from "@/components/action-form";
import { Field, Select } from "@/components/form-fields";
import { Disclosure, Table, Td, Th } from "@/components/table";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Projects" };

export default async function ProjectsPage() {
  await requireAdmin("clients:manage");
  const [projects, clients] = await Promise.all([
    listProjects(),
    db.client.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
      <Disclosure summary="Create project">
        {clients.length === 0 ? <p className="text-sm text-muted">Create a client first.</p> : (
          <ActionForm action={createProjectAction} submitLabel="Create project">
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Client" name="clientId" required options={clients.map((c) => ({ value: c.id, label: c.name }))} />
              <Field label="Project name" name="name" required />
              <Field label="Primary URL" name="primaryUrl" type="url" />
              <Field label="Description" name="description" />
            </div>
          </ActionForm>
        )}
      </Disclosure>
      <Table empty={projects.length === 0 ? "No projects yet." : undefined}>
        <thead><tr><Th>Project</Th><Th>Client</Th><Th>Services</Th><Th>URL</Th><Th>Created</Th></tr></thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id}>
              <Td className="font-medium">{p.name}</Td>
              <Td><Link href={`/admin/clients/${p.client.id}`} className="hover:text-accent-soft">{p.client.name}</Link></Td>
              <Td>{p._count.services}</Td><Td>{p.primaryUrl ?? "—"}</Td><Td>{formatDate(p.createdAt)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
