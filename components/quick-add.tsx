"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Mic, MicOff, Sparkles } from "lucide-react";

import { saveTask } from "@/app/(app)/assignments/actions";
import { Button } from "@/components/ui/button";
import { FormError, inputClass } from "@/components/ui/field";
import { parseTask, type TaskDraft } from "@/lib/parse-task";
import { TASK_KINDS, type ClassRow } from "@/lib/tasks";
import { cn } from "@/lib/utils";

// Minimal typing for the browser's speech recognition (Chrome/Edge/Safari: webkitSpeechRecognition)
type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

function getRecognition(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function QuickAdd({ classes }: { classes: ClassRow[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<TaskDraft | null>(null);
  const [fromVoice, setFromVoice] = useState(false);
  const [error, setError] = useState<string>();
  const [added, setAdded] = useState<string>();
  const [pending, startTransition] = useTransition();

  // Mic: only shown where the browser supports speech recognition
  const [canListen, setCanListen] = useState(false);
  const [listening, setListening] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  useEffect(() => {
    const ctor = getRecognition();
    if (!ctor) return;
    const r = new ctor();
    r.lang = "en-US";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const said = e.results[0]?.[0]?.transcript ?? "";
      setText(said);
      if (said) preview(said, true);
    };
    r.onerror = (e) => {
      setListening(false);
      if (e.error === "not-allowed") setError("The browser blocked the microphone. Allow it in the address bar and try again.");
      else if (e.error !== "no-speech" && e.error !== "aborted") setError("Couldn't hear that. Try again or type it.");
    };
    r.onend = () => setListening(false);
    recognition.current = r;
    setCanListen(true); // eslint-disable-line react-hooks/set-state-in-effect -- feature detection after mount
    return () => r.stop();
    // preview only reads `classes`, which doesn't change while the page is open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function preview(sentence: string, voice: boolean) {
    setError(undefined);
    setAdded(undefined);
    setFromVoice(voice);
    setDraft(parseTask(sentence, classes));
  }

  function toggleMic() {
    if (!recognition.current) return;
    if (listening) return recognition.current.stop();
    setError(undefined);
    setListening(true);
    recognition.current.start();
  }

  function save() {
    if (!draft) return;
    if (!draft.classId) return setError("Pick a class.");
    if (!draft.dueDate) return setError("Pick a due date.");
    const cls = classes.find((c) => c.id === draft.classId);
    const form = new FormData();
    form.set("title", draft.title);
    form.set("class_id", draft.classId);
    form.set("teacher", cls?.teacher ?? "");
    form.set("due_date", draft.dueDate);
    form.set("due_time", draft.dueTime);
    form.set("kind", draft.kind);
    if (draft.big) form.set("big", "on");
    form.set("source", fromVoice ? "voice" : "manual");

    startTransition(async () => {
      const result = await saveTask({ status: "idle" }, form);
      if (result.status !== "saved") return setError(result.message ?? "Couldn't save. Try again.");
      setAdded(draft.title);
      setDraft(null);
      setText("");
      router.refresh();
    });
  }

  const set = (patch: Partial<TaskDraft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  if (classes.length === 0) return null;

  return (
    <section aria-label="Quick add" className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) preview(text, false);
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Sparkles className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Bio lab report due Friday, it's a big one"
            aria-label="Quick add an assignment"
            className={`${inputClass} h-10 pl-9`}
          />
        </div>
        {canListen && (
          <Button
            type="button"
            variant={listening ? "default" : "outline"}
            size="icon-lg"
            onClick={toggleMic}
            aria-pressed={listening}
            aria-label={listening ? "Stop listening" : "Say it"}
            className={cn("size-10", listening && "animate-pulse")}
          >
            {listening ? <MicOff /> : <Mic />}
          </Button>
        )}
        <Button type="submit" size="lg" variant="secondary" className="h-10" disabled={!text.trim()}>
          Add
        </Button>
      </form>

      {listening && <p className="text-xs text-muted-foreground">Listening… say the assignment and when it&apos;s due.</p>}

      {added && !draft && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Check className="size-4 text-primary" /> Added &ldquo;{added}&rdquo;.{" "}
          <Link href="/assignments" className="underline underline-offset-4 hover:text-foreground">
            See assignments
          </Link>
        </p>
      )}

      {draft && (
        <div className="space-y-3 rounded-xl border p-4" role="group" aria-label="Check before saving">
          <p className="text-xs text-muted-foreground">Check it, then save:</p>
          <input
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
            aria-label="Name"
            className={`${inputClass} h-10 font-medium`}
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <select
              value={draft.classId ?? ""}
              onChange={(e) => set({ classId: e.target.value || null })}
              aria-label="Class"
              className={cn(`${inputClass} h-10`, !draft.classId && "border-primary")}
            >
              <option value="">Pick a class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code ?? c.name}
                </option>
              ))}
            </select>
            <select
              value={draft.kind}
              onChange={(e) => set({ kind: e.target.value as TaskDraft["kind"] })}
              aria-label="Type"
              className={`${inputClass} h-10`}
            >
              {TASK_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={draft.dueDate ?? ""}
              onChange={(e) => set({ dueDate: e.target.value || null })}
              aria-label="Due date"
              className={cn(`${inputClass} h-10 [color-scheme:dark]`, !draft.dueDate && "border-primary")}
            />
            <input
              type="time"
              value={draft.dueTime}
              onChange={(e) => set({ dueTime: e.target.value })}
              aria-label="Due time (blank = 11:59 PM)"
              title="Blank = 11:59 PM"
              className={`${inputClass} h-10 [color-scheme:dark]`}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.big}
              onChange={(e) => set({ big: e.target.checked })}
              className="size-4 accent-primary"
            />
            It&apos;s a big one
          </label>
          <FormError message={error} />
          <div className="flex gap-2">
            <Button type="button" size="lg" onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button type="button" size="lg" variant="ghost" onClick={() => setDraft(null)} disabled={pending}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!draft && <FormError message={error} />}
    </section>
  );
}
