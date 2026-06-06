"use server";

import {
  createLearningMapSchema,
  addModuleSchema,
  addCheckpointSchema,
  updateConfidenceSchema,
} from "@/lib/validators/learning-map.schema";
import {
  createLearningMap,
  addModule,
  addCheckpoint,
  updateModuleConfidence,
  deleteModule,
  toggleCheckpoint,
} from "@/lib/services/learning-map.service";
import { revalidatePath } from "next/cache";

function revalidate(workspaceId: string) {
  revalidatePath(`/workspaces/${workspaceId}/learning-map`);
  revalidatePath(`/workspaces/${workspaceId}`);
}

// ── Create map ────────────────────────────────────────────────────────────────

export type ActionState = { error?: string } | null;

export async function createMapAction(
  workspaceId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = createLearningMapSchema.safeParse({
    title: formData.get("title"),
    summary: (formData.get("summary") as string) || undefined,
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const result = await createLearningMap(workspaceId, parsed.data);
  if (!result.ok) return { error: result.error };

  revalidate(workspaceId);
  return null;
}

// ── Add module ────────────────────────────────────────────────────────────────

export async function addModuleAction(
  workspaceId: string,
  mapId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = addModuleSchema.safeParse({
    title: formData.get("title"),
    summary: (formData.get("summary") as string) || undefined,
    difficulty: formData.get("difficulty") || "beginner",
    concepts: (formData.get("concepts") as string) || undefined,
    files: (formData.get("files") as string) || undefined,
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const result = await addModule(mapId, parsed.data);
  if (!result.ok) return { error: result.error };

  revalidate(workspaceId);
  return null;
}

// ── Add checkpoint ────────────────────────────────────────────────────────────

export async function addCheckpointAction(
  workspaceId: string,
  mapId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = addCheckpointSchema.safeParse({
    question: formData.get("question"),
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const result = await addCheckpoint(mapId, parsed.data.question);
  if (!result.ok) return { error: result.error };

  revalidate(workspaceId);
  return null;
}

// ── Update confidence (simple form action, no state needed) ───────────────────

export async function updateConfidenceAction(formData: FormData) {
  const parsed = updateConfidenceSchema.safeParse({
    mapId: formData.get("mapId"),
    moduleId: formData.get("moduleId"),
    confidence: formData.get("confidence"),
  });
  if (!parsed.success) return;

  const { mapId, moduleId, confidence } = parsed.data;
  await updateModuleConfidence(mapId, moduleId, confidence);

  const workspaceId = formData.get("workspaceId") as string;
  revalidate(workspaceId);
}

// ── Delete module ─────────────────────────────────────────────────────────────

export async function deleteModuleAction(formData: FormData) {
  const mapId = formData.get("mapId") as string;
  const moduleId = formData.get("moduleId") as string;
  const workspaceId = formData.get("workspaceId") as string;
  if (!mapId || !moduleId) return;

  await deleteModule(mapId, moduleId);
  revalidate(workspaceId);
}

// ── Toggle checkpoint ─────────────────────────────────────────────────────────

export async function toggleCheckpointAction(formData: FormData) {
  const mapId = formData.get("mapId") as string;
  const checkpointId = formData.get("checkpointId") as string;
  const workspaceId = formData.get("workspaceId") as string;
  if (!mapId || !checkpointId) return;

  await toggleCheckpoint(mapId, checkpointId);
  revalidate(workspaceId);
}
