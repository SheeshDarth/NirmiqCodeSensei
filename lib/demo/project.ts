/**
 * The bundled demo project: a tiny Next.js-shaped task tracker, embedded as
 * strings so it ships in every build (file tracing would drop a plain folder).
 * It is written to disk on demand and analysed like any imported project.
 *
 * It deliberately has a clear route → service → store path, a few data
 * structures (Map-backed LRU cache, queue, recursion) and two honest weaknesses
 * (no auth on POST, a placeholder admin token) so every surface has something
 * real to show. None of it is a real credential.
 */

export const DEMO_NAME = "Demo: Task Tracker";
export const DEMO_DIR = "ncs-demo-task-tracker";

/**
 * Hand-written questions about the demo's own code. The offline generator makes
 * generic stack questions; these show what code-grounded explain-back feels like.
 */
export const DEMO_QUESTIONS: {
  question: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  points: string[];
}[] = [
  {
    question:
      "In lib/cache.ts, why does `get` delete and re-insert the key it just read?",
    difficulty: "intermediate",
    points: [
      "a Map remembers insertion order",
      "re-inserting moves the key to most recently used",
      "the oldest key is evicted first when the limit is exceeded",
    ],
  },
  {
    question:
      "What problem does the `seen` set in `isBlocked` (lib/scheduler.ts) prevent?",
    difficulty: "intermediate",
    points: [
      "a dependency cycle between tasks",
      "infinite recursion",
      "a task that was already visited is skipped",
    ],
  },
  {
    question:
      "Walk through how `workOrder` decides which task comes first and what happens to tasks in a cycle.",
    difficulty: "advanced",
    points: [
      "tasks with no unfinished dependencies enter a queue",
      "the lowest priority number is taken first",
      "finishing a task unlocks the tasks waiting on it",
      "tasks stuck in a cycle never get ordered",
    ],
  },
  {
    question:
      "POST /api/tasks has a known weakness. What is it, who could exploit it, and how would you fix it?",
    difficulty: "advanced",
    points: [
      "there is no authentication",
      "anyone who can reach the server can add tasks",
      "require a token or session before calling addTask",
    ],
  },
  {
    question:
      "Why does `listTasksInWorkOrder` use a cache, and when is the cache cleared?",
    difficulty: "beginner",
    points: [
      "the ordering is only recomputed when tasks change",
      "the cache is cleared when a task is added or completed",
    ],
  },
];

