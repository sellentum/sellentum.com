create table if not exists public.configurators (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  title text not null default 'Build your ideal bundle',
  subtitle text not null default '',
  hero_image_url text not null default '',
  base_price numeric(12,2) not null default 0 check (base_price >= 0),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, slug)
);

create table if not exists public.configurator_steps (
  id text primary key default gen_random_uuid()::text,
  configurator_id text not null references public.configurators(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  helper_text text not null default '',
  selection_type text not null default 'single' check (selection_type in ('single','multi')),
  required boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.configurator_options (
  id text primary key default gen_random_uuid()::text,
  step_id text not null references public.configurator_steps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  description text not null default '',
  image_url text not null default '',
  price_delta numeric(12,2) not null default 0,
  product_id text references public.products(id) on delete set null,
  tags text[] not null default '{}',
  incompatible_option_ids text[] not null default '{}',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.analytics_events drop constraint if exists analytics_events_quiz_id_fkey;

create index if not exists configurators_user_id_idx on public.configurators(user_id);
create index if not exists configurator_steps_configurator_idx on public.configurator_steps(configurator_id, position);
create index if not exists configurator_options_step_idx on public.configurator_options(step_id, position);
create index if not exists analytics_quiz_type_idx on public.analytics_events(quiz_id, event_type, created_at desc);

drop trigger if exists configurators_set_updated_at on public.configurators;
create trigger configurators_set_updated_at before update on public.configurators for each row execute procedure public.set_updated_at();

alter table public.configurators enable row level security;
alter table public.configurator_steps enable row level security;
alter table public.configurator_options enable row level security;

drop policy if exists "configurators_owner_all" on public.configurators;
create policy "configurators_owner_all" on public.configurators for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "configurator_steps_owner_all" on public.configurator_steps;
create policy "configurator_steps_owner_all" on public.configurator_steps for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "configurator_options_owner_all" on public.configurator_options;
create policy "configurator_options_owner_all" on public.configurator_options for all using (user_id = auth.uid()) with check (user_id = auth.uid());

comment on column public.analytics_events.quiz_id is 'Experience id for finder, advisor, or configurator. Column name is kept for MVP backwards compatibility.';
