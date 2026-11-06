import { getLearningMapByWorkspaceId } from "./learning-map.service";
import { getWorkspaceById } from "./workspace.service";
import { computeSourceFingerprint } from "./code-analyzer.service";
import { existsSync, statSync } from "fs";
import { normalizeSnapshot } from "@/lib/pathways/snapshot";
import type { WalkthroughSnapshot, Freshness } from "@/lib/pathways/shared";
import type { ServiceResult } from "@/lib/types";

export async function getPathwaySnapshot(workspaceId: string): Promise<ServiceResult<WalkthroughSnapshot>> {
  const result = await getLearningMapByWorkspaceId(workspaceId);
  if (!result.ok) return result;
  const map = result.data;
  return { ok: true, data: normalizeSnapshot(map?.featureTracesJson, map?.id ?? workspaceId, map?.sourceFingerprint) };
}

export async function getPathwayFreshness(workspaceId: string, snapshot: WalkthroughSnapshot): Promise<ServiceResult<Freshness>> {
  const ws = await getWorkspaceById(workspaceId);
  const root = ws.ok ? ws.data.sourcePath : null;
  if (!ws.ok) return ws;
  if (!root || !snapshot.sourceFingerprint) return { ok: true, data: "unknown" };
  try {
    if (!existsSync(root) || !statSync(root).isDirectory()) return { ok: true, data: "unavailable" };
    return { ok: true, data: computeSourceFingerprint(root) === snapshot.sourceFingerprint ? "metadata_matches" : "changed" };
  } catch { return { ok: true, data: "unavailable" }; }
}
