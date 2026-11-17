# student-dashboard
Personal dashboard for school and life: tasks, calendar, grades, habits, sleep and reminders.

## Run it locally

```
npm install
npm run dev
```

Then open http://localhost:3000. The problem definition page is at `/problem.html`.
See `docs/PLAN.md` for the build stages.

## Supabase setup (Stage 2, one time)

1. Create a free project at supabase.com.
2. **SQL Editor → New query**: paste `supabase/migrations/0001_init.sql` and run it. This creates the tables, row level security and the private `attachments` bucket.
3. Copy `.env.example` to `.env.local` and fill in the project URL, anon key (Project Settings → API) and your email as `ALLOWED_EMAIL`.
4. **Authentication → URL Configuration**: Site URL `http://localhost:3000`; add `http://localhost:3000/**` (and your Vercel URL + `/**` later) to Redirect URLs.
5. **Authentication → Emails → Magic Link** template: change the link to
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
   so the link works even if your phone opens it in a different browser than the one you signed in from.
6. Restart `npm run dev`, sign in with your email, then turn off **Authentication → Sign In / Providers → Allow new users to sign up** so nobody else can make an account.
