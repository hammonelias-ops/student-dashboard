-- Stage 6: calendar events (breaks, school dates, events, work shifts).
-- Run once in the Supabase dashboard: SQL Editor → New query → paste this file → Run.

create table public.events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title      text not null,
  kind       text not null check (kind in ('break', 'school', 'event', 'shift')),
  start_date date not null,
  end_date   date not null,                -- inclusive; same as start_date for one-day events
  start_time time,                         -- optional ("7:00 PM concert")
  end_time   time,                         -- optional (work shifts)
  location   text,
  note       text,
  source     text not null default 'manual' check (source in ('manual', 'school')),
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index on public.events (user_id, start_date);

alter table public.events enable row level security;

create policy "own rows" on public.events for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
