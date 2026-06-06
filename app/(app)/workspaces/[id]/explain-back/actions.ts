"use server";

import {
  createQuestionSchema,
  submitAnswerSchema,
} from "@/lib/validators/explain-back.schema";
import {
  createQuestion,
  submitAnswer,
  deleteQuestion,
} from "@/lib/services/explain-back.service";
import { revalidatePath } from "next/cache";
import { getString, getUUID } from "@/lib/utils/server";

export type ActionState = { error?: string } | null;

function revalidate(workspaceId: string) {
  revalidatePath(`/workspaces/${workspaceId}/explain-back`);
  revalidatePath(`/explain-back`);
}

export async function addQuestionAction(
  workspaceId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = createQuestionSchema.safeParse({
    question: getString(formData, "question"),
    difficulty: getString(formData, "difficulty") ?? "beginner",
    expectedPoints: getString(formData, "expectedPoints") ?? undefined,
    learningMapId: getString(formData, "learningMapId") ?? undefined,
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const result = await createQuestion(workspaceId, parsed.data);
  if (!result.ok) return { error: result.error };

  revalidate(workspaceId);
  return null;
}

export async function submitAnswerAction(
  workspaceId: string,
  questionId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = submitAnswerSchema.safeParse({
    userAnswer: getString(formData, "userAnswer"),
    confidence: getString(formData, "confidence"),
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const result = await submitAnswer(questionId, parsed.data);
  if (!result.ok) return { error: result.error };

  revalidate(workspaceId);
  return null;
}

export async function deleteQuestionAction(formData: FormData) {
  const questionId = getString(formData, "questionId");
  const workspaceId = getUUID(formData, "workspaceId");

  if (!questionId) return;

  await deleteQuestion(questionId);
  if (workspaceId) revalidate(workspaceId);
}
