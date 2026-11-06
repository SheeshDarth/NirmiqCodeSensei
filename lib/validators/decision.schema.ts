import { z } from "zod";

export const createDecisionSchema = z.object({
  title: z.string().trim().min(5).max(200),
  chosenOption: z.string().trim().min(2).max(1000),
  alternatives: z.array(z.string().trim().min(2).max(500)).max(8).default([]),
  rationale: z.string().trim().min(10).max(3000),
  acceptedTradeoff: z.string().trim().max(1000).optional(),
  affectedPaths: z.array(z.string().trim().min(1).max(500)).max(30).default([]),
});

export type CreateDecisionInput = z.infer<typeof createDecisionSchema>;
