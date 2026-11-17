# Build plan: Student Dashboard

Read this with `docs/ARCHITECTURE.md` (glue-code sketches) and `index.html` (problem definition).
Working reference for behavior: the Today prototype (assignment form, Top 3 scoring, habits, sleep).

## Rules for the build

- **Free tools only.** No paid APIs or plans.
- **Build in stages.** Stop after each stage so Elias can check it in the browser, then commit.
- **Phone first.** Every page must work on a phone screen; desktop gets extra columns.
- **Calm design.** Dark mode, one accent color, one color per class used everywhere. Overdue items roll forward without big red warnings. Max ~6 sections on the Today page.

## Stack

| Job | Tool |
|---|---|
| App framework | Next.js (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui (start from a free shadcn dashboard template if useful) |
| Database, login, file storage | Supabase (free tier) |
| Hosting | Vercel (free hobby plan), connected to this GitHub repo |
| Dates | Day.js; chrono-node for typed/voice dates |
| Calendar | FullCalendar (free standard version) |
| Charts / heat map | shadcn charts (Recharts), react-activity-calendar |
| File drag-and-drop | react-dropzone |
| Phone notifications | ntfy (free app + ntfy.sh) |
| Daily reminder job | Vercel cron (once a day on the free plan) |

Keep `index.html` (the problem page) reachable, e.g. move it to `public/problem.html`.

## Stages

### Stage 1: App shell
- Next.js + TypeScript + Tailwind + shadcn/ui
- Navigation: **Today · Assignments · Calendar · Grades · Habits** (bottom tab bar on phone, sidebar on desktop)
- Dark mode by default

### Stage 2: Supabase + login
- Supabase project (Elias creates it and pastes the URL + anon key into `.env.local`)
- Login with Supabase Auth (email magic link). Only Elias uses it.
- Tables (below) with **row level security**: every row has `user_id`, and users only see their own rows
- Storage bucket `attachments` (private)

### Stage 3: Classes + assignments
- **Add class** form: name, teacher, current grade %, goal % (default 85). Auto short code (CHM) and color.
- **Add assignment** form, asking:
  - Name *
  - Class * (teacher fills in from the class, editable)
  - Due date * and optional due time (no time = 11:59 PM)
  - Type *: Homework · Test or quiz · Unfinished classwork · Project or essay
  - Short description
  - "It's a big one" (high priority)
  - **📎 Attach file** (PDF, docs, images; drag-and-drop on desktop) and **📷 Take photo** (`<input type="file" accept="image/*" capture="environment">` opens the phone camera)
- Tap an assignment to edit; checkbox to mark done; "missing" toggle
- Attachments show as thumbnails/links on the assignment

### Stage 4: Today page
- Header: date, greeting by real time of day, one summary line ("4 open, 2 due today or overdue")
- **Top 3** using the urgency score below, each with reason chips ("overdue", "missing in gradebook", "CHM at 78%, goal 85%")
- Rest of today and overdue below; tomorrow collapsed
- Small habits summary ("2 of 3 today") linking to Habits

### Stage 5: Habits + health
- Daily goals Elias adds himself (e.g. "Workout 30 min"); check off each day
- Streak per goal + dots for the last 7 days
- Sleep log (hours last night) + 7-day average
- Later: heat map (react-activity-calendar)

### Stage 6: Calendar
- **Full-year view** (FullCalendar multi-month year view): the whole school year, Aug 2026 – May 2027, on one screen. Tap a month to open it.
- Month and week views for detail
- Event types, each with its own color:
  - **Break / day off** (shaded across every day it covers)
  - **School date** (semester start/end, Friday School, orientation, graduation)
  - **Event** (concerts, trips, debates; optional time and location)
  - **Assignment / test** (colored by class)
  - **Work shift**
- **Add event** form: name, type, start date, end date (for multi-day breaks/trips), optional time, location, note
- Drag an assignment to a new day = change due date
- Seed the school dates from **"School calendar 2026–27"** at the bottom of this file (`source = 'school'`)
- Reminders and the Top 3 skip break days (no "due tomorrow" pings during winter break)

### Stage 7: Grades
- Grade per class with trend over time (from the `grades` history table)
- "What do I need on the final?" calculator (weighted average)

### Stage 8: Quick add + voice
- One-line quick add: "Bio lab report due Friday, it's a big one" → preview card → save
- Mic button (browser Web Speech API; works in Chrome/Edge/Safari) feeding the same parser
- chrono-node for dates; match class names/aliases; keywords for type and priority

### Stage 9: Reminders
- `/api/reminders` run daily by Vercel cron (7 AM Arizona = 14:00 UTC): sends "what's due by tomorrow" to ntfy
- `NTFY_TOPIC` is a long random name (anyone who knows it can read it)

### Stage 10: Daily gradebook check
- The school gradebook is custom-built, so there is no API. A **Claude scheduled task** opens it each afternoon (~3:30 PM) in the Claude desktop app's browser, where Elias is already signed in. Claude never types the password; if logged out, it stops and notifies Elias.
- Claude reads: grade per class, missing/late work, new assignments, new scores
- Claude POSTs it to `/api/sync` with header `x-sync-secret` (`GRADE_SYNC_SECRET`):
  - saves a `grades` row per class (trend history)
  - updates class grades
  - adds new assignments as tasks (skip duplicates by title + class + due date)
  - marks tasks `missing` when the gradebook says so
  - optionally sends Claude's own Top 3 with reasons (`top3_override`), shown on Today for that day
- Read-only: Claude never clicks anything that submits or changes something in the gradebook

### Later / stretch
- Nightly review screen (1 minute: what got done, what moves to tomorrow, log sleep + habits)
- Focus timer that logs minutes per class
- Obsidian notes synced through GitHub
- Claude reading a photo of a worksheet to fill in the assignment form

## Urgency score (Top 3)

Based on Taskwarrior's urgency formula. Score every unfinished assignment, sort high to low, show the first 3.

| Factor | Points |
|---|---|
| Overdue | 12 |
| Due soon | 12 × max(0.2, 1 − days_until_due / 14) |
| Missing in gradebook | +10 |
| "Big one" (high priority) | +6 |
| Test/quiz or project/essay | +5 |
| Unfinished classwork | +2 |
| Class grade below goal | +4 |

Keep the weights in one config object so they're easy to tune. If a `top3_override` from today's gradebook check exists, show it instead (with Claude's reasons) and fall back to the formula otherwise.

## Data model (Supabase)

```sql
classes   (id, user_id, name, code, teacher, color, grade numeric, goal numeric default 85, created_at)
tasks     (id, user_id, class_id → classes, title, description, teacher, due_at timestamptz,
           kind text check (kind in ('homework','test','classwork','project')),
           priority text default 'normal', missing bool default false, done bool default false,
           source text default 'manual',   -- 'manual' | 'gradebook' | 'voice'
           created_at)
attachments (id, user_id, task_id → tasks, path text, name text, mime text, created_at)
habits    (id, user_id, name, created_at)
habit_log (user_id, habit_id → habits, day date, primary key (habit_id, day))
sleep_log (user_id, day date, hours numeric, primary key (user_id, day))
grades    (id, user_id, class_id → classes, percent numeric, checked_at timestamptz)
daily_pick (user_id, day date, top3 jsonb, primary key (user_id, day))   -- Claude's Top 3 override
events    (id, user_id, title, kind text check (kind in ('break','school','event','shift')),
           start_date date, end_date date, start_time time, location text, note text,
           source text default 'manual',   -- 'manual' | 'school'
           created_at)
```

## Accounts Elias needs (all free)

1. **Supabase**: create a project; copy the project URL and anon key
2. **Vercel**: sign in with GitHub, import this repo, add the env vars
3. **ntfy** app on his phone; subscribe to his topic

## Environment variables (never commit these)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server only, for /api/sync
NTFY_TOPIC=
GRADE_SYNC_SECRET=
```

Add `.env.local` to `.gitignore` before the first commit.

## School calendar 2026–27 (Centennial Academy)

Read from the official school calendar and checked by Elias. Seed these into `events` with `source = 'school'`. Dates are inclusive.

```json
[
  { "title": "School clean-up",             "kind": "school", "start": "2026-09-01", "end": "2026-09-04" },
  { "title": "New student orientation",     "kind": "school", "start": "2026-09-08", "end": "2026-09-08" },
  { "title": "Registration",                "kind": "school", "start": "2026-09-09", "end": "2026-09-09" },
  { "title": "Week-in-a-day",               "kind": "school", "start": "2026-09-11", "end": "2026-09-11" },
  { "title": "1st semester begins",         "kind": "school", "start": "2026-09-14", "end": "2026-09-14" },
  { "title": "Friday School",               "kind": "school", "start": "2026-10-09", "end": "2026-10-09" },
  { "title": "Friday School",               "kind": "school", "start": "2026-11-20", "end": "2026-11-20" },
  { "title": "Thanksgiving Break",          "kind": "break",  "start": "2026-11-25", "end": "2026-12-01" },
  { "title": "Choir",                       "kind": "event",  "start": "2026-11-30", "end": "2026-11-30" },
  { "title": "Christmas Concert",           "kind": "event",  "start": "2026-12-10", "end": "2026-12-11" },
  { "title": "Winter Break",                "kind": "break",  "start": "2026-12-21", "end": "2027-01-07" },
  { "title": "1st semester ends",           "kind": "school", "start": "2027-01-14", "end": "2027-01-14" },
  { "title": "2nd semester begins",         "kind": "school", "start": "2027-01-18", "end": "2027-01-18" },
  { "title": "Friday School",               "kind": "school", "start": "2027-01-22", "end": "2027-01-22" },
  { "title": "Friday School",               "kind": "school", "start": "2027-02-12", "end": "2027-02-12" },
  { "title": "Presidents' Day",             "kind": "break",  "start": "2027-02-15", "end": "2027-02-15" },
  { "title": "Spring Break",                "kind": "break",  "start": "2027-03-15", "end": "2027-03-18" },
  { "title": "Youth Conference",            "kind": "event",  "start": "2027-03-24", "end": "2027-03-26" },
  { "title": "School clean-up",             "kind": "school", "start": "2027-04-09", "end": "2027-04-09" },
  { "title": "Spring Concert",              "kind": "event",  "start": "2027-04-11", "end": "2027-04-11" },
  { "title": "Shakespeare Day",             "kind": "event",  "start": "2027-04-13", "end": "2027-04-13" },
  { "title": "Possible CH trip",            "kind": "event",  "start": "2027-04-23", "end": "2027-04-25" },
  { "title": "Debates",                     "kind": "event",  "start": "2027-04-30", "end": "2027-04-30" },
  { "title": "2nd semester ends",           "kind": "school", "start": "2027-05-04", "end": "2027-05-04" },
  { "title": "Graduation",                  "kind": "school", "start": "2027-05-07", "end": "2027-05-07" }
]
```
