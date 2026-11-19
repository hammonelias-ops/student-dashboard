import { NextResponse, type NextRequest } from "next/server";

import { matchClass, type ParseClass } from "@/lib/parse-task";
import { createAdminClient, getOwnerId, secretMatches } from "@/lib/supabase/admin";
import { isTaskKind } from "@/lib/tasks";
import { FALLBACK_TIME_ZONE, dayjs, fromDueAt, toDueAt } from "@/lib/time";

// The daily gradebook check (a Claude scheduled task, see docs/GRADEBOOK_CHECK.md) POSTs what it
// read from the school gradebook here, with header `x-sync-secret: $GRADE_SYNC_SECRET`.
//
// {
//   "grades":        [{ "class": "AUTO CAD", "percent": 85 }],
//   "assignments":   [{ "class": "College Algebra", "title": "Worksheet 4.2", "due": "2026-11-20",
//                       "kind": "homework", "missing": false }],
//   "missing":       [{ "class": "World History - Section 10", "title": "Chapter 7 questions" }],
//   "top3_override": [{ "class": "Biology II - Human Anatomy", "title": "Unit 3 test", "reason": "Worth 20% of the grade" }]
// }
//
// Classes match by full name, short code or alias. Everything is optional.
// Returns what changed plus anything it couldn't match, so the check can report it.

