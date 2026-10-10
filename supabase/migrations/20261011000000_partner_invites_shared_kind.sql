-- Build step 3: partner invites by code, and the duty kind in get_shared_roster so friends'
-- days can be ranked. Tested by supabase/tests/core-schema.test.mjs.

-- ---------------------------------------------------------------------------
-- Partner invites. Nobody can search for anyone, so a partner connects by sharing a code.
-- Whoever enters the code is the one accepting, so the connection is active straight away.
-- ---------------------------------------------------------------------------

create table public.partner_invites (
  code text primary key default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);

create index partner_invites_owner on public.partner_invites (owner_id);

alter table public.partner_invites enable row level security;
revoke all on public.partner_invites from anon, authenticated;

-- You can see and withdraw your own invite. Creating and accepting go through the RPCs below.
grant select, delete on public.partner_invites to authenticated;
create policy partner_invites_owner on public.partner_invites for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- A fresh code for the caller, replacing any earlier one. Fails if they already have a partner.
create function public.create_partner_invite() returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_code text;
begin
  if v_me is null then
    raise exception 'not signed in';
  end if;
  if exists (
    select 1 from public.partners
    where status = 'active' and v_me in (requester_id, addressee_id)
  ) then
    raise exception 'already has a partner';
  end if;
  delete from public.partner_invites where owner_id = v_me;
  insert into public.partner_invites (owner_id) values (v_me) returning code into v_code;
  return v_code;
end;
$$;

-- Connect the caller with the invite's owner as partners. Returns the partner's id.
create function public.accept_partner_invite(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_owner uuid;
begin
  if v_me is null then
    raise exception 'not signed in';
  end if;
  select owner_id into v_owner from public.partner_invites
  where code = upper(btrim(p_code)) and expires_at > now();
  if v_owner is null then
    raise exception 'invite not found';
  end if;
  if v_owner = v_me then
    raise exception 'this is your own invite';
  end if;
  if exists (
    select 1 from public.partners
    where status = 'active' and (v_me in (requester_id, addressee_id) or v_owner in (requester_id, addressee_id))
  ) then
    raise exception 'already has a partner';
  end if;
  -- Replace any earlier pending request between the two.
  delete from public.partners
  where (requester_id = v_owner and addressee_id = v_me) or (requester_id = v_me and addressee_id = v_owner);
  insert into public.partners (requester_id, addressee_id, status, accepted_at)
  values (v_owner, v_me, 'active', now());
  delete from public.partner_invites where owner_id = v_owner;
  return v_owner;
end;
$$;

revoke all on function public.create_partner_invite() from public, anon;
revoke all on function public.accept_partner_invite(text) from public, anon;
grant execute on function public.create_partner_invite() to authenticated;
grant execute on function public.accept_partner_invite(text) to authenticated;

-- ---------------------------------------------------------------------------
-- get_shared_roster now also returns the duty kind, so the app can rank a friend's days.
-- kind follows the same rules as the label: hidden at "off days only", for private days, and
-- for leave, reservist and busy days shown to groups as "Away".
-- (The return type changes, so the function is dropped and created again.)
-- ---------------------------------------------------------------------------

drop function public.get_shared_roster(uuid, date, date);

create function public.get_shared_roster(p_owner uuid, p_from date, p_to date)
returns table (
  day date,
  status text,
  kind text,
  label text,
  sector text,
  flight_number text,
  report_time time,
  depart_time time,
  arrive_time time,
  arrive_date date
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_level text := private.effective_level(p_owner, (select auth.uid()));
  v_detail boolean;
  v_sector boolean;
begin
  if v_level is null then
    return;
  end if;
  if p_to < p_from or p_to - p_from > 62 then
    raise exception 'date range must be 0 to 62 days';
  end if;
  v_sector := v_level in ('destinations', 'full', 'partner', 'owner');
  v_detail := v_level in ('full', 'partner', 'owner');

  return query
  select
    d.duty_date,
    case
      when d.category = 'private' then 'unavailable'
      when d.category in ('off', 'part_off') then 'off'
      when d.category in ('layover', 'leave', 'national_service', 'busy') then 'away'
      else 'busy'
    end,
    case
      when d.category = 'private' or v_level = 'off_days' then null
      when v_level in ('destinations', 'full') and d.category in ('leave', 'national_service', 'busy') then null
      else d.kind
    end,
    case
      when d.category = 'private' then 'Unavailable'
      when v_level = 'off_days' then
        case
          when d.category in ('off', 'part_off') then 'Off'
          when d.category in ('layover', 'leave', 'national_service', 'busy') then 'Away'
          else 'Busy'
        end
      when v_level in ('destinations', 'full') and d.category in ('leave', 'national_service', 'busy') then 'Away'
      else d.friends_label
    end,
    case when v_sector and d.category <> 'private' then d.sector end,
    case when v_detail and d.category <> 'private' then d.flight_number end,
    case when v_detail and d.category <> 'private' then d.report_time end,
    case when v_detail and d.category <> 'private' then d.depart_time end,
    case when v_detail and d.category <> 'private' then d.arrive_time end,
    case when v_detail and d.category <> 'private' then d.arrive_date end
  from public.duties d
  where d.user_id = p_owner and d.duty_date between p_from and p_to

  union all

  select
    g.day::date,
    'away',
    null::text,
    case
      when v_level in ('partner', 'owner') then
        case h.kind
          when 'holiday' then 'Holiday'
          when 'annual_leave' then 'Annual leave'
          when 'busy_personal' then 'Busy'
          else 'Reservist'
        end
      else 'Away'
    end,
    null, null, null, null, null, null
  from public.holidays h
  cross join lateral generate_series(
    greatest(h.start_date, p_from), least(h.end_date, p_to), interval '1 day'
  ) as g(day)
  where h.user_id = p_owner and h.start_date <= p_to and h.end_date >= p_from

  order by 1;
end;
$$;

revoke all on function public.get_shared_roster(uuid, date, date) from public, anon;
grant execute on function public.get_shared_roster(uuid, date, date) to authenticated;
