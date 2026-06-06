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
import { getString, getUUID } from "@/lib/utils/server";

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
    title: getString(formData, "title"),
    summary: getString(formData, "summary") ?? undefined,
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
    title: getString(formData, "title"),
    summary: getString(formData, "summary") ?? undefined,
    difficulty: getString(formData, "difficulty") ?? "beginner",
    concepts: getString(formData, "concepts") ?? undefined,
    files: getString(formData, "files") ?? undefined,
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
    question: getString(formData, "question"),
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const result = await addCheckpoint(mapId, parsed.data.question);
  if (!result.ok) return { error: result.error };

  revalidate(workspaceId);
  return null;
}

// ── Update confidence ─────────────────────────────────────────────────────────

export async function updateConfidenceAction(formData: FormData) {
  const parsed = updateConfidenceSchema.safeParse({
    mapId: getString(formData, "mapId"),
    moduleId: getString(formData, "moduleId"),
    confidence: getString(formData, "confidence"),
  });
  if (!parsed.success) return;

  const { mapId, moduleId, confidence } = parsed.data;
  await updateModuleConfidence(mapId, moduleId, confidence);

  // workspaceId here is for cache revalidation only, not data access.
  // Still validate it's a UUID to prevent cache-path manipulation.
  const workspaceId = getUUID(formData, "workspaceId");
  if (workspaceId) revalidate(workspaceId);
}

// ── Delete module ─────────────────────────────────────────────────────────────

export async function deleteModuleAction(formData: FormData) {
  const mapId = getString(formData, "mapId");
  const moduleId = getString(formData, "moduleId");
  const workspaceId = getUUID(formData, "workspaceId");

  if (!mapId || !moduleId) return;

  await deleteModule(mapId, moduleId);
  if (workspaceId) revalidate(workspaceId);
}

// ── Toggle checkpoint ─────────────────────────────────────────────────────────

export async function toggleCheckpointAction(formData: FormData) {
  const mapId = getString(formData, "mapId");
  const checkpointId = getString(formData, "checkpointId");
  const workspaceId = getUUID(formData, "workspaceId");

  if (!mapId || !checkpointId) return;

  await toggleCheckpoint(mapId, checkpointId);
  if (workspaceId) revalidate(workspaceId);
}
