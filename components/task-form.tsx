"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Camera, FileText, Paperclip, Trash2, X } from "lucide-react";

import { deleteAttachment, deleteTask, saveTask } from "@/app/(app)/assignments/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_BYTES,
  TASK_KINDS,
  type AttachmentRow,
  type ClassRow,
  type TaskRow,
} from "@/lib/tasks";
import { cn } from "@/lib/utils";

export type SignedAttachment = AttachmentRow & { url: string | null };

type Props = {
  classes: ClassRow[];
  userId: string;
  // Editing: the task plus its due date/time already converted to the user's time zone
  initial?: TaskRow & { dueDate: string; dueTime: string; files: SignedAttachment[] };
  defaultClassId?: string;
};

export function TaskForm({ classes, userId, initial, defaultClassId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [progress, setProgress] = useState<string>();

  // Teacher fills in from the class, but stays editable
  const firstClassId = initial?.class_id ?? defaultClassId ?? (classes.length === 1 ? classes[0].id : "");
  const [classId, setClassId] = useState(firstClassId);
  const teacherOf = (id: string) => classes.find((c) => c.id === id)?.teacher ?? "";
  const [teacher, setTeacher] = useState(initial?.teacher ?? teacherOf(firstClassId));

  function changeClass(next: string) {
    // Only overwrite the teacher if it still matches the old class (i.e. you didn't type your own)
    if (!teacher || teacher === teacherOf(classId)) setTeacher(teacherOf(next));
    setClassId(next);
  }

  // Files picked but not uploaded yet (they upload after the assignment is saved)
  const [files, setFiles] = useState<File[]>([]);
  const addFiles = (picked: File[]) => setFiles((prev) => [...prev, ...picked]);
  const onDrop = (accepted: File[], rejected: FileRejection[]) => {
    addFiles(accepted);
    if (rejected.length) {
      setError(
        `Couldn't add ${rejected.map((r) => r.file.name).join(", ")}: files must be PDFs, documents or images under 20 MB.`
      );
    }
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ATTACHMENT_ACCEPT,
    maxSize: ATTACHMENT_MAX_BYTES,
  });
  const cameraInput = useRef<HTMLInputElement>(null);

  async function uploadFiles(taskId: string) {
    const supabase = createClient();
    const failed: string[] = [];
    for (const [i, file] of files.entries()) {
      setProgress(`Uploading ${i + 1} of ${files.length}…`);
      const safeName = file.name.replace(/[^\w.-]+/g, "_").slice(-80) || "file";
      const path = `${userId}/${taskId}/${Date.now()}-${safeName}`;
      const upload = await supabase.storage
        .from("attachments")
        .upload(path, file, { contentType: file.type || undefined });
      if (upload.error) {
        failed.push(file.name);
        continue;
      }
      const row = await supabase
        .from("attachments")
        .insert({ task_id: taskId, path, name: file.name, mime: file.type || null });
      if (row.error) failed.push(file.name);
    }
    setProgress(undefined);
    return failed;
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(undefined);

    startTransition(async () => {
      const result = await saveTask({ status: "idle" }, form);
      if (result.status !== "saved" || !result.id) {
        setError(result.message ?? "Couldn't save. Try again.");
        return;
      }
      const failed = files.length ? await uploadFiles(result.id) : [];
      if (failed.length) {
        // The assignment is saved; stay on its edit page so the files can be retried
        setFiles((prev) => prev.filter((f) => failed.includes(f.name)));
        setError(`Saved, but these files didn't upload: ${failed.join(", ")}. Try again.`);
        if (!initial) router.replace(`/assignments/${result.id}`);
        router.refresh();
        return;
      }
      router.push("/assignments");
      router.refresh();
    });
  }

  function remove() {
    if (!initial || !confirm(`Delete "${initial.title}" and its files?`)) return;
    startTransition(async () => {
      await deleteTask(initial.id);
      router.push("/assignments");
      router.refresh();
    });
  }

  function removeSaved(file: SignedAttachment) {
    if (!confirm(`Remove ${file.name}?`)) return;
    startTransition(() => deleteAttachment(file.id));
  }

  return (
    <form onSubmit={submit} className="max-w-lg space-y-5">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <Field label="Name" htmlFor="title" required>
        <input
          id="title"
          name="title"
          required
          autoFocus={!initial}
          defaultValue={initial?.title}
          placeholder="Lab report: reaction rates"
          className={`${inputClass} h-10`}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Class" htmlFor="class_id" required>
          <select
            id="class_id"
            name="class_id"
            required
            value={classId}
            onChange={(e) => changeClass(e.target.value)}
            className={`${inputClass} h-10`}
          >
            <option value="" disabled>
              Pick a class
            </option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code ? `${c.code} · ${c.name}` : c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Teacher" htmlFor="teacher">
          <input
            id="teacher"
            name="teacher"
            value={teacher}
            onChange={(e) => setTeacher(e.target.value)}
            className={`${inputClass} h-10`}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Due date" htmlFor="due_date" required>
          <input
            id="due_date"
            name="due_date"
            type="date"
            required
            defaultValue={initial?.dueDate}
            className={`${inputClass} h-10 [color-scheme:dark]`}
          />
        </Field>
        <Field label="Due time" htmlFor="due_time" hint="Blank = 11:59 PM">
          <input
            id="due_time"
            name="due_time"
            type="time"
            defaultValue={initial?.dueTime}
            className={`${inputClass} h-10 [color-scheme:dark]`}
          />
        </Field>
      </div>

      <fieldset className="space-y-1.5">
        <legend className="mb-1.5 text-sm font-medium">
          Type<span className="text-muted-foreground"> *</span>
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {TASK_KINDS.map((k) => (
            <label
              key={k.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors has-checked:border-primary has-checked:bg-primary/10 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input
                type="radio"
                name="kind"
                value={k.value}
                required
                defaultChecked={(initial?.kind ?? "homework") === k.value}
                className="sr-only"
              />
              {k.label}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Short description" htmlFor="description">
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
          placeholder="Pages, instructions, what to bring…"
          className={`${inputClass} py-2`}
        />
      </Field>

      <div className="space-y-2">
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="big"
            defaultChecked={initial?.priority === "high"}
            className="size-4 accent-primary"
          />
          It&apos;s a big one
        </label>
        {initial && (
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="missing"
              defaultChecked={initial.missing}
              className="size-4 accent-primary"
            />
            Marked missing in the gradebook
          </label>
        )}
      </div>

      {/* Files: drag-and-drop or click on desktop, camera on phone */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Files</p>

        {initial && initial.files.length > 0 && (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {initial.files.map((f) => (
              <li key={f.id} className="group relative">
                <AttachmentTile file={f} />
                <button
                  type="button"
                  onClick={() => removeSaved(f)}
                  aria-label={`Remove ${f.name}`}
                  className="absolute top-1 right-1 rounded-md bg-background/80 p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <div
            {...getRootProps()}
            className={cn(
              "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground transition-colors hover:bg-muted/50",
              isDragActive && "border-primary bg-primary/10 text-foreground"
            )}
          >
            <input {...getInputProps()} />
            <Paperclip className="size-4" />
            <span>
              Attach file<span className="hidden md:inline"> or drop it here</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => cameraInput.current?.click()}
            className="flex items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground transition-colors hover:bg-muted/50"
          >
            <Camera className="size-4" />
            Take photo
          </button>
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              addFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
        </div>

        {files.length > 0 && (
          <ul className="space-y-1">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center gap-2 text-sm">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{f.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">to upload</span>
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  aria-label={`Don't upload ${f.name}`}
                  className="ml-auto rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <FormError message={error} />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="lg" disabled={pending}>
          {progress ?? (pending ? "Saving…" : initial ? "Save" : "Add assignment")}
        </Button>
        <Link href="/assignments" className={buttonVariants({ variant: "ghost", size: "lg" })}>
          Cancel
        </Link>
        {initial && (
          <Button type="button" variant="ghost" size="lg" onClick={remove} disabled={pending} className="ml-auto text-muted-foreground">
            <Trash2 />
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}

// Thumbnail for images, file chip for everything else. Opens the file in a new tab.
export function AttachmentTile({ file }: { file: SignedAttachment }) {
  const isImage = file.mime?.startsWith("image/");
  return (
    <a
      href={file.url ?? undefined}
      target="_blank"
      rel="noreferrer"
      title={file.name}
      className="flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border bg-muted/30 text-xs text-muted-foreground hover:border-ring"
    >
      {isImage && file.url ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed URL from a private bucket
        <img src={file.url} alt={file.name} className="size-full object-cover" />
      ) : (
        <>
          <FileText className="size-6" />
          <span className="w-full truncate px-2 text-center">{file.name}</span>
        </>
      )}
    </a>
  );
}
