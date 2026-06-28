-- Sellentum MVP schema for Supabase/PostgreSQL
-- Run this file once in the Supabase SQL editor.

create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  company_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  price numeric(12,2) not null default 0 check (price >= 0),
  image_url text not null default '',
  category text not null default '',
  description text not null default '',
  features text[] not null default '{}',
  tags text[] not null default '{}',
  product_url text not null default '',
  active boolean not null default true,
  search_text text not null default '',
  buyer_needs text[] not null default '{}',
  enrichment_status text not null default 'pending' check (enrichment_status in ('pending','enriched','failed')),
  enriched_at timestamptz,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quizzes (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  welcome_title text not null default 'Let''s find your perfect match',
  welcome_message text not null default '',
  published boolean not null default false,
  recommendation_overrides jsonb not null default '[]'::jsonb check (jsonb_typeof(recommendation_overrides) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, slug)
);

create table if not exists public.questions (
  id text primary key default gen_random_uuid()::text,
  quiz_id text not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  helper_text text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.answer_options (
  id text primary key default gen_random_uuid()::text,
  question_id text not null references public.questions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  match_type text not null default 'none' check (match_type in ('tag','category','feature','budget_max','none')),
  match_value text not null default '',
  weight integer not null default 3 check (weight between 1 and 10),
  next_question_id text references public.questions(id) on delete set null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- Kept as a separate, extensible rule table for future compound rules. The MVP
-- builder stores its simple one-answer/one-signal rules directly on answer_options.
create table if not exists public.recommendation_rules (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id text not null references public.quizzes(id) on delete cascade,
  answer_option_id text references public.answer_options(id) on delete cascade,
  rule_type text not null check (rule_type in ('tag','category','feature','budget_max','exclude')),
  operator text not null default 'equals',
  value text not null,
  weight integer not null default 3,
  created_at timestamptz not null default now()
);

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

create table if not exists public.analytics_events (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Kept as quiz_id for backwards compatibility; stores a finder, advisor, or
  -- configurator experience id. Server routes validate the referenced experience.
  quiz_id text not null,
  product_id text references public.products(id) on delete set null,
  event_type text not null check (event_type in ('widget_view','quiz_start','quiz_complete','product_recommended','buy_click','recommendation_feedback')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.widget_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  brand_name text not null default 'Your brand',
  primary_color text not null default '#22352a',
  button_text text not null default 'Find my match',
  widget_title text not null default 'Your personal product guide',
  welcome_message text not null default 'Answer a few questions and we''ll find your best match.',
  launcher_position text not null default 'bottom-right' check (launcher_position in ('bottom-right','bottom-left')),
  updated_at timestamptz not null default now()
);

create index if not exists products_user_id_idx on public.products(user_id);
create index if not exists products_category_idx on public.products(user_id, category);
create index if not exists products_embedding_idx on public.products using hnsw (embedding vector_cosine_ops);
create index if not exists quizzes_user_id_idx on public.quizzes(user_id);
create index if not exists questions_quiz_id_idx on public.questions(quiz_id, position);
create index if not exists options_question_id_idx on public.answer_options(question_id, position);
create index if not exists rules_quiz_id_idx on public.recommendation_rules(quiz_id);
create index if not exists configurators_user_id_idx on public.configurators(user_id);
create index if not exists configurator_steps_configurator_idx on public.configurator_steps(configurator_id, position);
create index if not exists configurator_options_step_idx on public.configurator_options(step_id, position);
create index if not exists analytics_quiz_type_idx on public.analytics_events(quiz_id, event_type, created_at desc);
create index if not exists analytics_user_created_idx on public.analytics_events(user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products for each row execute procedure public.set_updated_at();
drop trigger if exists quizzes_set_updated_at on public.quizzes;
create trigger quizzes_set_updated_at before update on public.quizzes for each row execute procedure public.set_updated_at();
drop trigger if exists configurators_set_updated_at on public.configurators;
create trigger configurators_set_updated_at before update on public.configurators for each row execute procedure public.set_updated_at();
drop trigger if exists widget_settings_set_updated_at on public.widget_settings;
create trigger widget_settings_set_updated_at before update on public.widget_settings for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, company_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.raw_user_meta_data ->> 'company_name', ''));
  insert into public.widget_settings (user_id, brand_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'company_name', ''), 'Your brand'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.answer_options enable row level security;
alter table public.recommendation_rules enable row level security;
alter table public.configurators enable row level security;
alter table public.configurator_steps enable row level security;
alter table public.configurator_options enable row level security;
alter table public.analytics_events enable row level security;
alter table public.widget_settings enable row level security;

create policy "profiles_owner_all" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "products_owner_all" on public.products for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "quizzes_owner_all" on public.quizzes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "questions_owner_all" on public.questions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "options_owner_all" on public.answer_options for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "rules_owner_all" on public.recommendation_rules for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "configurators_owner_all" on public.configurators for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "configurator_steps_owner_all" on public.configurator_steps for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "configurator_options_owner_all" on public.configurator_options for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "analytics_owner_read" on public.analytics_events for select using (user_id = auth.uid());
create policy "settings_owner_all" on public.widget_settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.match_products(
  query_embedding vector(1536),
  workspace_user_id uuid,
  match_count integer default 8,
  max_price numeric default null
)
returns table (
  id text,
  similarity float
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, 1 - (p.embedding <=> query_embedding) as similarity
  from public.products p
  where p.user_id = workspace_user_id
    and p.active = true
    and p.embedding is not null
    and (max_price is null or p.price <= max_price)
  order by p.embedding <=> query_embedding
  limit greatest(1, least(match_count, 50));
$$;

revoke all on function public.match_products(vector, uuid, integer, numeric) from public;
grant execute on function public.match_products(vector, uuid, integer, numeric) to service_role;

-- Public finder reads and analytics writes go through narrow server routes that
-- validate published status before using the service-role client. Never expose
-- SUPABASE_SERVICE_ROLE_KEY to the browser.
