import * as chrono from "chrono-node";

import { DEFAULT_DUE_TIME } from "@/lib/time";
import type { TaskKind } from "@/lib/tasks";

// One sentence (typed or spoken) → a draft assignment for the preview card.
// "Bio lab report due Friday, it's a big one"
// → { title: "Bio lab report", classId: <Biology>, dueDate: "2026-11-20", dueTime: "", kind: "homework", big: true }

export type ParseClass = { id: string; name: string; code: string | null; aliases: string[] };

export type TaskDraft = {
  title: string;
  classId: string | null;
  dueDate: string | null; // "YYYY-MM-DD" in the browser's time zone
  dueTime: string; // "HH:MM", or "" for the default 11:59 PM
  kind: TaskKind;
  big: boolean;
};

const KIND_WORDS: [TaskKind, RegExp][] = [
  ["test", /\b(test|quiz|exam|midterm|final exam)\b/i],
  ["project", /\b(project|essay|presentation|research paper)\b/i],
  ["classwork", /\b(classwork|class work|unfinished|in-class)\b/i],
];
const BIG = /\b(it'?s a big one|big one|big|important|huge|urgent)\b/i;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const two = (n: number) => String(n).padStart(2, "0");

// Every way to say the class: full name, code, aliases, and the name without "II", "- Section 10", etc.
function classNames(c: ParseClass) {
  const base = c.name.split(/\s+-\s+/)[0].replace(/\b(I{1,3}|IV|V|\d+)\b/g, "").trim();
  return [c.name, base, c.code ?? "", ...c.aliases].map((n) => n.trim().toLowerCase()).filter((n) => n.length >= 2);
}

export function matchClass(text: string, classes: ParseClass[]) {
  let best: { cls: ParseClass; name: string } | null = null;
  for (const cls of classes) {
    for (const name of classNames(cls)) {
      const re = new RegExp(`\\b${escape(name)}\\b`, "i");
      // Prefer the longest match ("world history" over "history")
      if (re.test(text) && (!best || name.length > best.name.length)) best = { cls, name };
    }
  }
  return best;
}

export function parseTask(sentence: string, classes: ParseClass[], now = new Date()): TaskDraft {
  const text = sentence.trim();

  // Date (and time if one was said): "due Friday", "next Tuesday at 3pm", "in 3 days", "tomorrow"
  const found = chrono.parse(text, now, { forwardDate: true })[0];
  let dueDate: string | null = null;
  let dueTime = "";
  if (found) {
    const d = found.start.date();
    dueDate = `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
    if (found.start.isCertain("hour")) {
      const t = `${two(d.getHours())}:${two(d.getMinutes())}`;
      dueTime = t === DEFAULT_DUE_TIME ? "" : t;
    }
  }

  const match = matchClass(text, classes);
  const kind = KIND_WORDS.find(([, re]) => re.test(text))?.[0] ?? "homework";
  const big = BIG.test(text);

  // Title: the sentence minus the date words, "due", the class's spoken name prefix and the "big one" bits
  let title = found ? text.replace(found.text, " ") : text;
  title = title
    .replace(/,?\s*(and\s+)?it'?s a big one\b/gi, " ")
    .replace(/,?\s*\b(important|urgent|huge)\s*[!.]*\s*$/gi, " ")
    .replace(/\b(it'?s\s+)?(due|by|on|for)\s*$/gi, " ")
    .replace(/\bdue\b/gi, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/[\s,.;:!?-]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  // Keep the class word if it's the whole title ("Bio") so the title is never empty
  if (match) {
    const stripped = title.replace(new RegExp(`^${escape(match.name)}\\b\\s*`, "i"), "").trim();
    if (stripped) title = stripped.charAt(0).toUpperCase() + stripped.slice(1);
  }
  if (!title) title = text;

  return { title, classId: match?.cls.id ?? null, dueDate, dueTime, kind, big };
}
