-- CoLab Reef database. Run once in the Supabase SQL editor.
-- Student data stored: first name and class only (inside classes.students).

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  is_sample boolean not null default false,
  students jsonb not null default '[]',   -- [{ id, name }]  first names only
  settings jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  class_id uuid not null references classes on delete cascade,
  code text not null unique,
  title text not null,
  mode text not null,                      -- online | devices | one
  playlist jsonb not null default '[]',
  state jsonb not null default '{}',
  status text not null default 'live',
  created_at timestamptz not null default now()
);

create table if not exists entries (
  id text primary key,
  session_id uuid not null references sessions on delete cascade,
  class_id uuid not null,
  student_id text,
  step int not null default 0,
  kind text not null,
  data jsonb not null default '{}',
  at bigint not null
);
create index if not exists entries_session on entries (session_id);
create index if not exists entries_class_kind on entries (class_id, kind);

alter table classes enable row level security;
alter table sessions enable row level security;
alter table entries enable row level security;

-- Teachers own their classes and sessions.
create policy "owner classes" on classes for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy "owner sessions" on sessions for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
-- Students (no account) can read a session and read/write entries. Sessions hold ids, not names.
create policy "read sessions" on sessions for select to anon using (true);
create policy "read entries" on entries for select to anon, authenticated using (true);
create policy "write entries" on entries for insert to anon, authenticated with check (true);
create policy "update entries" on entries for update to anon, authenticated using (true) with check (true);

-- Students get the roster only through a valid join code, never by listing classes.
create or replace function join_lookup(p_code text) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object('session', to_jsonb(s), 'class', to_jsonb(c))
  from sessions s join classes c on c.id = s.class_id
  where s.code = upper(p_code) limit 1;
$$;
grant execute on function join_lookup(text) to anon, authenticated;

alter publication supabase_realtime add table sessions;
alter publication supabase_realtime add table entries;
