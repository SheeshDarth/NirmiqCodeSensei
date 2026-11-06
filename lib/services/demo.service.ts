import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DEMO_DIR, DEMO_FILES, DEMO_NAME, DEMO_QUESTIONS } from "@/lib/demo/project";
import { createQuestion } from "@/lib/services/explain-back.service";
import {
  analyzeProject,
  IMPORTED_PROJECTS_DIR,
} from "@/lib/services/project-analyzer.service";
import { listWorkspaces } from "@/lib/services/workspace.service";
import type { ServiceResult } from "@/lib/types";

/**
 * Create (or find) the bundled demo workspace so a first-time user sees real
 * output without importing their own code. Always offline: the demo never calls
 * an AI service, even when an API key is configured. Idempotent — a second call
 * returns the existing workspace without rewriting files, so its freshness
 * fingerprint is not disturbed.
 */
export async function importDemoProject(
  baseDir: string = IMPORTED_PROJECTS_DIR
): Promise<ServiceResult<{ workspaceId: string; existed: boolean }>> {
  const root = path.resolve(baseDir, DEMO_DIR);

  const existing = await listWorkspaces();
  if (existing.ok) {
    const found = existing.data.find(
      (w) => w.status !== "archived" && w.sourcePath === root
    );
    if (found) return { ok: true, data: { workspaceId: found.id, existed: true } };
  }

  try {
    for (const [relative, content] of Object.entries(DEMO_FILES)) {
      const file = path.join(root, relative);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, content, "utf8");
    }
  } catch {
    return {
      ok: false,
      error: "Could not write the demo project to disk",
      code: "FS_ERROR",
    };
  }

  const result = await analyzeProject({ projectPath: root, workspaceName: DEMO_NAME });
  if (!result.ok) return result;

  // Curated, code-grounded questions (best effort — the analysis already succeeded).
  const workspaceId = result.data.workspaceId;
  for (const item of DEMO_QUESTIONS) {
    await createQuestion(workspaceId, {
      question: item.question,
      difficulty: item.difficulty,
      expectedPoints: item.points.join("\n"),
    });
  }
  return { ok: true, data: { workspaceId, existed: false } };
}