type Ref = { class?: string; title?: string };
type Body = {
  grades?: { class?: string; percent?: number }[];
  assignments?: (Ref & { due?: string; kind?: string; missing?: boolean; description?: string })[];
  missing?: Ref[];
  top3_override?: (Ref & { task_id?: string; reason?: string })[];
};

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export async function POST(request: NextRequest) {
  if (!secretMatches(request.headers.get("x-sync-secret"), process.env.GRADE_SYNC_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
  }

  const tz = FALLBACK_TIME_ZONE;
  const today = dayjs(new Date()).tz(tz).format("YYYY-MM-DD");
  const admin = createAdminClient();
  const userId = await getOwnerId(admin);

  const { data: classRows, error: classError } = await admin
    .from("classes")
    .select("id, name, code, aliases")
    .eq("user_id", userId);
  if (classError) return NextResponse.json({ error: classError.message }, { status: 500 });
  const classes = classRows as ParseClass[];

  // Exact name/code first, then the same fuzzy matching quick add uses
  const findClass = (name?: string) => {
    if (!name) return null;
    const n = norm(name);
    return (
      classes.find((c) => norm(c.name) === n || (c.code && norm(c.code) === n)) ??
      matchClass(name, classes)?.cls ??
      null
    );
  };

  const { data: taskRows, error: taskError } = await admin
    .from("tasks")
    .select("id, class_id, title, due_at")
    .eq("user_id", userId);
  if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 });
  const tasks = [...taskRows];

  // Same title in the same class (exact first, then one title containing the other)
  const findTask = (classId: string, title?: string) => {
    if (!title) return null;
    const t = norm(title);
    const inClass = tasks.filter((x) => x.class_id === classId);
    return (
      inClass.find((x) => norm(x.title) === t) ??
      inClass.find((x) => norm(x.title).includes(t) || t.includes(norm(x.title))) ??
      null
    );
  };

  const summary = {
    grades: 0,
    assignmentsAdded: 0,
    assignmentsSkipped: 0,
    markedMissing: 0,
    top3: 0,
    unmatched: [] as string[],
  };

  // ── Grades: one history row per class per check + the class's current grade
  for (const g of body.grades ?? []) {
    const cls = findClass(g.class);
    const percent = Number(g.percent);
    if (!cls || !Number.isFinite(percent) || percent < 0 || percent > 150) {
      summary.unmatched.push(`grade: ${g.class ?? "?"} ${g.percent ?? "?"}`);
      continue;
    }
    // Running the check twice in a day with no change shouldn't add a second point to the trend
    const { data: last } = await admin
      .from("grades")
      .select("percent, checked_at")
      .eq("class_id", cls.id)
      .order("checked_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sameAsToday =
      last && Number(last.percent) === percent && dayjs(last.checked_at).tz(tz).format("YYYY-MM-DD") === today;
    const insert = sameAsToday
      ? { error: null }
      : await admin.from("grades").insert({ user_id: userId, class_id: cls.id, percent });
    const update = await admin.from("classes").update({ grade: percent }).eq("id", cls.id);
    if (insert.error || update.error) summary.unmatched.push(`grade: ${cls.name} (${(insert.error ?? update.error)!.message})`);
    else if (!sameAsToday) summary.grades++;
  }

  // ── New assignments (skip duplicates: same title + class + due date)
  for (const a of body.assignments ?? []) {
    const cls = findClass(a.class);
    const title = a.title?.trim();
    if (!cls || !title || !a.due) {
      summary.unmatched.push(`assignment: ${a.class ?? "?"} / ${a.title ?? "?"}`);
      continue;
    }
    // "2026-11-20" (11:59 PM) or a full timestamp
    const dueAt = /^\d{4}-\d{2}-\d{2}$/.test(a.due)
      ? toDueAt(a.due, "", tz)
      : dayjs(a.due).isValid()
        ? dayjs(a.due).toISOString()
        : null;
    if (!dueAt) {
      summary.unmatched.push(`assignment: ${title} (bad due date "${a.due}")`);
      continue;
    }
    const dueDay = fromDueAt(dueAt, tz).date;
    const duplicate = tasks.some(
      (t) => t.class_id === cls.id && norm(t.title) === norm(title) && fromDueAt(t.due_at, tz).date === dueDay
    );
    if (duplicate) {
      summary.assignmentsSkipped++;
      continue;
    }
    const { data, error } = await admin
      .from("tasks")
      .insert({
        user_id: userId,
        class_id: cls.id,
        title,
        description: a.description?.trim() || null,
        due_at: dueAt,
        kind: a.kind && isTaskKind(a.kind) ? a.kind : "homework",
        missing: Boolean(a.missing),
        source: "gradebook",
      })
      .select("id, class_id, title, due_at")
      .single();
    if (error) summary.unmatched.push(`assignment: ${title} (${error.message})`);
    else {
      tasks.push(data);
      summary.assignmentsAdded++;
    }
  }

  // ── Missing work
  for (const m of body.missing ?? []) {
    const cls = findClass(m.class);
    const task = cls && findTask(cls.id, m.title);
    if (!task) {
      summary.unmatched.push(`missing: ${m.class ?? "?"} / ${m.title ?? "?"}`);
      continue;
    }
    const { error } = await admin.from("tasks").update({ missing: true, done: false }).eq("id", task.id);
    if (error) summary.unmatched.push(`missing: ${task.title} (${error.message})`);
    else summary.markedMissing++;
  }

  // ── Claude's Top 3 for today (shown on Today instead of the formula)
  if (body.top3_override?.length) {
    const picks: { task_id: string; reason?: string }[] = [];
    for (const p of body.top3_override.slice(0, 3)) {
      const byId = p.task_id && tasks.find((t) => t.id === p.task_id);
      const cls = byId ? null : findClass(p.class);
      const task = byId || (cls ? findTask(cls.id, p.title) : null);
      if (task) picks.push({ task_id: task.id, ...(p.reason ? { reason: p.reason.slice(0, 140) } : {}) });
      else summary.unmatched.push(`top3: ${p.class ?? "?"} / ${p.title ?? p.task_id ?? "?"}`);
    }
    if (picks.length) {
      const { error } = await admin
        .from("daily_pick")
        .upsert({ user_id: userId, day: today, top3: picks }, { onConflict: "user_id,day" });
      if (error) summary.unmatched.push(`top3: ${error.message}`);
      else summary.top3 = picks.length;
    }
  }

  return NextResponse.json({ ok: true, day: today, ...summary });
}
