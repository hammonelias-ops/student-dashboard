-- Stage 2: tables, row level security, and the private `attachments` bucket.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste this file → Run.
--
-- Every table has user_id (filled in automatically from the signed-in user),
-- and RLS means each user can only ever see or change their own rows.

-- ───────────────────────── Tables ─────────────────────────

create table public.classes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,                      -- "Chemistry"
  code       text,                               -- "CHM"
  aliases    text[] not null default '{}',       -- {"chem"} so quick add / voice can match it
  teacher    text,
  color      text,                               -- one color per class, used everywhere
  grade      numeric(5, 2),                      -- current grade %
  goal       numeric(5, 2) not null default 85,  -- goal %
  created_at timestamptz not null default now()
);

create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  class_id    uuid not null references public.classes (id),
  title       text not null,
  description text,
  teacher     text,
  due_at      timestamptz not null,
  kind        text not null default 'homework'
              check (kind in ('homework', 'test', 'classwork', 'project')),
  priority    text not null default 'normal' check (priority in ('normal', 'high')),
  missing     boolean not null default false,
  done        boolean not null default false,
  source      text not null default 'manual' check (source in ('manual', 'gradebook', 'voice')),
  created_at  timestamptz not null default now()
);

create table public.attachments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  task_id    uuid not null references public.tasks (id) on delete cascade,
  path       text not null,   -- path in the `attachments` bucket: <user_id>/<task_id>/<file>
  name       text not null,   -- original file name
  mime       text,
  created_at timestamptz not null default now()
);

create table public.habits (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,   -- "Workout 30 min"
  created_at timestamptz not null default now()
);

create table public.habit_log (
  user_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  day      date not null,
  primary key (habit_id, day)
);

create table public.sleep_log (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day     date not null,
  hours   numeric(4, 2) not null check (hours >= 0 and hours <= 24),
  primary key (user_id, day)
);

create table public.grades (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  class_id   uuid not null references public.classes (id) on delete cascade,
  percent    numeric(5, 2) not null,
  checked_at timestamptz not null default now()   -- one row per check = trend history
);

-- Claude's Top 3 from the daily gradebook check (overrides the formula for that day)
create table public.daily_pick (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day     date not null,
  top3    jsonb not null,
  primary key (user_id, day)
);

-- Indexes for the common lookups
create index on public.classes (user_id);
create index on public.tasks (user_id, done, due_at);
create index on public.tasks (class_id);
create index on public.attachments (task_id);
create index on public.habits (user_id);
create index on public.habit_log (user_id, day);
create index on public.grades (class_id, checked_at);

-- ───────────────────────── Row level security ─────────────────────────
-- One policy per table: signed-in users can read/write only rows where user_id is theirs.
-- (select auth.uid()) is wrapped in a select so Postgres evaluates it once per query.

do $$
declare t text;
begin
  foreach t in array array[
    'classes', 'tasks', 'attachments', 'habits', 'habit_log', 'sleep_log', 'grades', 'daily_pick'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end $$;

-- ───────────────────────── Storage ─────────────────────────
-- Private bucket for assignment files and photos (max 20 MB each).
-- Files live under a folder named after the user's id: <user_id>/<task_id>/<file>

insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 20971520)
on conflict (id) do nothing;

create policy "own files: read" on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "own files: upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "own files: update" on storage.objects for update to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "own files: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
