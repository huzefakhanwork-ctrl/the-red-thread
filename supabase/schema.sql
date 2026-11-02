-- THE RED THREAD — The Questioners' Club database (Supabase / PostgreSQL)
-- Run once in Supabase → SQL Editor → New query → paste → Run. Safe to re-run: it creates what's missing.
-- Security model: every table has row-level security (RLS). The website only holds the publishable key, so these
-- policies are the real permission system. Roles live in profiles.role and only an admin can change them.

create extension if not exists pgcrypto;

-- ============ members ============
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[A-Za-z0-9._]{3,20}$'),
  bio text check (char_length(bio) <= 160),
  interests text[] not null default '{}',
  role text not null default 'member' check (role in ('member', 'moderator', 'editor', 'admin')),
  is_adult boolean not null default false check (is_adult),
  suspended_until timestamptz,
  created_at timestamptz not null default now()
);

-- role helpers (security definer so policies can call them without recursion)
create or replace function public.my_role() returns text language sql stable security definer set search_path = public as
$$ select coalesce((select role from public.profiles where id = auth.uid()), 'guest') $$;
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path = public as
$$ select public.my_role() in ('moderator', 'editor', 'admin') $$;
create or replace function public.is_editor() returns boolean language sql stable security definer set search_path = public as
$$ select public.my_role() in ('editor', 'admin') $$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as
$$ select public.my_role() = 'admin' $$;
create or replace function public.can_post() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.profiles where id = auth.uid() and (suspended_until is null or suspended_until < now())) $$;

-- members can't promote themselves or lift their own suspension (the SQL Editor, with no signed-in user, can)
create or replace function public.guard_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role then raise exception 'Only an admin can change roles'; end if;
    if new.suspended_until is distinct from old.suspended_until and not public.is_staff() then raise exception 'Only moderators can suspend'; end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_profile on public.profiles;
create trigger guard_profile before update on public.profiles for each row execute function public.guard_profile();

-- ============ research ============
create table if not exists public.investigations (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 5 and 160),
  question text not null check (char_length(question) <= 300),
  why text check (char_length(why) <= 1000),
  subqs text[] not null default '{}',
  topic text,
  story_id text,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  hidden boolean not null default false
);
create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  investigation_id uuid not null references public.investigations (id) on delete cascade,
  title text not null check (char_length(title) <= 300),
  url text check (url is null or url ~ '^https?://'),
  publisher text, published text, type text,
  verified boolean not null default false,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  hidden boolean not null default false
);
create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  investigation_id uuid not null references public.investigations (id) on delete cascade,
  body text not null check (char_length(body) <= 400),
  status text not null default 'review' check (status in ('review', 'disputed', 'verified')),
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  hidden boolean not null default false
);
create table if not exists public.claim_responses (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  kind text not null check (kind in ('supports', 'challenges', 'context', 'wording')),
  body text not null check (char_length(body) <= 2000),
  source_id uuid references public.sources (id) on delete set null,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  hidden boolean not null default false
);
create table if not exists public.perspectives (
  id uuid primary key default gen_random_uuid(),
  investigation_id uuid not null references public.investigations (id) on delete cascade,
  who text not null, view text not null check (char_length(view) <= 1000),
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  hidden boolean not null default false
);
create table if not exists public.open_questions (
  id uuid primary key default gen_random_uuid(),
  investigation_id uuid not null references public.investigations (id) on delete cascade,
  body text not null check (char_length(body) <= 400),
  resolved boolean not null default false,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  hidden boolean not null default false
);
create table if not exists public.findings (
  investigation_id uuid primary key references public.investigations (id) on delete cascade,
  body text not null check (char_length(body) <= 20000),
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  updated_at timestamptz not null default now(),
  published boolean not null default false,
  verified boolean not null default false,
  hidden boolean not null default false
);

-- ============ conversation ============
create table if not exists public.discussions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 5 and 200),
  why text not null check (char_length(why) between 3 and 300),
  body text check (char_length(body) <= 5000),
  link text check (link is null or link = '' or link ~ '^https?://'),
  topic text,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  hidden boolean not null default false
);
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  investigation_id uuid references public.investigations (id) on delete cascade,
  discussion_id uuid references public.discussions (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 3000),
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  hidden boolean not null default false,
  check ((investigation_id is null) <> (discussion_id is null))
);
create table if not exists public.reactions (
  discussion_id uuid not null references public.discussions (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('useful', 'insightful')),
  primary key (discussion_id, user_id, kind)
);

