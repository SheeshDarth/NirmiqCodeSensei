import { sqliteTable, text, integer, unique } from "drizzle-orm/sqlite-core";

export const workspaces = sqliteTable("workspaces", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type", {
    enum: ["project", "dsa", "exam", "topic"],
  }).notNull(),
  goal: text("goal"),
  // Absolute path this workspace was imported from (local dir or clone).
  // Canonical replacement for the old load-bearing "Imported from: <path>"
  // description marker — H4 dedup + reanalyzeProject read this directly.
  // Null for manually-created (non-imported) workspaces.
  sourcePath: text("source_path"),
  status: text("status", {
    enum: ["active", "paused", "completed", "archived"],
  })
    .notNull()
    .default("active"),
  progressScore: integer("progress_score").notNull().default(0),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const learningMaps = sqliteTable("learning_maps", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  summary: text("summary"),
  modulesJson: text("modules_json").notNull().default("[]"),
  checkpointsJson: text("checkpoints_json").notNull().default("[]"),
  analysisRaw: text("analysis_raw"),
  // Architecture/workflow graph derived from real code (nodes + edges JSON)
  graphJson: text("graph_json"),
  // Senior Review — multi-lens local static analysis (SeniorReview JSON)
  seniorReviewJson: text("senior_review_json"),
  // Versioned static walkthrough snapshot, or a legacy FeatureTrace array.
  // Import suggestions and possible calls are not observed runtime execution.
  featureTracesJson: text("feature_traces_json"),
  // Source-tree fingerprint (sha256 of path|size|mtime over scanned files) from
  // the analysis run that produced this map. Lets reanalyze skip work when the
  // source is unchanged (MS4 incremental re-analysis). Null for manual maps.
  sourceFingerprint: text("source_fingerprint"),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const explainBackQuestions = sqliteTable("explain_back_questions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  learningMapId: text("learning_map_id").references(() => learningMaps.id, {
    onDelete: "set null",
  }),
  // Soft link to the learning-map module this question belongs to (module key
  // slug, e.g. "risk-map"). Groups the flat question list under modules so the
  // surfaces are one system (#27/#28). Null for manually-added questions.
  moduleKey: text("module_key"),
  question: text("question").notNull(),
  difficulty: text("difficulty", {
    enum: ["beginner", "intermediate", "advanced"],
  })
    .notNull()
    .default("beginner"),
  expectedPointsJson: text("expected_points_json").notNull().default("[]"),
  userAnswer: text("user_answer"),
  score: integer("score"),
  confidence: text("confidence", { enum: ["red", "yellow", "green"] }),
  // Calibration: the learner's prediction, recorded BEFORE key points are
  // revealed. Compared with the measured outcome to show over/under-confidence.
  predictedConfidence: text("predicted_confidence", {
    enum: ["red", "yellow", "green"],
  }),
  // Where the question came from; "diff" = generated from a git diff.
  origin: text("origin", { enum: ["manual", "diff"] }),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const debugLogs = sqliteTable("debug_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  errorMessage: text("error_message"),
  suspectedCause: text("suspected_cause"),
  actualCause: text("actual_cause"),
  fixSummary: text("fix_summary"),
  lessonLearned: text("lesson_learned"),
  preventionRule: text("prevention_rule"),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const dailyLogs = sqliteTable(
  "daily_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    builtToday: text("built_today"),
    understoodToday: text("understood_today"),
    unclearTopics: text("unclear_topics"),
    bugsFaced: text("bugs_faced"),
    nextAction: text("next_action"),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(() => Date.now()),
    updatedAt: integer("updated_at")
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (t) => [unique("daily_logs_workspace_date").on(t.workspaceId, t.date)]
);

export const sessionLogs = sqliteTable("session_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").references(() => workspaces.id, {
    onDelete: "cascade",
  }),
  // The Claude Code tool that fired (Bash, Write, Edit, etc.)
  toolName: text("tool_name").notNull(),
  // Raw command / file path / action (truncated safe copy)
  actionSummary: text("action_summary").notNull(),
  // Plain-English explanation generated by AI
  explanation: text("explanation").notNull(),
  // Risk level assessed by AI
  riskLevel: text("risk_level", { enum: ["safe", "caution", "risky"] })
    .notNull()
    .default("safe"),
  // Optional: what changed as a result
  outcome: text("outcome"),
  // Source: "hook" (real-time) or "manual"
  source: text("source", { enum: ["hook", "manual"] })
    .notNull()
    .default("hook"),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

// Concise, user-facing implementation rationale. This stores decisions and
// alternatives, never private chain-of-thought or hidden model reasoning.
export const decisionRecords = sqliteTable("decision_records", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  chosenOption: text("chosen_option").notNull(),
  alternativesJson: text("alternatives_json").notNull().default("[]"),
  rationale: text("rationale").notNull(),
  acceptedTradeoff: text("accepted_tradeoff"),
  affectedPathsJson: text("affected_paths_json").notNull().default("[]"),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const searchChunks = sqliteTable("search_chunks", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  filePath: text("file_path").notNull(),
  chunkType: text("chunk_type").notNull().default("file"),
  chunkText: text("chunk_text").notNull(),
  layer: text("layer"),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const conceptLinks = sqliteTable("concept_links", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  projectFeature: text("project_feature").notNull(),
  conceptName: text("concept_name").notNull(),
  conceptType: text("concept_type"),
  // Soft link to the learning-map module this concept belongs to (#27/#28).
  // Code-grounded DSA findings → "key-files"; conceptual links → "how-it-works".
  moduleKey: text("module_key"),
  explanation: text("explanation"),
  practiceTask: text("practice_task"),
  // Code-grounded DSA: where the structure/algorithm was found
  sourceFile: text("source_file"),
  codeSnippet: text("code_snippet"),
  astConfidence: text("ast_confidence"),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

// Learner-owned records reference the workspace, never regenerated learning-map IDs.
export const pathwayReviews = sqliteTable("pathway_reviews", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  targetKey: text("target_key").notNull(),
  contentVersion: text("content_version").notNull(),
  reviewedAt: integer("reviewed_at").notNull().$defaultFn(() => Date.now()),
}, t => [unique("pathway_reviews_target_version").on(t.workspaceId, t.targetKey, t.contentVersion)]);

export const pathwayAttempts = sqliteTable("pathway_attempts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  pathwayKey: text("pathway_key").notNull(),
  contentVersion: text("content_version").notNull(),
  snapshotJson: text("snapshot_json").notNull(),
  answer: text("answer").notNull(),
  rubricJson: text("rubric_json").notNull(),
  scoresJson: text("scores_json").notNull(),
  score: integer("score").notNull(),
  ready: integer("ready", { mode: "boolean" }).notNull(),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
});

export const studyNodes = sqliteTable("study_nodes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  anchor: text("anchor").notNull(),
  title: text("title").notNull(),
  origin: text("origin", { enum: ["catalog", "module", "user"] }).notNull(),
  position: integer("position").notNull().default(0),
}, t => [unique("study_nodes_anchor").on(t.workspaceId, t.anchor)]);

export const studyEdges = sqliteTable("study_edges", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  fromId: text("from_id").notNull().references(() => studyNodes.id, { onDelete: "cascade" }),
  toId: text("to_id").notNull().references(() => studyNodes.id, { onDelete: "cascade" }),
  origin: text("origin", { enum: ["catalog", "user"] }).notNull(),
  status: text("status", { enum: ["proposed", "accepted", "rejected"] }).notNull(),
  rationale: text("rationale").notNull(),
  catalogVersion: text("catalog_version"),
}, t => [unique("study_edges_pair").on(t.workspaceId, t.fromId, t.toId)]);
