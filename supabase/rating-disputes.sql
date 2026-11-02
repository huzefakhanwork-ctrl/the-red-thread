-- THE RED THREAD — "Dispute this rating": readers challenge an outlet's left / centre / right label.
-- Run once in Supabase → SQL Editor (safe to run again). Needs schema.sql to have run first.
-- Every dispute and every decision is public: that is the point. Signed-in members file them (rate-limited);
-- editors decide, and must write the reason.

create table if not exists public.rating_disputes (
  id uuid primary key default gen_random_uuid(),
  outlet_id text not null check (char_length(outlet_id) between 1 and 60),
  outlet_name text not null check (char_length(outlet_name) between 1 and 120),
  current_lean text not null check (current_lean in ('L', 'LL', 'C', 'LR', 'R', 'U')),
  suggested_lean text not null check (suggested_lean in ('L', 'LL', 'C', 'LR', 'R', 'U')),
  reason text not null check (char_length(reason) between 20 and 1500),
  evidence text[] not null default '{}' check (cardinality(evidence) <= 3),
  status text not null default 'open' check (status in ('open', 'reviewing', 'changed', 'kept')),
  decision text check (char_length(decision) <= 1500),
  new_lean text check (new_lean in ('L', 'LL', 'C', 'LR', 'R', 'U')),
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz
);
create index if not exists rating_disputes_recent on public.rating_disputes (created_at desc);

-- members can't decide their own dispute; a decision needs a written reason
create or replace function public.guard_dispute() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if not public.is_editor() then raise exception 'Only editors can decide a rating dispute'; end if;
  if new.created_by is distinct from old.created_by or new.reason is distinct from old.reason or new.outlet_id is distinct from old.outlet_id then raise exception 'The dispute itself can''t be changed'; end if;
  if new.status in ('changed', 'kept') and char_length(coalesce(new.decision, '')) < 20 then raise exception 'Write the reason for the decision (at least 20 characters)'; end if;
  if new.status = 'changed' and new.new_lean is null then raise exception 'Pick the new label'; end if;
  new.decided_by := auth.uid(); new.decided_at := now();
  return new;
end $$;
drop trigger if exists guard_dispute on public.rating_disputes;
create trigger guard_dispute before update on public.rating_disputes for each row execute function public.guard_dispute();
drop trigger if exists rate_limit on public.rating_disputes;
create trigger rate_limit before insert on public.rating_disputes for each row execute function public.rate_limit();

alter table public.rating_disputes enable row level security;
drop policy if exists "read" on public.rating_disputes;
create policy "read" on public.rating_disputes for select using (true);
drop policy if exists "file" on public.rating_disputes;
create policy "file" on public.rating_disputes for insert to authenticated
  with check (created_by = auth.uid() and public.can_post() and status = 'open' and decision is null and new_lean is null and decided_by is null);
drop policy if exists "decide" on public.rating_disputes;
create policy "decide" on public.rating_disputes for update to authenticated using (public.is_editor()) with check (public.is_editor());

grant select on public.rating_disputes to anon, authenticated;
grant insert, update on public.rating_disputes to authenticated;
