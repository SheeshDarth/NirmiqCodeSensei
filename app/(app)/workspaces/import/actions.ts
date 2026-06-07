"use server";

import {
  analyzeProject,
  cloneOrPullRepo,
  resolveProjectPath,
} from "@/lib/services/project-analyzer.service";

export type ImportState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; workspaceId: string; workspaceName: string; questionsCreated: number; conceptsCreated: number };

export async function importProjectAction(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  const raw = (formData.get("projectInput") as string | null)?.trim() ?? "";
  const customName = (formData.get("workspaceName") as string | null)?.trim() || undefined;

  if (!raw) {
    return { status: "error", message: "Please enter a GitHub URL or local folder path." };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      status: "error",
      message:
        "ANTHROPIC_API_KEY is not set in .env.local. Add it and restart the server.",
    };
  }

  // Resolve path (clone if GitHub URL)
  let localPath: string;
  let repoName: string;
  try {
    const resolved = resolveProjectPath(raw);
    localPath = resolved.localPath;
    repoName = resolved.repoName;

    if (resolved.isGitHub) {
      cloneOrPullRepo(raw, localPath);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Strip any file paths from error output for safety
    const safe = msg.replace(/[A-Za-z]:\\[^\s]+|\/[^\s]+/g, "[path]");
    return { status: "error", message: `Could not access project: ${safe.slice(0, 200)}` };
  }

  // Run analysis
  const result = await analyzeProject({
    projectPath: localPath,
    workspaceName: customName ?? repoName,
    anthropicApiKey: apiKey,
  });

  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  return {
    status: "success",
    workspaceId: result.data.workspaceId,
    workspaceName: result.data.workspaceName,
    questionsCreated: result.data.questionsCreated,
    conceptsCreated: result.data.conceptsCreated,
  };
}
