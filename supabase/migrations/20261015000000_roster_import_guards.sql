-- Cost guards for the screenshot roster import. Every read costs money (Claude API), so on top of
-- the monthly limit per person (which only counts reads that worked) there are now:
--   * one import at a time per person (stops many parallel requests),
--   * a daily limit per person that counts failed reads too (junk images still cost money),
--   * a daily limit across everybody (stops many throwaway accounts from adding up).
-- Nothing about the roster itself is stored. See CLAUDE.md "Roster import".

create index roster_imports_created on public.roster_imports (created_at);

drop function public.claim_roster_import(uuid, int, int);

-- Reserve one import. Returns the new row's id, or a reason it was refused:
--   busy          the person already has a read running (started in the last 3 minutes)
--   limit_reached the monthly limit (Singapore time) is used up, not counting failed reads
--   daily_limit   too many tries in the last 24 hours, failed ones included
--   service_busy  everybody together has used the last 24 hours' allowance
-- The advisory lock stops two imports at once slipping past the checks.
create function public.claim_roster_import(p_user uuid, p_images int, p_limit int, p_user_day int, p_all_day int)
returns table (import_id uuid, reason text)
language plpgsql security definer set search_path = '' as $$
declare
  v_start timestamptz := date_trunc('month', now() at time zone 'Asia/Singapore') at time zone 'Asia/Singapore';
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));

  if exists (select 1 from public.roster_imports
             where user_id = p_user and status = 'started' and created_at > now() - interval '3 minutes') then
    return query select null::uuid, 'busy'::text;
    return;
  end if;

  if (select count(*) from public.roster_imports
      where user_id = p_user and created_at >= v_start and status <> 'failed') >= p_limit then
    return query select null::uuid, 'limit_reached'::text;
    return;
  end if;

  if (select count(*) from public.roster_imports
      where user_id = p_user and created_at > now() - interval '24 hours') >= p_user_day then
    return query select null::uuid, 'daily_limit'::text;
    return;
  end if;

  if (select count(*) from public.roster_imports where created_at > now() - interval '24 hours') >= p_all_day then
    return query select null::uuid, 'service_busy'::text;
    return;
  end if;

  insert into public.roster_imports (user_id, images) values (p_user, p_images) returning id into v_id;
  return query select v_id, null::text;
end;
$$;

revoke all on function public.claim_roster_import(uuid, int, int, int, int) from public, anon, authenticated;
grant execute on function public.claim_roster_import(uuid, int, int, int, int) to service_role;
