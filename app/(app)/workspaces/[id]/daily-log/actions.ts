"use server";

import { revalidatePath } from "next/cache";
import { createDailyLogSchema } from "@/lib/validators/daily-log.schema";
import { createDailyLog, deleteDailyLog } from "@/lib/services/daily-log.service";
import { getString } from "@/lib/utils/server";

export async function createDailyLogAction(
  workspaceId: string,
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const raw = {
    date: getString(formData, "date"),
    builtToday: getString(formData, "builtToday") ?? undefined,
    understoodToday: getString(formData, "understoodToday") ?? undefined,
    unclearTopics: getString(formData, "unclearTopics") ?? undefined,
    bugsFaced: getString(formData, "bugsFaced") ?? undefined,
    nextAction: getString(formData, "nextAction") ?? undefined,
  };

  const parsed = createDailyLogSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await createDailyLog(workspaceId, parsed.data);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/workspaces/${workspaceId}/daily-log`);
  return null;
}

// workspaceId and logId are bound server-side from DB rows — already trusted.
export async function deleteDailyLogAction(
  workspaceId: string,
  logId: string
): Promise<void> {
  await deleteDailyLog(logId);
  revalidatePath(`/workspaces/${workspaceId}/daily-log`);
}
