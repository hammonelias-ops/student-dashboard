// Assignment types, in the order the form shows them (values match the `tasks.kind` check in SQL)
export const TASK_KINDS = [
  { value: "homework", label: "Homework" },
  { value: "test", label: "Test or quiz" },
  { value: "classwork", label: "Unfinished classwork" },
  { value: "project", label: "Project or essay" },
] as const;

export type TaskKind = (typeof TASK_KINDS)[number]["value"];

export function kindLabel(kind: string) {
  return TASK_KINDS.find((k) => k.value === kind)?.label ?? kind;
}

export function isTaskKind(value: string): value is TaskKind {
  return TASK_KINDS.some((k) => k.value === value);
}

export type ClassRow = {
  id: string;
  name: string;
  code: string | null;
  teacher: string | null;
  color: string | null;
  grade: number | null;
  goal: number;
};

export type AttachmentRow = {
  id: string;
  path: string;
  name: string;
  mime: string | null;
};

export type TaskRow = {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  teacher: string | null;
  due_at: string;
  kind: TaskKind;
  priority: "normal" | "high";
  missing: boolean;
  done: boolean;
  attachments: AttachmentRow[];
};

// Files the form accepts: PDFs, Office/Google docs exports, text and images (max 20 MB, same as the bucket)
export const ATTACHMENT_ACCEPT = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "text/plain": [".txt"],
  "image/*": [],
};
export const ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;
