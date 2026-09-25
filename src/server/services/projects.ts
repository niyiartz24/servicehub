import "server-only";
import { db } from "@/lib/db";
import { UserError } from "@/server/errors";
import type { ProjectInput } from "@/server/validation";
import { audit } from "./audit";

export const listProjects = () =>
  db.project.findMany({
    include: { client: { select: { id: true, name: true } }, _count: { select: { services: true } } },
    orderBy: [{ client: { name: "asc" } }, { name: "asc" }],
  });

export async function createProject(actorId: string, input: ProjectInput) {
  const client = await db.client.findUnique({ where: { id: input.clientId }, select: { isActive: true } });
  if (!client) throw new UserError("Client not found.");
  if (!client.isActive) throw new UserError("Cannot add projects to a deactivated client.");
  return db.$transaction(async (tx) => {
    const p = await tx.project.create({ data: input });
    await audit(tx, { actorId, action: "project.created", entity: "Project", entityId: p.id, metadata: { clientId: p.clientId, name: p.name } });
    return p;
  });
}
