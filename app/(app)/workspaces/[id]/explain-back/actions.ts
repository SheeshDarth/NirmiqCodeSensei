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
    question: formData.get("question"),
    difficulty: formData.get("difficulty") || "beginner",
    expectedPoints: (formData.get("expectedPoints") as string) || undefined,
    learningMapId: (formData.get("learningMapId") as string) || undefined,
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
    userAnswer: formData.get("userAnswer"),
    confidence: formData.get("confidence"),
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const result = await submitAnswer(questionId, parsed.data);
  if (!result.ok) return { error: result.error };

  revalidate(workspaceId);
  return null;
}

export async function deleteQuestionAction(formData: FormData) {
  const questionId = formData.get("questionId") as string;
  const workspaceId = formData.get("workspaceId") as string;
  if (!questionId) return;

  await deleteQuestion(questionId);
  revalidate(workspaceId);
}