export const DEMO_FILES: Record<string, string> = {
  "package.json": JSON.stringify(
    {
      name: "task-tracker-demo",
      private: true,
      description: "A tiny task tracker that orders work by priority and dependencies.",
      dependencies: { next: "16.0.0", react: "19.0.0" },
    },
    null,
    2
  ),

  "README.md": `# Task Tracker (demo)

A tiny API that stores tasks and returns them in the order they should be worked on:
higher priority first, and never before the tasks they depend on.

This is the bundled demo for NirmiqCodeSensei. It is small on purpose — read the
walkthrough, then answer the questions to see how explain-back works.

Known weaknesses (left in on purpose so the review has something to find):
- POST /api/tasks has no authentication.
- lib/services/tasks.ts holds a placeholder admin token.
`,

  "lib/types.ts": `export type Task = {
  id: string;
  title: string;
  priority: number; // 1 (urgent) .. 5 (someday)
  blockedBy: string[]; // ids of tasks that must finish first
  done: boolean;
};

export type NewTask = Omit<Task, "id" | "done">;
`,

  "lib/validate.ts": `import type { NewTask } from "./types";

// Turns untrusted JSON from the request body into a NewTask, or throws.
export function parseNewTask(body: unknown): NewTask {
  if (typeof body !== "object" || body === null) {
    throw new Error("body must be an object");
  }
  const { title, priority = 3, blockedBy = [] } = body as Record<string, unknown>;
  if (typeof title !== "string" || title.trim().length === 0) {
    throw new Error("title is required");
  }
  if (typeof priority !== "number" || priority < 1 || priority > 5) {
    throw new Error("priority must be a number from 1 to 5");
  }
  return {
    title: title.trim(),
    priority,
    blockedBy: Array.isArray(blockedBy) ? blockedBy.map(String) : [],
  };
}
`,

  "lib/store.ts": `import type { NewTask, Task } from "./types";

// In-memory storage: a Map gives O(1) lookup by id. Data resets on restart.
const tasks = new Map<string, Task>();
let counter = 0;

export function insertTask(input: NewTask): Task {
  counter += 1;
  const task: Task = { id: String(counter), done: false, ...input };
  tasks.set(task.id, task);
  return task;
}

export function getTask(id: string): Task | undefined {
  return tasks.get(id);
}

export function allTasks(): Task[] {
  return [...tasks.values()];
}

export function markDone(id: string): Task | undefined {
  const task = tasks.get(id);
  if (task) task.done = true;
  return task;
}
`,

  "lib/cache.ts": `// A tiny LRU cache. A Map remembers insertion order, so the first key is
// always the least recently used: re-inserting on every read keeps it that way.
export class LruCache<V> {
  private entries = new Map<string, V>();

  constructor(private limit: number) {}

  get(key: string): V | undefined {
    const value = this.entries.get(key);
    if (value === undefined) return undefined;
    this.entries.delete(key);
    this.entries.set(key, value); // move to "most recent"
    return value;
  }

  set(key: string, value: V): void {
    this.entries.delete(key);
    this.entries.set(key, value);
    if (this.entries.size > this.limit) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
  }

  clear(): void {
    this.entries.clear();
  }
}
`,

  "lib/scheduler.ts": `import type { Task } from "./types";

// A task is blocked if anything it depends on is unfinished — directly or
// through a chain of dependencies. Recursion follows the chain; "seen" stops
// an accidental dependency cycle from looping forever.
export function isBlocked(
  task: Task,
  byId: Map<string, Task>,
  seen: Set<string> = new Set()
): boolean {
  if (seen.has(task.id)) return false;
  seen.add(task.id);
  return task.blockedBy.some((id) => {
    const dep = byId.get(id);
    return dep !== undefined && (!dep.done || isBlocked(dep, byId, seen));
  });
}

// Kahn's algorithm: repeatedly take tasks with no unfinished dependencies from a
// queue, highest priority (lowest number) first, and unlock the tasks waiting on them.
export function workOrder(tasks: Task[]): Task[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const waiting = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const t of tasks) {
    const deps = t.blockedBy.filter((id) => byId.has(id));
    waiting.set(t.id, deps.length);
    for (const d of deps) dependents.set(d, [...(dependents.get(d) ?? []), t.id]);
  }

  const queue = tasks.filter((t) => waiting.get(t.id) === 0);
  const ordered: Task[] = [];

  while (queue.length > 0) {
    queue.sort((a, b) => a.priority - b.priority);
    const next = queue.shift() as Task;
    ordered.push(next);
    for (const id of dependents.get(next.id) ?? []) {
      const left = (waiting.get(id) ?? 1) - 1;
      waiting.set(id, left);
      if (left === 0) queue.push(byId.get(id) as Task);
    }
  }
  return ordered; // tasks stuck in a cycle never reach zero and are left out
}
`,

  "lib/services/tasks.ts": `import { LruCache } from "../cache";
import { isBlocked, workOrder } from "../scheduler";
import { allTasks, getTask, insertTask, markDone } from "../store";
import { parseNewTask } from "../validate";
import type { Task } from "../types";

// Placeholder only — see README. Anyone who reads this file can use it.
const ADMIN_TOKEN = "demo-admin-token";

// The ordering is recomputed only when tasks change.
const cache = new LruCache<Task[]>(4);

export function addTask(body: unknown): Task {
  const task = insertTask(parseNewTask(body));
  cache.clear();
  return task;
}

export function listTasksInWorkOrder(): Task[] {
  const hit = cache.get("order");
  if (hit) return hit;
  const order = workOrder(allTasks());
  cache.set("order", order);
  return order;
}

export function completeTask(id: string, token: string): Task {
  if (token !== ADMIN_TOKEN) throw new Error("not allowed");
  const task = getTask(id);
  if (!task) throw new Error("no such task");
  const byId = new Map(allTasks().map((t) => [t.id, t]));
  if (isBlocked(task, byId)) throw new Error("finish the tasks it depends on first");
  const done = markDone(id) as Task;
  cache.clear();
  return done;
}
`,

  "app/api/tasks/route.ts": `import { NextResponse } from "next/server";
import { addTask, listTasksInWorkOrder } from "../../../lib/services/tasks";

export async function GET() {
  return NextResponse.json(listTasksInWorkOrder());
}

// No authentication here — anyone who can reach the server can add tasks.
export async function POST(request: Request) {
  try {
    const task = addTask(await request.json());
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
`,

  "app/page.tsx": `import { listTasksInWorkOrder } from "../lib/services/tasks";

export default function Page() {
  const tasks = listTasksInWorkOrder();
  return (
    <main>
      <h1>Up next</h1>
      <ul>
        {tasks.map((task) => (
          <li key={task.id}>
            {task.title} (priority {task.priority})
          </li>
        ))}
      </ul>
    </main>
  );
}
`,
};
