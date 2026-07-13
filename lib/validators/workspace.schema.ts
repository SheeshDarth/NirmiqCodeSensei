import { z } from "zod";

export const createWorkspaceSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be 100 characters or less"),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional(),
  type: z.enum(["project", "dsa", "exam", "topic"], {
    error: "Workspace type is required",
  }),
  goal: z
    .string()
    .max(300, "Goal must be 300 characters or less")
    .optional(),
  // Set internally by the project analyzer (never via the manual-create form):
  // the absolute path the workspace was imported from. Canonical source for
  // H4 dedup + reanalyze, replacing the old "Imported from:" description marker.
  sourcePath: z
    .string()
    .max(1000, "Source path must be 1000 characters or less")
    .optional(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
