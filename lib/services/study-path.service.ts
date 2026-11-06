import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { studyNodes, studyEdges, conceptLinks } from "@/lib/db/schema";
import { getLearningMapByWorkspaceId } from "./learning-map.service";
import { studyLevels } from "@/lib/pathways/shared";
import type { ServiceResult } from "@/lib/types";

const CATALOG = [
  { id: "iteration", title: "Iteration", match: /\b(iteration|loops?|higher.order|sorting)\b/i },
  { id: "collections", title: "Collections", match: /array|collection|hash.map|dictionary|\bset\b|sorting|higher.order/i },
  { id: "higher-order", title: "Higher-order array operations", match: /higher.order|map\/filter\/reduce/i },
  { id: "call-stack", title: "Call stack", match: /recursion|call.stack/i },
  { id: "recursion", title: "Recursion", match: /recursion/i },
  { id: "sorting", title: "Sorting", match: /sorting/i },
  { id: "binary-search", title: "Binary search", match: /binary.search/i },
] as const;
const RULES = [
  ["iteration", "higher-order", "Understand iteration before studying transformations over a collection."],
  ["collections", "higher-order", "Array transformations operate on collections."],
  ["call-stack", "recursion", "A recursive call uses the call stack; study its frames and return behavior first."],
  ["sorting", "binary-search", "Binary search relies on a sorted or monotonic search space."],
] as const;

export async function getStudyPath(workspaceId: string) {
  try {
    const [nodes, edges, map, concepts] = await Promise.all([
      db.select().from(studyNodes).where(eq(studyNodes.workspaceId, workspaceId)),
      db.select().from(studyEdges).where(eq(studyEdges.workspaceId, workspaceId)),
      getLearningMapByWorkspaceId(workspaceId),
      db.select().from(conceptLinks).where(eq(conceptLinks.workspaceId, workspaceId)),
    ]);
    const text = [...concepts.map(c => c.conceptName), ...(map.ok ? map.data?.modules.flatMap(m => m.concepts) ?? [] : [])].join("\n");
    const anchors = new Set([...(map.ok ? map.data?.modules.map(m => `module:${m.key}`) ?? [] : []), ...CATALOG.filter(c => c.match.test(text)).map(c => `concept:${c.id}`)]);
    const levels = studyLevels(nodes, edges);
    return { ok: true as const, data: { nodes: nodes.map(n => ({ ...n, available: n.origin === "user" || anchors.has(n.anchor), level: levels?.get(n.id) ?? 0 })), edges } };
  } catch { return { ok: false as const, error: "Unable to load study path.", code: "DB_ERROR" }; }
}

export async function syncStudySuggestions(workspaceId: string): Promise<ServiceResult<true>> {
  const map = await getLearningMapByWorkspaceId(workspaceId);
  if (!map.ok) return map;
  try {
    const concepts = await db.select().from(conceptLinks).where(eq(conceptLinks.workspaceId, workspaceId));
    const text = [...concepts.map(c => c.conceptName), ...(map.data?.modules.flatMap(m => m.concepts) ?? [])].join("\n");
    db.transaction(tx => {
      for (const m of map.data?.modules ?? []) tx.insert(studyNodes).values({ workspaceId, anchor: `module:${m.key}`, title: m.title, origin: "module" }).onConflictDoNothing().run();
      for (const c of CATALOG.filter(c => c.match.test(text))) tx.insert(studyNodes).values({ workspaceId, anchor: `concept:${c.id}`, title: c.title, origin: "catalog" }).onConflictDoNothing().run();
      const nodes = tx.select().from(studyNodes).where(eq(studyNodes.workspaceId, workspaceId)).all();
      for (const [from, to, rationale] of RULES) {
        const a = nodes.find(n => n.anchor === `concept:${from}`); const b = nodes.find(n => n.anchor === `concept:${to}`);
        if (a && b) tx.insert(studyEdges).values({ workspaceId, fromId: a.id, toId: b.id, origin: "catalog", status: "proposed", rationale, catalogVersion: "1" }).onConflictDoNothing().run();
      }
    });
    return { ok: true, data: true };
  } catch { return { ok: false, error: "Unable to prepare suggestions.", code: "DB_ERROR" }; }
}

const nodeSchema = z.object({ title: z.string().trim().min(1).max(100), id: z.string().uuid().optional(), position: z.number().int().min(0).max(10_000).optional() });
export async function saveStudyNode(workspaceId: string, raw: unknown): Promise<ServiceResult<true>> {
  const p = nodeSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Use a title of 1–100 characters and a valid position.", code: "INVALID_INPUT" };
  try {
    if (p.data.id) {
      const result = db.update(studyNodes).set({ title: p.data.title, ...(p.data.position === undefined ? {} : { position: p.data.position }) }).where(and(eq(studyNodes.workspaceId, workspaceId), eq(studyNodes.id, p.data.id))).returning().all();
      if (!result.length) return { ok: false, error: "Study topic not found.", code: "NOT_FOUND" };
    } else await db.insert(studyNodes).values({ workspaceId, title: p.data.title, anchor: `user:${crypto.randomUUID()}`, origin: "user", position: p.data.position ?? 0 });
    return { ok: true, data: true };
  } catch { return { ok: false, error: "Unable to save topic.", code: "DB_ERROR" }; }
}

export async function saveStudyEdge(workspaceId: string, raw: unknown): Promise<ServiceResult<true>> {
  const p = z.object({ fromId: z.string().uuid(), toId: z.string().uuid(), status: z.enum(["accepted", "rejected"]) }).safeParse(raw);
  if (!p.success || p.data.fromId === p.data.toId) return { ok: false, error: "Choose two different topics.", code: "INVALID_INPUT" };
  try {
    return db.transaction(tx => {
      const nodes = tx.select().from(studyNodes).where(eq(studyNodes.workspaceId, workspaceId)).all();
      if (![p.data.fromId, p.data.toId].every(id => nodes.some(n => n.id === id))) return { ok: false as const, error: "Topic not found in this workspace.", code: "NOT_FOUND" };
      const edges = tx.select().from(studyEdges).where(eq(studyEdges.workspaceId, workspaceId)).all();
      const existing = edges.find(e => e.fromId === p.data.fromId && e.toId === p.data.toId);
      const proposed = { ...p.data };
      if (!studyLevels(nodes, [...edges.filter(e => e.id !== existing?.id), proposed])) return { ok: false as const, error: "This prerequisite would create a cycle.", code: "CYCLE" };
      if (existing) tx.update(studyEdges).set({ status: p.data.status }).where(eq(studyEdges.id, existing.id)).run();
      else tx.insert(studyEdges).values({ ...p.data, workspaceId, origin: "user", rationale: "Prerequisite chosen by the learner." }).run();
      return { ok: true as const, data: true as const };
    });
  } catch { return { ok: false, error: "Unable to update prerequisite.", code: "DB_ERROR" }; }
}

export async function deleteStudyNode(workspaceId: string, id: string): Promise<ServiceResult<true>> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Invalid topic.", code: "INVALID_INPUT" };
  try { await db.delete(studyNodes).where(and(eq(studyNodes.workspaceId, workspaceId), eq(studyNodes.id, id))); return { ok: true, data: true }; }
  catch { return { ok: false, error: "Unable to remove topic.", code: "DB_ERROR" }; }
}
