import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

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
  conceptsJson: text("concepts_json").notNull().default("[]"),
  checkpointsJson: text("checkpoints_json").notNull().default("[]"),
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

export const dailyLogs = sqliteTable("daily_logs", {
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
  explanation: text("explanation"),
  practiceTask: text("practice_task"),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});
