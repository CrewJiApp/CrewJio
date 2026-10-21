-- Deleting an account (required by the App Store and Google Play). Everything a person owns is
-- removed by the existing "on delete cascade" links from auth.users: profile, duties, holidays,
-- group memberships, partner links and invites, overrides and import counts.
--
-- One thing would go too far: a group's creator owns the group row, so deleting them would also
-- delete the group for every other member. This hands each such group to its longest-standing
-- other member first. A group with nobody else in it is simply deleted with its creator.
-- Only the delete-account Edge Function (service role) can call it.

create function public.prepare_account_deletion(p_user uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  g record;
  v_next uuid;
begin
  for g in select id from public.groups where created_by = p_user loop
    select user_id into v_next from public.group_members
      where group_id = g.id and user_id <> p_user
      order by joined_at, user_id
      limit 1;
    if v_next is not null then
      update public.groups set created_by = v_next where id = g.id;
      update public.group_members set role = 'owner' where group_id = g.id and user_id = v_next;
    end if;
  end loop;
end;
$$;

revoke all on function public.prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;
