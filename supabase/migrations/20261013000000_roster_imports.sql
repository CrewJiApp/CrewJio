-- Screenshot roster import: a log of imports so each person has a monthly limit (the Claude API
-- costs money per import). Nothing about the roster itself is stored here, and the screenshots
-- are never stored anywhere: they go straight to the roster-import Edge Function and are
-- discarded after reading. See CLAUDE.md "Roster import".

create table public.roster_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  images int not null check (images between 1 and 4),
  -- started: sent to Claude. done: rows came back. failed: nothing usable (does not count).
  status text not null default 'started' check (status in ('started', 'done', 'failed')),
  created_at timestamptz not null default now()
);

create index roster_imports_user_month on public.roster_imports (user_id, created_at);

alter table public.roster_imports enable row level security;

-- People can see their own imports (for "2 imports left this month"). Only the Edge Function,
-- with the service role, writes them.
create policy roster_imports_select_own on public.roster_imports
  for select to authenticated using (user_id = (select auth.uid()));

grant select on public.roster_imports to authenticated;

-- Reserve one import. Returns the new row's id, or null when the person has used up the month.
-- The month runs on Singapore time. The advisory lock stops two imports at once slipping past
-- the limit.
create function public.claim_roster_import(p_user uuid, p_images int, p_limit int)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_start timestamptz := date_trunc('month', now() at time zone 'Asia/Singapore') at time zone 'Asia/Singapore';
  v_used int;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));
  select count(*) into v_used from public.roster_imports
    where user_id = p_user and created_at >= v_start and status <> 'failed';
  if v_used >= p_limit then
    return null;
  end if;
  insert into public.roster_imports (user_id, images) values (p_user, p_images) returning id into v_id;
  return v_id;
end;
$$;

create function public.finish_roster_import(p_id uuid, p_status text)
returns void
language sql security definer set search_path = '' as $$
  update public.roster_imports set status = p_status where id = p_id and p_status in ('done', 'failed');
$$;

-- How many are left this month (for the app).
create function public.roster_imports_left(p_limit int)
returns int
language sql stable security definer set search_path = '' as $$
  select greatest(p_limit - count(*), 0)::int from public.roster_imports
  where user_id = (select auth.uid())
    and status <> 'failed'
    and created_at >= date_trunc('month', now() at time zone 'Asia/Singapore') at time zone 'Asia/Singapore';
$$;

revoke all on function public.claim_roster_import(uuid, int, int) from public, anon, authenticated;
revoke all on function public.finish_roster_import(uuid, text) from public, anon, authenticated;
revoke all on function public.roster_imports_left(int) from public, anon;
grant execute on function public.claim_roster_import(uuid, int, int) to service_role;
grant execute on function public.finish_roster_import(uuid, text) to service_role;
grant execute on function public.roster_imports_left(int) to authenticated;
