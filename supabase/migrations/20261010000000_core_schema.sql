-- Core app schema: profiles, duties, holidays, groups, group_members, partners, sharing_overrides.
-- Sharing rules: see CLAUDE.md "Sharing and privacy". Tested by supabase/tests/core-schema.test.mjs.
--
-- Summary:
-- * Duties and holidays are readable at table level by their owner only.
-- * Everyone else reads them through get_shared_roster(owner, from, to), which redacts each day
--   to the viewer's effective sharing level. Raw roster codes and notes never leave the owner.
-- * Effective level = the most generous level the owner shares with any group both people are in,
--   capped by the owner's per-person override. An active partner sees full detail.
-- * Private codes (category 'private') always show as "Unavailable", even to the partner.
-- * Groups never see each other: all group data is visible to that group's members only.

-- ---------------------------------------------------------------------------
-- Types and helpers
-- ---------------------------------------------------------------------------

-- Ordered least to most generous, so greatest()/least()/max() work. 'hidden' is only valid
-- in sharing_overrides.
create type public.sharing_level as enum ('hidden', 'off_days', 'destinations', 'full');

create schema if not exists private;
grant usage on schema private to authenticated;

create function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  role text not null check (role in ('cabin_crew', 'pilot')),
  airline text not null check (airline in ('SIA', 'Scoot', 'other')),
  rank text check (
    rank is null
    or (role = 'cabin_crew' and rank in ('flight_steward', 'leading_steward', 'chief_steward', 'inflight_supervisor'))
    or (role = 'pilot' and rank in ('second_officer', 'first_officer', 'captain'))
  ),
  fleets text[] not null default '{}' check (fleets <@ array['A380', 'A350', '777', '787', '737']),
  -- Business class qualified: cabin crew only.
  jcl_trained boolean not null default false check (not jcl_trained or role = 'cabin_crew'),
  open_to_swaps boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Duties and holidays (owner only at table level)
-- ---------------------------------------------------------------------------

create table public.duties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  duty_date date not null,
  kind text not null check (kind in (
    'flight', 'layover', 'standby', 'reserve', 'training', 'sim', 'ground_school',
    'off', 'holiday', 'annual_leave', 'busy_personal', 'other'
  )),
  -- Category from shared/roster-codes.json (or from the kind for manual entries).
  category text not null check (category in (
    'off', 'part_off', 'layover', 'standby', 'reserve', 'training', 'flight',
    'leave', 'national_service', 'private', 'busy'
  )),
  -- Raw roster code, owner only. Never shared.
  code text check (code is null or code ~ '^[A-Z0-9]{1,8}$'),
  -- What friends see at "destinations" level and above (friendsSee in the code list).
  friends_label text not null check (char_length(friends_label) between 1 and 40),
  flight_number text check (flight_number is null or flight_number ~ '^[A-Z0-9]{2} ?[0-9]{1,4}[A-Z]?$'),
  -- "SIN-LHR" for a flight, "LHR" for a layover.
  sector text check (sector is null or sector ~ '^[A-Z]{3}(-[A-Z]{3})?$'),
  report_time time,
  depart_time time,
  arrive_time time,
  arrive_date date check (arrive_date is null or arrive_date >= duty_date),
  -- Owner only. Never shared.
  note text check (note is null or char_length(note) <= 500),
  source text not null default 'manual' check (source in ('manual', 'import')),
  needs_review boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index duties_user_date on public.duties (user_id, duty_date);

create trigger duties_updated_at before update on public.duties
  for each row execute function private.set_updated_at();

-- Holidays, leave, busy and reservist (NTSV): always block matching, even on roster off days.
create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  kind text not null check (kind in ('holiday', 'annual_leave', 'busy_personal', 'reservist')),
  -- Owner only. Never shared.
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  check (end_date >= start_date and end_date - start_date <= 366)
);

create index holidays_user_dates on public.holidays (user_id, start_date, end_date);

