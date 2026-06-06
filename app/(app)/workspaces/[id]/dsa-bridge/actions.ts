"use server";

import { revalidatePath } from "next/cache";
import { createConceptLinkSchema } from "@/lib/validators/concept-link.schema";
import {
  createConceptLink,
  deleteConceptLink,
} from "@/lib/services/concept-link.service";
import { getString } from "@/lib/utils/server";

export async function createConceptLinkAction(
  workspaceId: string,
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const raw = {
    projectFeature: getString(formData, "projectFeature"),
    conceptName: getString(formData, "conceptName"),
    conceptType: getString(formData, "conceptType") ?? undefined,
    explanation: getString(formData, "explanation") ?? undefined,
    practiceTask: getString(formData, "practiceTask") ?? undefined,
  };

  const parsed = createConceptLinkSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await createConceptLink(workspaceId, parsed.data);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/workspaces/${workspaceId}/dsa-bridge`);
  return null;
}

// workspaceId and linkId are bound server-side from DB rows — already trusted.
export async function deleteConceptLinkAction(
  workspaceId: string,
  linkId: string
): Promise<void> {
  await deleteConceptLink(linkId);
  revalidatePath(`/workspaces/${workspaceId}/dsa-bridge`);
}
