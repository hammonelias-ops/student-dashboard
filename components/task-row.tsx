"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { Paperclip } from "lucide-react";

import { setTaskFlag } from "@/app/(app)/assignments/actions";
import { ClassBadge } from "@/components/ui/field";
import { kindLabel, type ClassRow, type TaskRow } from "@/lib/tasks";
import { cn } from "@/lib/utils";

export function TaskRowItem({
  task,
  cls,
  dueLabel,
}: {
  task: TaskRow;
  cls: ClassRow | undefined;
  dueLabel: string;
}) {
  const [, startTransition] = useTransition();
  const [done, setDone] = useOptimistic(task.done);

  function toggle() {
    startTransition(async () => {
      setDone(!done);
      await setTaskFlag(task.id, "done", !done);
    });
  }

  return (
    <li className="flex items-start gap-3 py-3">
      <input
        type="checkbox"
        checked={done}
        onChange={toggle}
        aria-label={done ? `Mark "${task.title}" not done` : `Mark "${task.title}" done`}
        className="mt-1 size-5 shrink-0 cursor-pointer accent-primary"
      />
      <Link href={`/assignments/${task.id}`} className="min-w-0 flex-1 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <p className={cn("truncate font-medium", done && "text-muted-foreground line-through")}>
          {task.title}
          {task.priority === "high" && !done && (
            <span className="ml-2 align-middle text-xs font-normal text-primary">Big</span>
          )}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {cls && <ClassBadge code={cls.code} color={cls.color} className="text-foreground/80" />}
          <span>{dueLabel}</span>
          <span>{kindLabel(task.kind)}</span>
          {task.missing && !done && (
            <span className="rounded border border-amber-500/40 px-1.5 text-amber-300">Missing</span>
          )}
          {task.attachments.length > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Paperclip className="size-3" />
              {task.attachments.length}
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}