-- ============ missing stories + events ============
create table if not exists public.missing_stories (
  id uuid primary key default gen_random_uuid(),
  headline text not null check (char_length(headline) between 5 and 160),
  place text not null, what text not null, why text not null, sources text, next text,
  status text not null default 'submitted' check (status in ('submitted', 'research', 'editorial', 'published', 'notpursued')),
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  hidden boolean not null default false
);
create table if not exists public.missing_notes (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.missing_stories (id) on delete cascade,
  body text not null check (char_length(body) <= 2000),
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  hidden boolean not null default false
);
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null, kind text, place text, link text,
  starts_at timestamptz not null,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.event_interest (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  primary key (event_id, user_id)
);

-- ============ follows, saves, notifications ============
create table if not exists public.follows (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('investigation', 'discussion', 'member', 'topic')),
  target_id text not null,
  saved boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null, body text not null, link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============ trust: reports, moderation, history ============
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null, target_id text not null,
  reason text not null, detail text check (char_length(detail) <= 2000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open', 'actioned', 'appealed', 'closed')),
  action text, handled_by uuid references public.profiles (id), handled_at timestamptz
);
create table if not exists public.context_notes (
  id uuid primary key default gen_random_uuid(),
  target_type text not null, target_id text not null, note text not null,
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
-- append-only audit log: no update or delete policy exists, so nobody using the site can change it
create table if not exists public.moderation_log (
  id bigint generated always as identity primary key,
  actor uuid default auth.uid() references public.profiles (id),
  action text not null, target_type text, target_id text, note text,
  created_at timestamptz not null default now()
);
create table if not exists public.history (
  id bigint generated always as identity primary key,
  investigation_id uuid not null references public.investigations (id) on delete cascade,
  actor uuid references public.profiles (id) on delete set null,
  what text not null,
  created_at timestamptz not null default now()
);

create index if not exists sources_inv on public.sources (investigation_id);
create index if not exists claims_inv on public.claims (investigation_id);
create index if not exists responses_claim on public.claim_responses (claim_id);
create index if not exists comments_inv on public.comments (investigation_id);
create index if not exists comments_disc on public.comments (discussion_id);
create index if not exists history_inv on public.history (investigation_id, created_at desc);
create index if not exists notif_user on public.notifications (user_id, created_at desc);
create index if not exists reports_open on public.reports (status, created_at desc);

-- ============ automatic behaviour ============
-- rate limit: at most 30 new posts of each kind per member per hour
create or replace function public.rate_limit() returns trigger language plpgsql security definer set search_path = public as $$
declare n int;
begin
  execute format('select count(*) from public.%I where created_by = $1 and created_at > now() - interval ''1 hour''', TG_TABLE_NAME) into n using auth.uid();
  if n >= 30 then raise exception 'Slow down: you''ve posted a lot in the last hour. Try again later.'; end if;
  return new;
end $$;

-- only staff may hide/unhide; only editors may set "verified"
create or replace function public.guard_content() returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- the SQL Editor (no signed-in user) and this file's own automatic rules may change anything
  if auth.uid() is null or current_setting('rt.system', true) = 'on' then return new; end if;
  if new.created_by is distinct from old.created_by then raise exception 'Authorship can''t be changed'; end if;
  if new.hidden is distinct from old.hidden and not public.is_staff() then raise exception 'Only moderators can hide content'; end if;
  if TG_TABLE_NAME = 'open_questions' and old.created_by <> auth.uid() and not public.is_staff() and (new.body is distinct from old.body or new.investigation_id is distinct from old.investigation_id) then raise exception 'You can only mark someone else''s question answered'; end if;
  if TG_TABLE_NAME = 'claims' and new.status is distinct from old.status and not public.is_staff() then raise exception 'Only moderators and editors can change a claim''s status'; end if;
  if TG_TABLE_NAME = 'claims' and new.status = 'verified' and old.status <> 'verified' and not public.is_editor() then raise exception 'Only editors can verify'; end if;
  if TG_TABLE_NAME = 'findings' and new.verified is distinct from old.verified and not public.is_editor() then raise exception 'Only editors can verify'; end if;
  if TG_TABLE_NAME = 'sources' and new.verified is distinct from old.verified and not public.is_editor() then raise exception 'Only editors can verify sources'; end if;
  if TG_TABLE_NAME = 'missing_stories' and new.status is distinct from old.status and not public.is_editor() then raise exception 'Only editors move stories through review'; end if;
  return new;
end $$;

-- activity history for an investigation
create or replace function public.log_history() returns trigger language plpgsql security definer set search_path = public as $$
declare inv uuid; what text;
begin
  if TG_TABLE_NAME = 'investigations' then inv := new.id; what := 'started the investigation';
  elsif TG_TABLE_NAME = 'claim_responses' then select investigation_id into inv from public.claims where id = new.claim_id; what := 'responded to a claim (' || new.kind || ')';
  elsif TG_TABLE_NAME = 'comments' then inv := new.investigation_id; what := 'commented';
  elsif TG_TABLE_NAME = 'findings' then inv := new.investigation_id; what := case when TG_OP = 'INSERT' then 'wrote the findings' else 'updated the findings' end;
  else inv := new.investigation_id; what := 'added ' || replace(rtrim(TG_TABLE_NAME, 's'), '_', ' ');
  end if;
  if inv is not null then insert into public.history (investigation_id, actor, what) values (inv, auth.uid(), what); end if;
  return new;
end $$;

-- a disputed claim: two challenges flip "under review" to "disputed"
create or replace function public.auto_dispute() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'challenges' and (select count(*) from public.claim_responses where claim_id = new.claim_id and kind = 'challenges') >= 2 then
    perform set_config('rt.system', 'on', true);
    update public.claims set status = 'disputed' where id = new.claim_id and status = 'review';
    perform set_config('rt.system', 'off', true);
  end if;
  return new;
end $$;

-- the first community note on a missing story moves it from "submitted" to "community research"
create or replace function public.story_to_research() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform set_config('rt.system', 'on', true);
  update public.missing_stories set status = 'research' where id = new.story_id and status = 'submitted';
  perform set_config('rt.system', 'off', true);
  return new;
end $$;

-- notifications: replies, comments on your investigation/discussion, @mentions
create or replace function public.notify_comment() returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid; me text; link text; m text;
begin
  select username into me from public.profiles where id = new.created_by;
  link := case when new.investigation_id is not null then 'inv:' || new.investigation_id else 'disc:' || new.discussion_id end;
  if new.parent_id is not null then select created_by into owner from public.comments where id = new.parent_id;
  elsif new.investigation_id is not null then select created_by into owner from public.investigations where id = new.investigation_id;
  else select created_by into owner from public.discussions where id = new.discussion_id; end if;
  if owner is not null and owner <> new.created_by then
    insert into public.notifications (user_id, kind, body, link) values (owner, 'reply', '@' || me || ' replied to you', link);
  end if;
  for m in select distinct (regexp_matches(new.body, '@([A-Za-z0-9._]{3,20})', 'g'))[1] loop
    insert into public.notifications (user_id, kind, body, link)
      select id, 'mention', '@' || me || ' mentioned you', link from public.profiles where username = m and id <> new.created_by and id is distinct from owner;
  end loop;
  return new;
end $$;

-- the investigation's followers hear about new evidence
create or replace function public.notify_followers() returns trigger language plpgsql security definer set search_path = public as $$
declare inv uuid; me text;
begin
  inv := new.investigation_id;
  select username into me from public.profiles where id = auth.uid();
  insert into public.notifications (user_id, kind, body, link)
    select f.user_id, 'update', '@' || coalesce(me, 'someone') || ' ' || new.what, 'inv:' || inv
    from public.follows f where f.target_type = 'investigation' and f.target_id = inv::text and f.user_id is distinct from auth.uid();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['investigations', 'sources', 'claims', 'claim_responses', 'perspectives', 'open_questions', 'discussions', 'comments', 'missing_stories', 'missing_notes'] loop
    execute format('drop trigger if exists rate_limit on public.%I', t);
    execute format('create trigger rate_limit before insert on public.%I for each row execute function public.rate_limit()', t);
  end loop;
  foreach t in array array['investigations', 'sources', 'claims', 'claim_responses', 'perspectives', 'open_questions', 'findings', 'discussions', 'comments', 'missing_stories', 'missing_notes'] loop
    execute format('drop trigger if exists guard_content on public.%I', t);
    execute format('create trigger guard_content before update on public.%I for each row execute function public.guard_content()', t);
  end loop;
  foreach t in array array['investigations', 'sources', 'claims', 'claim_responses', 'perspectives', 'open_questions'] loop
    execute format('drop trigger if exists log_history on public.%I', t);
    execute format('create trigger log_history after insert on public.%I for each row execute function public.log_history()', t);
  end loop;
end $$;
drop trigger if exists log_history on public.findings;
create trigger log_history after insert or update on public.findings for each row execute function public.log_history();
drop trigger if exists log_history on public.comments;
create trigger log_history after insert on public.comments for each row when (new.investigation_id is not null) execute function public.log_history();
drop trigger if exists auto_dispute on public.claim_responses;
create trigger auto_dispute after insert on public.claim_responses for each row execute function public.auto_dispute();
drop trigger if exists story_to_research on public.missing_notes;
create trigger story_to_research after insert on public.missing_notes for each row execute function public.story_to_research();
drop trigger if exists notify_comment on public.comments;
create trigger notify_comment after insert on public.comments for each row execute function public.notify_comment();
drop trigger if exists notify_followers on public.history;
create trigger notify_followers after insert on public.history for each row execute function public.notify_followers();

-- ============ row-level security ============
do $$
declare t text;
begin
  foreach t in array array['profiles', 'investigations', 'sources', 'claims', 'claim_responses', 'perspectives', 'open_questions', 'findings', 'discussions', 'comments', 'reactions', 'missing_stories', 'missing_notes', 'events', 'event_interest', 'follows', 'notifications', 'reports', 'context_notes', 'moderation_log', 'history'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
  -- community content: public to read unless hidden; members post as themselves; you edit/delete only your own; staff can moderate
  foreach t in array array['investigations', 'sources', 'claims', 'claim_responses', 'perspectives', 'open_questions', 'findings', 'discussions', 'comments', 'missing_stories', 'missing_notes'] loop
    execute format('drop policy if exists "read" on public.%I', t);
    execute format('create policy "read" on public.%I for select using (not hidden or created_by = auth.uid() or public.is_staff())', t);
    execute format('drop policy if exists "post" on public.%I', t);
    execute format('create policy "post" on public.%I for insert to authenticated with check (created_by = auth.uid() and public.can_post())', t);
    execute format('drop policy if exists "edit" on public.%I', t);
    execute format('create policy "edit" on public.%I for update to authenticated using (created_by = auth.uid() or public.is_staff()) with check (created_by = auth.uid() or public.is_staff())', t);
    execute format('drop policy if exists "delete" on public.%I', t);
    execute format('create policy "delete" on public.%I for delete to authenticated using (created_by = auth.uid() or public.is_staff())', t);
  end loop;
end $$;

-- open questions: any member can mark one answered (the guard stops them changing its wording)
drop policy if exists "edit" on public.open_questions;
create policy "edit" on public.open_questions for update to authenticated using (public.can_post()) with check (true);

-- profiles: public to read; you create and edit only your own (roles guarded by trigger)
drop policy if exists "read" on public.profiles;
create policy "read" on public.profiles for select using (true);
drop policy if exists "create own" on public.profiles;
create policy "create own" on public.profiles for insert to authenticated with check (id = auth.uid() and role = 'member' and suspended_until is null);
drop policy if exists "edit own" on public.profiles;
create policy "edit own" on public.profiles for update to authenticated using (id = auth.uid() or public.is_staff()) with check (true);

-- reactions, follows, event interest: yours only
drop policy if exists "read" on public.reactions;
create policy "read" on public.reactions for select using (true);
drop policy if exists "mine" on public.reactions;
create policy "mine" on public.reactions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.can_post());
drop policy if exists "mine" on public.follows;
create policy "mine" on public.follows for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "read" on public.event_interest;
create policy "read" on public.event_interest for select using (true);
drop policy if exists "mine" on public.event_interest;
create policy "mine" on public.event_interest for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- events: everyone reads; staff manage
drop policy if exists "read" on public.events;
create policy "read" on public.events for select using (true);
drop policy if exists "staff" on public.events;
create policy "staff" on public.events for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- notifications: only yours; you can mark them read
drop policy if exists "mine" on public.notifications;
create policy "mine" on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists "mark read" on public.notifications;
create policy "mark read" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reports: anyone (even a guest) can file one; you see your own; staff see and handle all
drop policy if exists "file" on public.reports;
create policy "file" on public.reports for insert with check ((auth.uid() is null and created_by is null) or created_by = auth.uid());
drop policy if exists "see" on public.reports;
create policy "see" on public.reports for select using (created_by = auth.uid() or public.is_staff());
drop policy if exists "handle" on public.reports;
create policy "handle" on public.reports for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- context notes: public; staff write
drop policy if exists "read" on public.context_notes;
create policy "read" on public.context_notes for select using (true);
drop policy if exists "staff" on public.context_notes;
create policy "staff" on public.context_notes for insert to authenticated with check (public.is_staff() and created_by = auth.uid());

-- moderation log: staff read and append; nobody edits or deletes
drop policy if exists "staff read" on public.moderation_log;
create policy "staff read" on public.moderation_log for select to authenticated using (public.is_staff());
drop policy if exists "staff append" on public.moderation_log;
create policy "staff append" on public.moderation_log for insert to authenticated with check (public.is_staff() and actor = auth.uid());

-- history: public to read; written only by the triggers above
drop policy if exists "read" on public.history;
create policy "read" on public.history for select using (true);

-- table access for the website's two roles (RLS above still decides row by row)
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant insert on public.reports to anon;
revoke update, delete on public.moderation_log, public.history from authenticated;
revoke insert on public.history from authenticated;
grant usage on all sequences in schema public to authenticated;

-- ============ after you sign up on the site, make yourself admin (replace the username) ============
-- update public.profiles set role = 'admin' where username = 'your_username';
