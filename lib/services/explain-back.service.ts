import { db } from "@/lib/db/client";
import { recomputeWorkspaceProgress } from "@/lib/services/workspace.service";
import { explainBackQuestions } from "@/lib/db/schema";
import { eq, desc, and, or, isNull } from "drizzle-orm";
import type { ServiceResult } from "@/lib/types";
import type {
  CreateQuestionInput,
  SubmitAnswerInput,
} from "@/lib/validators/explain-back.schema";
import {
  parseExpectedPoints,
  keyPointCoverage,
  coverageLevel,
  classifyCalibration,
  isDueForReview,
  type Calibration,
  type Level,
} from "@/lib/utils";

export type Question = typeof explainBackQuestions.$inferSelect;

export type CalibrationSummary = {
  /** Questions that have both a prediction and an outcome. */
  measured: number;
  overconfident: number;
  aligned: number;
  underconfident: number;
  /** aligned / measured, 0-100; null until something is measured. */
  accuracy: number | null;
};

/** Outcome level: key-point coverage when available, else the post-reveal self-grade. */
export function actualLevel(q: Question): Level | null {
  if (q.score != null) return coverageLevel(q.score);
  return q.confidence ?? null;
}

/** Answered questions whose review interval (by last outcome) has elapsed. */
export function dueQuestions(questions: Question[], now: number = Date.now()): Question[] {
  return questions.filter((q) => isDueForReview(q, actualLevel(q), now));
}

export function calibrationOf(q: Question): Calibration | null {
  const actual = actualLevel(q);
  if (!q.predictedConfidence || !actual) return null;
  return classifyCalibration(q.predictedConfidence, actual);
}

export async function getCalibration(
  workspaceId: string
): Promise<ServiceResult<CalibrationSummary>> {
  const result = await getQuestionsByWorkspaceId(workspaceId);
  if (!result.ok) return result;
  const s: CalibrationSummary = {
    measured: 0,
    overconfident: 0,
    aligned: 0,
    underconfident: 0,
    accuracy: null,
  };
  for (const q of result.data) {
    const c = calibrationOf(q);
    if (!c) continue;
    s.measured++;
    s[c]++;
  }
  if (s.measured > 0) s.accuracy = Math.round((s.aligned / s.measured) * 100);
  return { ok: true, data: s };
}

export async function createQuestion(
  workspaceId: string,
  input: CreateQuestionInput
): Promise<ServiceResult<Question>> {
  try {
    const expectedPointsJson = input.expectedPoints
      ? JSON.stringify(
          input.expectedPoints
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        )
      : "[]";

    const [q] = await db
      .insert(explainBackQuestions)
      .values({
        workspaceId,
        learningMapId: input.learningMapId ?? null,
        moduleKey: input.moduleKey ?? null,
        question: input.question,
        difficulty: input.difficulty,
        expectedPointsJson,
        origin: input.origin ?? "manual",
      })
      .returning();
    return { ok: true, data: q };
  } catch {
    return { ok: false, error: "Failed to create question", code: "DB_ERROR" };
  }
}

export async function getQuestionsByWorkspaceId(
  workspaceId: string
): Promise<ServiceResult<Question[]>> {
  try {
    const questions = await db
      .select()
      .from(explainBackQuestions)
      .where(eq(explainBackQuestions.workspaceId, workspaceId))
      .orderBy(desc(explainBackQuestions.createdAt));
    return { ok: true, data: questions };
  } catch {
    return { ok: false, error: "Failed to fetch questions", code: "DB_ERROR" };
  }
}

export async function getWeakQuestions(
  workspaceId: string
): Promise<ServiceResult<Question[]>> {
  try {
    const questions = await db
      .select()
      .from(explainBackQuestions)
      .where(
        and(
          eq(explainBackQuestions.workspaceId, workspaceId),
          or(
            eq(explainBackQuestions.confidence, "red"),
            isNull(explainBackQuestions.confidence)
          )
        )
      )
      .orderBy(desc(explainBackQuestions.createdAt));
    return { ok: true, data: questions };
  } catch {
    return {
      ok: false,
      error: "Failed to fetch weak questions",
      code: "DB_ERROR",
    };
  }
}

export async function getAllQuestions(): Promise<ServiceResult<Question[]>> {
  try {
    const questions = await db
      .select()
      .from(explainBackQuestions)
      .orderBy(desc(explainBackQuestions.createdAt))
      .limit(50);
    return { ok: true, data: questions };
  } catch {
    return { ok: false, error: "Failed to fetch questions", code: "DB_ERROR" };
  }
}

export async function submitAnswer(
  questionId: string,
  input: SubmitAnswerInput
): Promise<ServiceResult<Question>> {
  try {
    const [existing] = await db
      .select()
      .from(explainBackQuestions)
      .where(eq(explainBackQuestions.id, questionId));
    if (!existing)
      return { ok: false, error: "Question not found", code: "NOT_FOUND" };

    // Heuristic key-point coverage is the measured outcome; a caller-supplied
    // score is only used when the question has no key points.
    const coverage = keyPointCoverage(
      input.userAnswer,
      parseExpectedPoints(existing.expectedPointsJson)
    );

    const [updated] = await db
      .update(explainBackQuestions)
      .set({
        userAnswer: input.userAnswer,
        confidence: input.confidence,
        score: coverage ?? input.score ?? null,
        // A prediction is recorded once; re-answering must not rewrite history.
        predictedConfidence:
          existing.predictedConfidence ?? input.predictedConfidence ?? null,
        updatedAt: Date.now(),
      })
      .where(eq(explainBackQuestions.id, questionId))
      .returning();
    if (!updated)
      return { ok: false, error: "Question not found", code: "NOT_FOUND" };

    // Answering questions now moves workspace progress too (REVIEW-008, #26)
    await recomputeWorkspaceProgress(updated.workspaceId);

    return { ok: true, data: updated };
  } catch {
    return {
      ok: false,
      error: "Failed to submit answer",
      code: "DB_ERROR",
    };
  }
}

export async function deleteQuestion(
  questionId: string
): Promise<ServiceResult<true>> {
  try {
    await db
      .delete(explainBackQuestions)
      .where(eq(explainBackQuestions.id, questionId));
    return { ok: true, data: true };
  } catch {
    return { ok: false, error: "Failed to delete question", code: "DB_ERROR" };
  }
}
