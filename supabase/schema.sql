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
  allowed_domains text[] not null default '{}',
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
  select p.id, 1 - (p.embedding OPERATOR(public.<=>) query_embedding) as similarity
  from public.products p
  where p.user_id = workspace_user_id
    and p.active = true
    and p.embedding is not null
    and (max_price is null or p.price <= max_price)
  order by p.embedding OPERATOR(public.<=>) query_embedding
  limit greatest(1, least(match_count, 50));
$$;

revoke all on function public.match_products(vector, uuid, integer, numeric) from public;
grant execute on function public.match_products(vector, uuid, integer, numeric) to service_role;

create or replace function public.save_quiz_with_children(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  workspace_user_id uuid := auth.uid();
  saved_quiz_id text;
  quiz_id text := coalesce(nullif(payload ->> 'id', ''), public.gen_random_uuid()::text);
  question_item jsonb;
  option_item jsonb;
  question_id text;
  option_id text;
  next_question_id text;
  question_ids text[] := '{}';
begin
  if workspace_user_id is null then
    raise exception 'Authentication is required to save a finder.' using errcode = '28000';
  end if;

  insert into public.quizzes (id, user_id, name, slug, welcome_title, welcome_message, published, recommendation_overrides)
  values (
    quiz_id,
    workspace_user_id,
    coalesce(nullif(payload ->> 'name', ''), 'Untitled product finder'),
    coalesce(nullif(payload ->> 'slug', ''), 'finder-' || extract(epoch from now())::bigint::text),
    coalesce(payload ->> 'welcome_title', 'Let''s find your perfect match'),
    coalesce(payload ->> 'welcome_message', ''),
    coalesce((payload ->> 'published')::boolean, false),
    coalesce(payload -> 'recommendation_overrides', '[]'::jsonb)
  )
  on conflict (id) do update set
    name = excluded.name,
    slug = excluded.slug,
    welcome_title = excluded.welcome_title,
    welcome_message = excluded.welcome_message,
    published = excluded.published,
    recommendation_overrides = excluded.recommendation_overrides
  where public.quizzes.user_id = workspace_user_id
  returning id into saved_quiz_id;

  if saved_quiz_id is null then
    raise exception 'Finder was not found in this workspace.' using errcode = '42501';
  end if;

  delete from public.questions
  where quiz_id = saved_quiz_id
    and user_id = workspace_user_id;

  for question_item in
    select value from jsonb_array_elements(coalesce(payload -> 'questions', '[]'::jsonb)) as question_value(value)
  loop
    question_id := nullif(question_item ->> 'id', '');
    if question_id is null then
      raise exception 'Finder question is missing a stable id.' using errcode = '23502';
    end if;
    question_ids := array_append(question_ids, question_id);
    insert into public.questions (id, quiz_id, user_id, title, helper_text, position)
    values (
      question_id,
      saved_quiz_id,
      workspace_user_id,
      coalesce(nullif(question_item ->> 'title', ''), 'Untitled question'),
      coalesce(question_item ->> 'helper_text', ''),
      coalesce((question_item ->> 'position')::integer, 0)
    );
  end loop;

  for question_item in
    select value from jsonb_array_elements(coalesce(payload -> 'questions', '[]'::jsonb)) as question_value(value)
  loop
    question_id := coalesce(nullif(question_item ->> 'id', ''), '');
    if not question_id = any(question_ids) then
      raise exception 'Answer option points at an unknown question.' using errcode = '23503';
    end if;

    for option_item in
      select value from jsonb_array_elements(coalesce(question_item -> 'options', '[]'::jsonb)) as option_value(value)
    loop
      option_id := nullif(option_item ->> 'id', '');
      if option_id is null then
        raise exception 'Answer option is missing a stable id.' using errcode = '23502';
      end if;
      next_question_id := nullif(option_item ->> 'next_question_id', '');

      if next_question_id is not null and not next_question_id = any(question_ids) then
        raise exception 'Answer option points at an unknown next question.' using errcode = '23503';
      end if;

      insert into public.answer_options (id, question_id, user_id, label, match_type, match_value, weight, next_question_id, position)
      values (
        option_id,
        question_id,
        workspace_user_id,
        coalesce(nullif(option_item ->> 'label', ''), 'Untitled option'),
        coalesce(nullif(option_item ->> 'match_type', ''), 'none'),
        coalesce(option_item ->> 'match_value', ''),
        coalesce((option_item ->> 'weight')::integer, 3),
        next_question_id,
        coalesce((option_item ->> 'position')::integer, 0)
      );
    end loop;
  end loop;

  return jsonb_build_object('id', saved_quiz_id, 'questions', array_length(question_ids, 1), 'saved', true);
end;
$$;

create or replace function public.save_configurator_with_children(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  workspace_user_id uuid := auth.uid();
  saved_configurator_id text;
  configurator_id text := coalesce(nullif(payload ->> 'id', ''), public.gen_random_uuid()::text);
  step_item jsonb;
  option_item jsonb;
  step_id text;
  option_id text;
  product_id text;
  tags text[];
  incompatible_ids text[];
  step_ids text[] := '{}';
  option_ids text[] := '{}';
  invalid_incompatible_id text;
begin
  if workspace_user_id is null then
    raise exception 'Authentication is required to save a configurator.' using errcode = '28000';
  end if;

  insert into public.configurators (id, user_id, name, slug, title, subtitle, hero_image_url, base_price, published)
  values (
    configurator_id,
    workspace_user_id,
    coalesce(nullif(payload ->> 'name', ''), 'Untitled configurator'),
    coalesce(nullif(payload ->> 'slug', ''), 'configurator-' || extract(epoch from now())::bigint::text),
    coalesce(payload ->> 'title', 'Build your ideal bundle'),
    coalesce(payload ->> 'subtitle', ''),
    coalesce(payload ->> 'hero_image_url', ''),
    coalesce((payload ->> 'base_price')::numeric, 0),
    coalesce((payload ->> 'published')::boolean, false)
  )
  on conflict (id) do update set
    name = excluded.name,
    slug = excluded.slug,
    title = excluded.title,
    subtitle = excluded.subtitle,
    hero_image_url = excluded.hero_image_url,
    base_price = excluded.base_price,
    published = excluded.published
  where public.configurators.user_id = workspace_user_id
  returning id into saved_configurator_id;

  if saved_configurator_id is null then
    raise exception 'Configurator was not found in this workspace.' using errcode = '42501';
  end if;

  for step_item in
    select value from jsonb_array_elements(coalesce(payload -> 'steps', '[]'::jsonb)) as step_value(value)
  loop
    step_id := nullif(step_item ->> 'id', '');
    if step_id is null then
      raise exception 'Configurator step is missing a stable id.' using errcode = '23502';
    end if;
    step_ids := array_append(step_ids, step_id);
    for option_item in
      select value from jsonb_array_elements(coalesce(step_item -> 'options', '[]'::jsonb)) as option_value(value)
    loop
      option_id := nullif(option_item ->> 'id', '');
      if option_id is null then
        raise exception 'Configurator option is missing a stable id.' using errcode = '23502';
      end if;
      option_ids := array_append(option_ids, option_id);
    end loop;
  end loop;

  delete from public.configurator_steps
  where configurator_id = saved_configurator_id
    and user_id = workspace_user_id;

  for step_item in
    select value from jsonb_array_elements(coalesce(payload -> 'steps', '[]'::jsonb)) as step_value(value)
  loop
    step_id := coalesce(nullif(step_item ->> 'id', ''), '');
    if not step_id = any(step_ids) then
      raise exception 'Configurator step is missing a valid id.' using errcode = '23503';
    end if;

    insert into public.configurator_steps (id, configurator_id, user_id, title, helper_text, selection_type, required, position)
    values (
      step_id,
      saved_configurator_id,
      workspace_user_id,
      coalesce(nullif(step_item ->> 'title', ''), 'Untitled step'),
      coalesce(step_item ->> 'helper_text', ''),
      coalesce(nullif(step_item ->> 'selection_type', ''), 'single'),
      coalesce((step_item ->> 'required')::boolean, true),
      coalesce((step_item ->> 'position')::integer, 0)
    );

    for option_item in
      select value from jsonb_array_elements(coalesce(step_item -> 'options', '[]'::jsonb)) as option_value(value)
    loop
      option_id := coalesce(nullif(option_item ->> 'id', ''), '');
      if not option_id = any(option_ids) then
        raise exception 'Configurator option is missing a valid id.' using errcode = '23503';
      end if;

      product_id := nullif(option_item ->> 'product_id', '');
      if product_id is not null and not exists (
        select 1 from public.products p
        where p.id = product_id
          and p.user_id = workspace_user_id
      ) then
        raise exception 'Configurator option product is not in this workspace.' using errcode = '23503';
      end if;

      select coalesce(array_agg(value), '{}') into tags
      from jsonb_array_elements_text(coalesce(option_item -> 'tags', '[]'::jsonb)) as tag_value(value);

      select coalesce(array_agg(value), '{}') into incompatible_ids
      from jsonb_array_elements_text(coalesce(option_item -> 'incompatible_option_ids', '[]'::jsonb)) as incompatible_value(value);

      select value into invalid_incompatible_id
      from unnest(incompatible_ids) as incompatible_value(value)
      where not value = any(option_ids)
      limit 1;

      if invalid_incompatible_id is not null then
        raise exception 'Configurator option has an invalid incompatible option reference.' using errcode = '23503';
      end if;

      insert into public.configurator_options (id, step_id, user_id, label, description, image_url, price_delta, product_id, tags, incompatible_option_ids, position)
      values (
        option_id,
        step_id,
        workspace_user_id,
        coalesce(nullif(option_item ->> 'label', ''), 'Untitled option'),
        coalesce(option_item ->> 'description', ''),
        coalesce(option_item ->> 'image_url', ''),
        coalesce((option_item ->> 'price_delta')::numeric, 0),
        product_id,
        tags,
        incompatible_ids,
        coalesce((option_item ->> 'position')::integer, 0)
      );
    end loop;
  end loop;

  return jsonb_build_object('id', saved_configurator_id, 'steps', array_length(step_ids, 1), 'options', array_length(option_ids, 1), 'saved', true);
end;
$$;

revoke all on function public.save_quiz_with_children(jsonb) from public;
revoke all on function public.save_configurator_with_children(jsonb) from public;
grant execute on function public.save_quiz_with_children(jsonb) to authenticated;
grant execute on function public.save_configurator_with_children(jsonb) to authenticated;

-- Public finder reads and analytics writes go through narrow server routes that
-- validate published status before using the service-role client. Never expose
-- SUPABASE_SERVICE_ROLE_KEY to the browser.

-- Shared production rate limiting for public/server API guardrails.
-- The application sends only a SHA-256 bucket key, never a raw IP address.
create table if not exists public.rate_limit_buckets (
  key_hash text primary key check (length(key_hash) between 32 and 128),
  request_count integer not null default 0 check (request_count >= 0),
  reset_at timestamptz not null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.rate_limit_buckets enable row level security;

create index if not exists rate_limit_buckets_reset_at_idx
  on public.rate_limit_buckets (reset_at);

revoke all on table public.rate_limit_buckets from anon;
revoke all on table public.rate_limit_buckets from authenticated;
grant select, insert, update, delete on table public.rate_limit_buckets to service_role;

create or replace function public.check_rate_limit(
  bucket_key text,
  max_requests integer default 40,
  window_seconds integer default 60
)
returns table (
  allowed boolean,
  remaining integer,
  reset_at timestamptz,
  retry_after integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  now_at timestamptz := clock_timestamp();
  safe_max_requests integer := least(greatest(coalesce(max_requests, 40), 1), 10000);
  safe_window_seconds integer := least(greatest(coalesce(window_seconds, 60), 1), 86400);
  bucket record;
begin
  if bucket_key is null or length(bucket_key) < 16 then
    raise exception 'A valid rate-limit bucket key is required.' using errcode = '22023';
  end if;

  insert into public.rate_limit_buckets (key_hash, request_count, reset_at, updated_at)
  values (bucket_key, 1, now_at + make_interval(secs => safe_window_seconds), now_at)
  on conflict (key_hash) do update set
    request_count = case
      when public.rate_limit_buckets.reset_at <= now_at then 1
      else least(public.rate_limit_buckets.request_count + 1, safe_max_requests + 1)
    end,
    reset_at = case
      when public.rate_limit_buckets.reset_at <= now_at then now_at + make_interval(secs => safe_window_seconds)
      else public.rate_limit_buckets.reset_at
    end,
    updated_at = now_at
  returning public.rate_limit_buckets.request_count, public.rate_limit_buckets.reset_at into bucket;

  allowed := bucket.request_count <= safe_max_requests;
  remaining := greatest(safe_max_requests - bucket.request_count, 0);
  reset_at := bucket.reset_at;
  retry_after := case
    when allowed then 0
    else greatest(1, ceil(extract(epoch from (bucket.reset_at - now_at)))::integer)
  end;

  return next;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
revoke all on function public.check_rate_limit(text, integer, integer) from anon;
revoke all on function public.check_rate_limit(text, integer, integer) from authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