-- ---------------------------------------------------------------------------
-- Groups
-- ---------------------------------------------------------------------------

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- Shared via invite link. Visible to members only.
  invite_code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  -- What this member shares with this group. Each member sets it for themselves.
  -- Defaults to the most private level.
  sharing_level public.sharing_level not null default 'off_days' check (sharing_level <> 'hidden'),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index group_members_user on public.group_members (user_id);

-- ---------------------------------------------------------------------------
-- Partners (1-to-1, full roster)
-- ---------------------------------------------------------------------------

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (requester_id <> addressee_id)
);

-- One connection per pair, whichever direction it was requested in.
create unique index partners_pair on public.partners (
  least(requester_id, addressee_id), greatest(requester_id, addressee_id)
);

-- ---------------------------------------------------------------------------
-- Per-person overrides: an owner can show one person less than their groups would.
-- ---------------------------------------------------------------------------

create table public.sharing_overrides (
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  max_level public.sharing_level not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, viewer_id),
  check (owner_id <> viewer_id)
);

-- ---------------------------------------------------------------------------
-- Relationship helpers. Security definer so RLS policies can use them without recursion.
-- ---------------------------------------------------------------------------

create function private.is_group_member(p_group uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group and user_id = (select auth.uid())
  );
$$;

create function private.is_group_owner(p_group uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group and user_id = (select auth.uid()) and role = 'owner'
  );
$$;

create function private.shares_group(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members ma
    join public.group_members mb on mb.group_id = ma.group_id
    where ma.user_id = a and mb.user_id = b
  );
$$;

-- Any partner row, pending or active (so a pending request shows the requester's name).
create function private.has_partner_link(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.partners
    where (requester_id = a and addressee_id = b) or (requester_id = b and addressee_id = a)
  );
$$;

-- 'owner', 'partner', 'off_days', 'destinations', 'full', or null for no access.
-- Mirrors effectiveLevel() in shared/src/sharing.ts.
create function private.effective_level(p_owner uuid, p_viewer uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when p_viewer is null then null
    when p_owner = p_viewer then 'owner'
    when exists (
      select 1 from public.partners
      where status = 'active'
        and ((requester_id = p_owner and addressee_id = p_viewer)
          or (requester_id = p_viewer and addressee_id = p_owner))
    ) then 'partner'
    else (
      select nullif(least(
        max(mo.sharing_level),
        coalesce(
          (select so.max_level from public.sharing_overrides so
           where so.owner_id = p_owner and so.viewer_id = p_viewer),
          'full'::public.sharing_level
        )
      ), 'hidden')::text
      from public.group_members mo
      join public.group_members mv on mv.group_id = mo.group_id
      where mo.user_id = p_owner and mv.user_id = p_viewer
      having count(*) > 0
    )
  end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Partners: ids never change, accepting stamps accepted_at, and each person has at most one
-- active partner.
create function private.partners_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.requester_id <> old.requester_id or new.addressee_id <> old.addressee_id then
      raise exception 'partner ids cannot change';
    end if;
    if new.status = 'active' and old.status <> 'active' then
      new.accepted_at := now();
    end if;
  end if;
  if new.status = 'active' and exists (
    select 1 from public.partners p
    where p.status = 'active' and p.id <> new.id
      and (p.requester_id in (new.requester_id, new.addressee_id)
        or p.addressee_id in (new.requester_id, new.addressee_id))
  ) then
    raise exception 'already has a partner';
  end if;
  return new;
end;
$$;

create trigger partners_guard before insert or update on public.partners
  for each row execute function private.partners_guard();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.duties enable row level security;
alter table public.holidays enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.partners enable row level security;
alter table public.sharing_overrides enable row level security;

-- Start from nothing, then grant only what the policies below need. anon gets nothing.
revoke all on public.profiles, public.duties, public.holidays, public.groups,
  public.group_members, public.partners, public.sharing_overrides from anon, authenticated;

-- Profiles: nobody can search for anyone. You see yourself, people in a group with you,
-- and your partner (or pending partner request).
grant select, insert on public.profiles to authenticated;
grant update (display_name, role, airline, rank, fleets, jcl_trained, open_to_swaps)
  on public.profiles to authenticated;

create policy profiles_select on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or private.shares_group(id, (select auth.uid()))
    or private.has_partner_link(id, (select auth.uid()))
  );
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Duties and holidays: owner only. Others use get_shared_roster().
grant select, insert, update, delete on public.duties, public.holidays to authenticated;

create policy duties_owner on public.duties for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy holidays_owner on public.holidays for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Groups: members only. Create through create_group(), join through join_group(invite_code).
grant select, delete on public.groups to authenticated;
grant update (name) on public.groups to authenticated;

create policy groups_select on public.groups for select to authenticated
  using (private.is_group_member(id));
create policy groups_update on public.groups for update to authenticated
  using (private.is_group_owner(id)) with check (private.is_group_owner(id));
create policy groups_delete on public.groups for delete to authenticated
  using (private.is_group_owner(id));

-- Group members: you see the members of your own groups only. You change only your own
-- sharing level. You can leave; a group owner can remove members.
grant select, delete on public.group_members to authenticated;
grant update (sharing_level) on public.group_members to authenticated;

create policy group_members_select on public.group_members for select to authenticated
  using (private.is_group_member(group_id));
create policy group_members_update on public.group_members for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy group_members_delete on public.group_members for delete to authenticated
  using (user_id = (select auth.uid()) or private.is_group_owner(group_id));

-- Partners: either side can see and end it. Only the addressee can accept.
grant select, delete on public.partners to authenticated;
grant insert (addressee_id) on public.partners to authenticated;
grant update (status) on public.partners to authenticated;

create policy partners_select on public.partners for select to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));
create policy partners_insert on public.partners for insert to authenticated
  with check (requester_id = (select auth.uid()) and status = 'pending');
