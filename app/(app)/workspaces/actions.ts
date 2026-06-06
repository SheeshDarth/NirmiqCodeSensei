"use server";

import { createWorkspaceSchema } from "@/lib/validators/workspace.schema";
import { createWorkspace } from "@/lib/services/workspace.service";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getString } from "@/lib/utils/server";

export type CreateWorkspaceState = { error?: string } | null;

export async function createWorkspaceAction(
  _prevState: CreateWorkspaceState,
  formData: FormData
): Promise<CreateWorkspaceState> {
  const raw = {
    title: getString(formData, "title"),
    description: getString(formData, "description") ?? undefined,
    type: getString(formData, "type"),
    goal: getString(formData, "goal") ?? undefined,
  };

  const parsed = createWorkspaceSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation error" };
  }

  const result = await createWorkspace(parsed.data);

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/workspaces");
  redirect(`/workspaces/${result.data.id}`);
}
