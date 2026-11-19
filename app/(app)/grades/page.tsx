import { Suspense } from "react";
import Link from "next/link";

import { GradeChart } from "@/components/grade-chart";
import { FinalCalculator, LogGradeForm } from "@/components/grade-tools";
import { PageHeader } from "@/components/page-header";
import { getClasses, getGradeHistory } from "@/lib/data";
import { dayjs } from "@/lib/time";

export const metadata = { title: "Grades · Student Dashboard" };

export default function GradesPage() {
  return (
    <>
      <PageHeader title="Grades" subtitle="Where do I stand in each class?" />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <Grades />
      </Suspense>
    </>
  );
}

async function Grades() {
  const [classes, history] = await Promise.all([getClasses(), getGradeHistory()]);

  if (classes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No classes yet. <Link href="/assignments/classes/new" className="underline underline-offset-4">Add one</Link> to
        start tracking grades.
      </p>
    );
  }

  // Classes under their goal first (by how far under), then the rest by grade, lowest first
  const sorted = [...classes].sort((a, b) => {
    const gapA = a.grade == null ? Infinity : Number(a.grade) - Number(a.goal);
    const gapB = b.grade == null ? Infinity : Number(b.grade) - Number(b.goal);
    return gapA - gapB;
  });
  const options = classes.map((c) => ({
    id: c.id,
    label: c.code ? `${c.code} · ${c.name}` : c.name,
    grade: c.grade == null ? null : Number(c.grade),
    goal: Number(c.goal),
  }));
  const belowGoal = classes.filter((c) => c.grade != null && Number(c.grade) < Number(c.goal)).length;

  return (
    <div className="space-y-10">
      <p className="text-muted-foreground">
        {belowGoal === 0
          ? `At or above your goal in all ${classes.length} classes.`
          : `${belowGoal} of ${classes.length} classes below your goal.`}
      </p>

      <section aria-label="Grade by class" className="grid gap-4 lg:grid-cols-2">
        {sorted.map((c) => {
          const points = history.filter((h) => h.classId === c.id);
          const grade = c.grade == null ? null : Number(c.grade);
          const goal = Number(c.goal);
          const diff = grade == null ? null : Math.round((grade - goal) * 10) / 10;
          const prev = points.length >= 2 ? points[points.length - 2].percent : null;
          const change = prev != null && grade != null ? Math.round((grade - prev) * 10) / 10 : null;

          return (
            <article key={c.id} className="rounded-xl border p-4">
              <header className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 font-medium">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color ?? undefined }} />
                    <span className="truncate">{c.name}</span>
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {c.code} · goal {goal}%
                    {diff != null &&
                      (diff === 0 ? " · right at goal" : diff > 0 ? ` · ${diff} above` : ` · ${Math.abs(diff)} below`)}
                    {change != null && change !== 0 && ` · ${change > 0 ? "▲" : "▼"} ${Math.abs(change)} since last check`}
                  </p>
                </div>
                <p className="shrink-0 text-2xl font-semibold tabular-nums">{grade == null ? "—" : `${grade}%`}</p>
              </header>

              <div className="mt-3">
                {points.length >= 2 ? (
                  <GradeChart points={points} goal={goal} color={c.color ?? "#5b8def"} />
                ) : (
                  <p className="rounded-lg bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
                    The trend line starts once there are two grade checks.
                  </p>
                )}
              </div>

              {points.length > 0 && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-muted-foreground select-none hover:text-foreground">
                    History ({points.length})
                  </summary>
                  <table className="mt-2 w-full">
                    <thead className="text-left text-muted-foreground">
                      <tr>
                        <th className="py-1 font-normal">Checked</th>
                        <th className="py-1 text-right font-normal">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...points].reverse().map((p) => (
                        <tr key={p.at} className="border-t">
                          <td className="py-1">{dayjs(p.at).format("ddd, MMM D, YYYY")}</td>
                          <td className="py-1 text-right tabular-nums">{p.percent}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              )}
            </article>
          );
        })}
      </section>

      <section aria-labelledby="final-calc" className="space-y-3">
        <h2 id="final-calc" className="text-sm font-medium text-muted-foreground">
          What do I need on the final?
        </h2>
        <FinalCalculator classes={options} />
      </section>

      <section aria-labelledby="log-grade" className="space-y-3">
        <h2 id="log-grade" className="text-sm font-medium text-muted-foreground">
          Log a grade
        </h2>
        <p className="text-xs text-muted-foreground">
          Adds a point to the trend and updates the class. The daily gradebook check will do this for you.
        </p>
        <LogGradeForm classes={options} />
      </section>
    </div>
  );
}
