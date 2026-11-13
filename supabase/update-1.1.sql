-- CoLab Reef 1.1: one teacher passcode instead of email accounts. Safe to run more than once.
create table if not exists app_settings (id int primary key default 1 check (id = 1), teacher_hash text not null);
alter table app_settings enable row level security;
alter table classes alter column owner drop not null;
alter table sessions alter column owner drop not null;

create or replace function teacher_status() returns boolean language sql security definer set search_path = public as $$
  select exists(select 1 from app_settings);
$$;
create or replace function teacher_ok(p_key text) returns boolean language plpgsql security definer set search_path = public as $$
begin
  if exists(select 1 from app_settings where teacher_hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex')) then return true; end if;
  perform pg_sleep(0.5);
  return false;
end $$;
create or replace function teacher_setup(p_key text) returns boolean language plpgsql security definer set search_path = public as $$
begin
  if length(p_key) < 8 then raise exception 'The passcode needs at least 8 characters'; end if;
  insert into app_settings (id, teacher_hash) values (1, encode(sha256(convert_to(p_key, 'UTF8')), 'hex')) on conflict (id) do nothing;
  return teacher_ok(p_key);
end $$;
create or replace function teacher_do(p_key text, p_action text, p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if not teacher_ok(p_key) then raise exception 'Wrong passcode'; end if;
  if p_action = 'list_classes' then
    select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at), '[]') into r from classes c;
  elsif p_action = 'save_class' then
    insert into classes as c (id, name, is_sample, students, settings)
    values ((p_data->>'id')::uuid, p_data->>'name', coalesce((p_data->>'is_sample')::boolean, false), coalesce(p_data->'students', '[]'), coalesce(p_data->'settings', '{}'))
    on conflict (id) do update set name = excluded.name, is_sample = excluded.is_sample, students = excluded.students, settings = excluded.settings
    returning to_jsonb(c) into r;
  elsif p_action = 'delete_class' then
    delete from classes where id = (p_data->>'id')::uuid; r := 'true';
  elsif p_action = 'list_sessions' then
    select coalesce(jsonb_agg(to_jsonb(s) order by s.created_at), '[]') into r from sessions s;
  elsif p_action = 'save_session' then
    insert into sessions as s (id, class_id, code, title, mode, playlist, state, status)
    values ((p_data->>'id')::uuid, (p_data->>'class_id')::uuid, p_data->>'code', p_data->>'title', p_data->>'mode', coalesce(p_data->'playlist', '[]'), coalesce(p_data->'state', '{}'), coalesce(p_data->>'status', 'live'))
    on conflict (id) do update set title = excluded.title, mode = excluded.mode, playlist = excluded.playlist, state = excluded.state, status = excluded.status
    returning to_jsonb(s) into r;
  elsif p_action = 'delete_session' then
    delete from sessions where id = (p_data->>'id')::uuid; r := 'true';
  else raise exception 'Unknown action';
  end if;
  return r;
end $$;
grant execute on function teacher_status() to anon, authenticated;
grant execute on function teacher_ok(text) to anon, authenticated;
grant execute on function teacher_setup(text) to anon, authenticated;
grant execute on function teacher_do(text, text, jsonb) to anon, authenticated;
