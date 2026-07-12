import { getAllLearningMaps } from "@/lib/services/learning-map.service";
import { listWorkspaces } from "@/lib/services/workspace.service";
import { Map, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LearningMapIndexPage() {
  const [mapsResult, workspacesResult] = await Promise.all([
    getAllLearningMaps(),
    listWorkspaces(),
  ]);

  const maps = mapsResult.ok ? mapsResult.data : [];
  const workspaceMap = Object.fromEntries(
    (workspacesResult.ok ? workspacesResult.data : []).map((w) => [w.id, w])
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Learning Map</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          The technical structure of every project you&apos;ve imported — modules,
          risk areas, and understanding checkpoints.
        </p>
      </div>

      {maps.length === 0 ? (
        <div className="bg-[#0d1117] border border-zinc-800 border-dashed rounded-lg p-10 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10 mb-4">
            <Map size={20} className="text-violet-400" />
          </div>
          <h2 className="text-sm font-semibold text-zinc-100 mb-1">
            No learning maps yet
          </h2>
          <p className="text-xs text-zinc-500 mb-5 max-w-sm mx-auto">
            Import a project and NirmiqCodeSensei generates a full learning map
            automatically — what it does, how it works, and what could break.
          </p>
          <Link
            href="/workspaces/import"
            className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors"
          >
            <Sparkles size={13} />
            Import a Project
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {maps.map((map) => {
            const ws = workspaceMap[map.workspaceId];
            const total = map.checkpoints.length;
            const done = map.checkpoints.filter((c) => c.completed).length;
            return (
              <Link
                key={map.id}
                href={`/workspaces/${map.workspaceId}/learning-map`}
                className="flex items-start justify-between gap-3 bg-[#0d1117] border border-zinc-800 hover:border-zinc-700 rounded-lg p-4 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 font-medium group-hover:text-white">
                    {map.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {ws && (
                      <span className="text-xs text-zinc-600">{ws.title}</span>
                    )}
                    <span className="text-xs text-zinc-600">
                      {map.modules.length} module
                      {map.modules.length !== 1 ? "s" : ""}
                    </span>
                    {total > 0 && (
                      <span className="text-xs text-zinc-600">
                        · {done}/{total} checkpoints
                      </span>
                    )}
                  </div>
                </div>
                <ArrowRight
                  size={14}
                  className="text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0 mt-0.5"
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
