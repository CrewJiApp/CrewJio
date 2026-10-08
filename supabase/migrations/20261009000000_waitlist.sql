-- Waitlist for crewjio.com (see CLAUDE.md "Waitlist").
-- Written only by the web/ server route and scripts, using the service role key.
-- RLS is on with no policies, so the anon and authenticated roles can neither read nor write.

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (char_length(first_name) between 1 and 60),
  -- Stored lowercased and trimmed by the server, so uniqueness is case-insensitive.
  email text not null check (email = lower(email) and char_length(email) <= 254),
  instagram text check (instagram is null or instagram ~ '^[a-z0-9._]{1,30}$'),
  role text not null check (role in ('cabin_crew', 'pilot', 'partner_or_friend')),
  airline text not null check (airline in ('SIA', 'Scoot', 'other')),
  pain_point text check (pain_point is null or char_length(pain_point) <= 1000),
  wants_beta boolean not null default false,
  -- PDPA consent timestamp. Required: no row without consent.
  consent_at timestamptz not null,
  source text not null default 'site' check (source in ('site', 'tally_import')),
  confirmation_sent_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint waitlist_email_unique unique (email)
);

create index waitlist_created_at on public.waitlist (created_at desc);

alter table public.waitlist enable row level security;

revoke all on table public.waitlist from anon, authenticated;
