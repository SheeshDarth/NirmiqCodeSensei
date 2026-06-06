import { z } from "zod";

export const createLearningMapSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  summary: z.string().max(1000).optional(),
});

export type CreateLearningMapInput = z.infer<typeof createLearningMapSchema>;

export const addModuleSchema = z.object({
  title: z.string().min(1, "Module title is required").max(100),
  summary: z.string().max(500).optional(),
  difficulty: z
    .enum(["beginner", "intermediate", "advanced"])
    .default("beginner"),
  concepts: z.string().optional(), // comma-separated, split server-side
  files: z.string().optional(),    // comma-separated, split server-side
});

export type AddModuleInput = z.infer<typeof addModuleSchema>;

export const addCheckpointSchema = z.object({
  question: z
    .string()
    .min(1, "Checkpoint question is required")
    .max(300),
});

export type AddCheckpointInput = z.infer<typeof addCheckpointSchema>;

export const updateConfidenceSchema = z.object({
  mapId: z.string(),
  moduleId: z.string(),
  confidence: z.enum(["red", "yellow", "green"]),
});
