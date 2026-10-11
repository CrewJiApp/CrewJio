-- People who are not crew (a partner, family or a friend) can sign up and add their own
-- calendar, so their crew partner sees when they are both free. See CLAUDE.md "App conventions".
--
-- 1. profiles.role gains 'partner'. A partner has no rank, fleets or JCL (the existing rank and
--    JCL checks already reject a rank or JCL for this role; fleets must be empty too).
-- 2. duties.source gains 'calendar': busy times copied from the phone's calendar. Only the
--    times are copied; event titles are never stored.

alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('cabin_crew', 'pilot', 'partner'));

alter table public.profiles add constraint profiles_partner_has_no_fleets
  check (role <> 'partner' or fleets = '{}');

alter table public.duties drop constraint duties_source_check;
alter table public.duties add constraint duties_source_check
  check (source in ('manual', 'import', 'calendar'));
