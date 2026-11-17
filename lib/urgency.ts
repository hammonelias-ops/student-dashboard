import type { ClassRow, TaskRow } from "@/lib/tasks";

// Top 3 scoring, based on Taskwarrior's urgency formula (docs/PLAN.md → "Urgency score").
// All weights live here so they're easy to tune.
export const URGENCY = {
  overdue: 12,
  dueSoon: 12, // × max(dueSoonFloor, 1 − days_until_due / dueSoonDays)
  dueSoonDays: 14,
  dueSoonFloor: 0.2,
  missing: 10,
  big: 6,
  testOrProject: 5,
  classwork: 2,
  belowGoal: 4,
} as const;

export type Scored = { task: TaskRow; score: number; reasons: string[] };

const DAY_MS = 24 * 60 * 60 * 1000;

export function scoreTask(task: TaskRow, cls: ClassRow | undefined, now: Date): Scored {
  const reasons: string[] = [];
  let score = 0;

  const daysUntilDue = (new Date(task.due_at).getTime() - now.getTime()) / DAY_MS;
  if (daysUntilDue < 0) {
    score += URGENCY.overdue;
    reasons.push("overdue");
  } else {
    score += URGENCY.dueSoon * Math.max(URGENCY.dueSoonFloor, 1 - daysUntilDue / URGENCY.dueSoonDays);
  }

  if (task.missing) {
    score += URGENCY.missing;
    reasons.push("missing in gradebook");
  }
  // No chips for these: the row already shows the "Big" tag and the type
  if (task.priority === "high") score += URGENCY.big;
  if (task.kind === "test" || task.kind === "project") {
    score += URGENCY.testOrProject;
  } else if (task.kind === "classwork") {
    score += URGENCY.classwork;
  }

  if (cls?.grade != null && Number(cls.grade) < Number(cls.goal)) {
    score += URGENCY.belowGoal;
    reasons.push(`${cls.code ?? cls.name} at ${Number(cls.grade)}%, goal ${Number(cls.goal)}%`);
  }

  return { task, score, reasons };
}

// Highest score first; ties go to whatever is due first
export function rankTasks(tasks: TaskRow[], classById: Map<string, ClassRow>, now: Date) {
  return tasks
    .filter((t) => !t.done)
    .map((t) => scoreTask(t, classById.get(t.class_id), now))
    .sort((a, b) => b.score - a.score || a.task.due_at.localeCompare(b.task.due_at));
}

// Claude's Top 3 from the daily gradebook check (Stage 10), stored in daily_pick.top3:
// [{ "task_id": "...", "reason": "Missing since Monday, worth 50 points" }, ...]
export type DailyPick = { task_id: string; reason?: string }[];

export function parseDailyPick(value: unknown): DailyPick | null {
  if (!Array.isArray(value)) return null;
  const picks = value.filter(
    (p): p is { task_id: string; reason?: string } =>
      typeof p === "object" && p !== null && typeof (p as { task_id?: unknown }).task_id === "string"
  );
  return picks.length ? picks : null;
}
