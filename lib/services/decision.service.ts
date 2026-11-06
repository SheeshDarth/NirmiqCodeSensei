import { db } from "@/lib/db/client";
import { decisionRecords } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import type { ServiceResult } from "@/lib/types";
import type { CreateDecisionInput } from "@/lib/validators/decision.schema";

export type DecisionRecord = typeof decisionRecords.$inferSelect;
export type DecisionRecordView = Omit<
  DecisionRecord,
  "alternativesJson" | "affectedPathsJson"
> & { alternatives: string[]; affectedPaths: string[] };

function toView(row: DecisionRecord): DecisionRecordView {
  const parseList = (json: string): string[] => {
    try {
      const parsed: unknown = JSON.parse(json);
      return Array.isArray(parsed) && parsed.every((value) => typeof value === "string")
        ? parsed
        : [];
    } catch {
      return [];
    }
  };
  const { alternativesJson, affectedPathsJson, ...rest } = row;
  return {
    ...rest,
    alternatives: parseList(alternativesJson),
    affectedPaths: parseList(affectedPathsJson),
  };
}

export async function createDecisionRecord(
  workspaceId: string,
  input: CreateDecisionInput
): Promise<ServiceResult<DecisionRecordView>> {
  try {
    const [row] = await db
      .insert(decisionRecords)
      .values({
        workspaceId,
        title: input.title,
        chosenOption: input.chosenOption,
        alternativesJson: JSON.stringify(input.alternatives),
        rationale: input.rationale,
        acceptedTradeoff: input.acceptedTradeoff || null,
        affectedPathsJson: JSON.stringify(input.affectedPaths),
      })
      .returning();
    return { ok: true, data: toView(row) };
  } catch {
    return { ok: false, error: "Failed to save decision.", code: "DB_ERROR" };
  }
}

export async function getDecisionRecordsByWorkspaceId(
  workspaceId: string
): Promise<ServiceResult<DecisionRecordView[]>> {
  try {
    const rows = await db
      .select()
      .from(decisionRecords)
      .where(eq(decisionRecords.workspaceId, workspaceId))
      .orderBy(desc(decisionRecords.createdAt));
    return { ok: true, data: rows.map(toView) };
  } catch {
    return { ok: false, error: "Failed to load decisions.", code: "DB_ERROR" };
  }
}
