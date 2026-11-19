import { NextResponse, type NextRequest } from "next/server";

import { breakOn, type EventRow } from "@/lib/events";
import { createAdminClient, getOwnerId, secretMatches } from "@/lib/supabase/admin";
import { kindLabel } from "@/lib/tasks";
import { FALLBACK_TIME_ZONE, dayjs, formatDue } from "@/lib/time";

// Daily "what's due by tomorrow" push to the phone (ntfy), run by Vercel cron at 7 AM Arizona
// (vercel.json: 14:00 UTC). Vercel sends `Authorization: Bearer $CRON_SECRET`.
//
//   GET /api/reminders           → sends the push (if anything is due and it's not a break day)
//   GET /api/reminders?dry=1     → only returns what it would send

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secretMatches(auth, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = request.nextUrl.searchParams.get("dry") === "1";
  const topic = process.env.NTFY_TOPIC;
  if (!topic && !dry) return NextResponse.json({ error: "NTFY_TOPIC is not set" }, { status: 500 });

  const tz = FALLBACK_TIME_ZONE; // no browser here: use the dashboard's home time zone
  const now = new Date();
  const local = dayjs(now).tz(tz);
  const today = local.format("YYYY-MM-DD");
  const endOfTomorrow = local.add(1, "day").endOf("day");

  const admin = createAdminClient();
  const userId = await getOwnerId(admin);

  // No "due tomorrow" pings during a break (Thanksgiving, winter break…)
  const { data: events } = await admin
    .from("events")
    .select("title, kind, start_date, end_date")
    .eq("user_id", userId)
    .eq("kind", "break");
  const onBreak = breakOn(today, (events ?? []) as Pick<EventRow, "title" | "kind" | "start_date" | "end_date">[]);
  if (onBreak) {
    return NextResponse.json({ sent: false, reason: `break day (${onBreak.title})`, today });
  }

  const { data: tasks, error } = await admin
    .from("tasks")
    .select("title, kind, due_at, priority, missing, classes(code)")
    .eq("user_id", userId)
    .eq("done", false)
    .lte("due_at", endOfTomorrow.toISOString())
    .order("due_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!tasks.length) {
    return NextResponse.json({ sent: false, reason: "nothing due by tomorrow", today });
  }

  const lines = tasks.map((t) => {
    const code = (t.classes as { code?: string } | null)?.code;
    const flags = [t.priority === "high" ? "big" : "", t.missing ? "missing" : ""].filter(Boolean).join(", ");
    return `• ${code ? `${code} ` : ""}${t.title} (${kindLabel(t.kind)}), ${formatDue(t.due_at, tz, now)}${flags ? ` [${flags}]` : ""}`;
  });
  const overdue = tasks.filter((t) => new Date(t.due_at) < now).length;
  const title = `${tasks.length} due by tomorrow${overdue ? `, ${overdue} overdue` : ""}`;
  const body = lines.join("\n");

  if (dry) return NextResponse.json({ sent: false, dry: true, title, body });

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const res = await fetch(`https://ntfy.sh/${encodeURIComponent(topic!)}`, {
    method: "POST",
    body,
    headers: {
      Title: title,
      Tags: "books",
      Priority: overdue ? "high" : "default",
      ...(appUrl ? { Click: appUrl } : {}),
    },
  });
  if (!res.ok) return NextResponse.json({ error: `ntfy responded ${res.status}` }, { status: 502 });
  return NextResponse.json({ sent: true, title, count: tasks.length });
}
