# Daily gradebook check (Stage 10)

A **Claude scheduled task** (`daily-gradebook-check`) runs this on school days (Mon–Fri, ~3:30 PM Arizona)
in the Claude desktop app. It only runs while the app is open; a missed run happens on next launch.
It reads the school gradebook in Elias's browser, where he's already signed in, and sends what it
found to the dashboard's `/api/sync` endpoint.

Rules it follows:

- **Read-only.** It never clicks anything that submits, uploads or changes something in the gradebook.
- **Never types a password.** If the gradebook shows a sign-in page, it stops and sends a notification.
- The sync secret is read from `.env.local` (`GRADE_SYNC_SECRET`) at run time, never pasted into the prompt.

## The prompt

Use this as the scheduled task's prompt (working folder: the `student-dashboard` project).
`APP_URL` is the deployed dashboard (e.g. `https://student-dashboard-xxxx.vercel.app`), or
`http://localhost:3000` if the dev server is running on this computer.

```text
Daily gradebook check for my student dashboard. Read-only: never click anything that
submits, uploads, or changes anything in the gradebook, and never type a password.

1. In my Chrome (Claude in Chrome), open https://cagradebook.com/student and go to
   My studies → Dashboard. If it shows a sign-in page instead, stop and send me a push
   notification: "Gradebook check: you're signed out of cagradebook.com". Do nothing else.
2. Read every class under "Current classes": the class name exactly as shown and its
   current percent.
3. For each class, open it and read assignments that are new, upcoming, missing or late:
   title, due date (YYYY-MM-DD), and whether the gradebook marks it missing. Note scores
   that changed.
4. Pick the 3 most important things to work on today and a one-line reason each
   (e.g. "Missing since Monday, worth 50 points").
5. Read GRADE_SYNC_SECRET from .env.local in this folder (don't print it), then POST JSON
   to APP_URL/api/sync with header x-sync-secret:
   { "grades": [{ "class", "percent" }],
     "assignments": [{ "class", "title", "due", "kind", "missing" }],
     "missing": [{ "class", "title" }],
     "top3_override": [{ "class", "title", "reason" }] }
   kind is one of homework, test, classwork, project.
6. If the response lists anything under "unmatched", or the request fails, send me a push
   notification with a one-line summary. Otherwise finish quietly.
```

## The endpoint

See `app/api/sync/route.ts` for the exact behavior. In short:

| Field | What the app does |
|---|---|
| `grades` | Adds a history point per class (skipped if identical to today's last check) and updates the class's current grade |
| `assignments` | Adds new ones with `source = 'gradebook'`; skips duplicates (same title + class + due date) |
| `missing` | Marks the matching assignment missing (and not done) |
| `top3_override` | Today's Top 3 on the Today page, with Claude's reasons, instead of the formula |

Classes match by full name, short code or alias. Unknown classes or assignments come back under
`unmatched` and nothing else is affected.
