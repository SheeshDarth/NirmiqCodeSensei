import { z } from "zod";

export const createDebugLogSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title too long"),
  errorMessage: z.string().max(2000).optional(),
  suspectedCause: z.string().max(1000).optional(),
});

export const updateDebugLogSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  errorMessage: z.string().max(2000).optional(),
  suspectedCause: z.string().max(1000).optional(),
  actualCause: z.string().max(1000).optional(),
  fixSummary: z.string().max(2000).optional(),
  lessonLearned: z.string().max(1000).optional(),
  preventionRule: z.string().max(500).optional(),
});

export type CreateDebugLogInput = z.infer<typeof createDebugLogSchema>;
export type UpdateDebugLogInput = z.infer<typeof updateDebugLogSchema>;
