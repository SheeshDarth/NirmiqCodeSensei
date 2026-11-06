import { z } from "zod";

export const createQuestionSchema = z.object({
  question: z
    .string()
    .min(1, "Question is required")
    .max(500, "Max 500 characters"),
  difficulty: z
    .enum(["beginner", "intermediate", "advanced"])
    .default("beginner"),
  expectedPoints: z
    .string()
    .max(2000)
    .optional(), // free-text, stored as JSON string
  learningMapId: z.string().optional(),
  // Set internally by the analyzer (never the manual form): the module slug this
  // question belongs to, for cross-surface grouping (#27/#28).
  moduleKey: z.string().max(60).optional(),
  // Set internally (diff quiz); never from the manual form.
  origin: z.enum(["manual", "diff"]).optional(),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;

export const submitAnswerSchema = z.object({
  userAnswer: z
    .string()
    .min(1, "Write your answer before submitting")
    .max(5000),
  confidence: z.enum(["red", "yellow", "green"]),
  // Prediction made before key points were revealed; stored once, never overwritten.
  predictedConfidence: z.enum(["red", "yellow", "green"]).optional(),
  score: z.coerce.number().int().min(0).max(100).optional(),
});

export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