create policy partners_update on public.partners for update to authenticated
  using (addressee_id = (select auth.uid())) with check (addressee_id = (select auth.uid()));
create policy partners_delete on public.partners for delete to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

-- Overrides: owner only (the viewer never learns they have one).
grant select, insert, update, delete on public.sharing_overrides to authenticated;

create policy sharing_overrides_owner on public.sharing_overrides for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Create a group; the caller becomes its owner member. (A plain insert could not return the new
-- row, because the select policy needs the membership to exist first.)
create function public.create_group(p_name text)
returns table (id uuid, name text, invite_code text)
language plpgsql security definer set search_path = '' as $$
declare
  v_group public.groups;
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in';
  end if;
  insert into public.groups (name, created_by) values (p_name, (select auth.uid())) returning * into v_group;
  insert into public.group_members (group_id, user_id, role) values (v_group.id, v_group.created_by, 'owner');
  return query select v_group.id, v_group.name, v_group.invite_code;
end;
$$;

-- Join a group with its invite code. New members share off days only until they choose more.
create function public.join_group(p_invite_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_group uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in';
  end if;
  select id into v_group from public.groups where invite_code = p_invite_code;
  if v_group is null then
    raise exception 'invite not found';
  end if;
  insert into public.group_members (group_id, user_id)
  values (v_group, (select auth.uid()))
  on conflict do nothing;
  return v_group;
end;
$$;

-- One row per day (and per duty) of someone's roster between p_from and p_to, redacted to the
-- caller's effective level. Returns nothing if the caller has no access.
--
--             | off_days | destinations | full (group) | partner      | owner
-- label       | Off/Busy/Away | friends label | friends label | friends label + holiday kind | same as partner
-- sector      | -        | yes          | yes          | yes          | yes
-- flight/times| -        | -            | yes          | yes          | yes
-- Private category: always "Unavailable" with no detail, for everyone except the owner (who reads
-- the table directly). Raw codes and notes are never returned.
create function public.get_shared_roster(p_owner uuid, p_from date, p_to date)
returns table (
  day date,
  status text,
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

revoke all on function public.create_group(text) from public, anon;
revoke all on function public.join_group(text) from public, anon;
revoke all on function public.get_shared_roster(uuid, date, date) from public, anon;
grant execute on function public.create_group(text) to authenticated;
grant execute on function public.join_group(text) to authenticated;
grant execute on function public.get_shared_roster(uuid, date, date) to authenticated;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
