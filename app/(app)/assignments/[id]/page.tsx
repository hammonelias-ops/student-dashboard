import { Suspense } from "react";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { TaskForm } from "@/components/task-form";
import { getClasses, getTask, requireUser, withSignedUrls } from "@/lib/data";
import { fromDueAt } from "@/lib/time";
import { getTimeZone } from "@/lib/time-zone";

export const metadata = { title: "Edit assignment · Student Dashboard" };

export default function EditAssignmentPage({ params }: PageProps<"/assignments/[id]">) {
  return (
    <>
      <PageHeader title="Edit assignment" />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <EditAssignment params={params} />
      </Suspense>
    </>
  );
}

async function EditAssignment({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ userId }, task, classes, tz] = await Promise.all([
    requireUser(),
    getTask(id),
    getClasses(),
    getTimeZone(),
  ]);
  if (!task) notFound();

  const { date, time } = fromDueAt(task.due_at, tz);
  const files = await withSignedUrls(task.attachments);

  return (
    <TaskForm
      classes={classes}
      userId={userId}
      initial={{ ...task, dueDate: date, dueTime: time, files }}
    />
  );
}
