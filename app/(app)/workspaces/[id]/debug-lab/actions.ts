"use server";

import { revalidatePath } from "next/cache";
import { createDebugLogSchema, updateDebugLogSchema } from "@/lib/validators/debug-log.schema";
import {
  createDebugLog,
  updateDebugLog,
  deleteDebugLog,
} from "@/lib/services/debug-log.service";

export async function createDebugLogAction(
  workspaceId: string,
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const raw = {
    title: formData.get("title"),
    errorMessage: formData.get("errorMessage") || undefined,
    suspectedCause: formData.get("suspectedCause") || undefined,
  };

  const parsed = createDebugLogSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await createDebugLog(workspaceId, parsed.data);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/workspaces/${workspaceId}/debug-lab`);
  return null;
}

export async function updateDebugLogAction(
  workspaceId: string,
  logId: string,
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const raw = {
    actualCause: formData.get("actualCause") || undefined,
    fixSummary: formData.get("fixSummary") || undefined,
    lessonLearned: formData.get("lessonLearned") || undefined,
    preventionRule: formData.get("preventionRule") || undefined,
  };

  const parsed = updateDebugLogSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await updateDebugLog(logId, parsed.data);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/workspaces/${workspaceId}/debug-lab`);
  return null;
}

export async function deleteDebugLogAction(
  workspaceId: string,
  logId: string
): Promise<void> {
  await deleteDebugLog(logId);
  revalidatePath(`/workspaces/${workspaceId}/debug-lab`);
}
