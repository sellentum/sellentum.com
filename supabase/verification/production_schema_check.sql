-- Sellentum production Supabase verification
-- Run this in the PRODUCTION Supabase SQL editor after applying migrations.
-- Expected result: every row should have status = pass.

with
required_extensions(extension_name) as (
  values
    ('pgcrypto'),
    ('vector')
),
extension_results as (
  select
    'extension'::text as check_group,
    extension_name::text as check_name,
    case when e.extname is not null then 'pass' else 'fail' end as status,
    coalesce(e.extname, 'missing')::text as evidence,
    ('Run: create extension if not exists ' || extension_name || ';')::text as fix_hint
  from required_extensions re
  left join pg_extension e on e.extname = re.extension_name
),
required_columns(table_name, column_name) as (
  values
    ('profiles','id'), ('profiles','full_name'), ('profiles','company_name'), ('profiles','created_at'), ('profiles','updated_at'),
    ('products','id'), ('products','user_id'), ('products','name'), ('products','price'), ('products','image_url'), ('products','category'), ('products','description'), ('products','features'), ('products','tags'), ('products','product_url'), ('products','active'), ('products','buyer_needs'), ('products','search_text'), ('products','enrichment_status'), ('products','embedding'),
    ('quizzes','id'), ('quizzes','user_id'), ('quizzes','name'), ('quizzes','slug'), ('quizzes','welcome_title'), ('quizzes','welcome_message'), ('quizzes','published'), ('quizzes','recommendation_overrides'),
    ('questions','id'), ('questions','quiz_id'), ('questions','user_id'), ('questions','title'), ('questions','helper_text'), ('questions','position'),
    ('answer_options','id'), ('answer_options','question_id'), ('answer_options','user_id'), ('answer_options','label'), ('answer_options','match_type'), ('answer_options','match_value'), ('answer_options','weight'), ('answer_options','next_question_id'), ('answer_options','position'),
    ('recommendation_rules','id'), ('recommendation_rules','user_id'), ('recommendation_rules','quiz_id'), ('recommendation_rules','answer_option_id'), ('recommendation_rules','rule_type'), ('recommendation_rules','operator'), ('recommendation_rules','value'), ('recommendation_rules','weight'),
    ('configurators','id'), ('configurators','user_id'), ('configurators','name'), ('configurators','slug'), ('configurators','title'), ('configurators','subtitle'), ('configurators','base_price'), ('configurators','published'),
    ('configurator_steps','id'), ('configurator_steps','configurator_id'), ('configurator_steps','user_id'), ('configurator_steps','title'), ('configurator_steps','selection_type'), ('configurator_steps','required'), ('configurator_steps','position'),
    ('configurator_options','id'), ('configurator_options','step_id'), ('configurator_options','user_id'), ('configurator_options','label'), ('configurator_options','price_delta'), ('configurator_options','product_id'), ('configurator_options','tags'), ('configurator_options','incompatible_option_ids'), ('configurator_options','position'),
    ('analytics_events','id'), ('analytics_events','user_id'), ('analytics_events','quiz_id'), ('analytics_events','product_id'), ('analytics_events','event_type'), ('analytics_events','metadata'), ('analytics_events','created_at'),
    ('widget_settings','user_id'), ('widget_settings','brand_name'), ('widget_settings','primary_color'), ('widget_settings','button_text'), ('widget_settings','widget_title'), ('widget_settings','welcome_message'), ('widget_settings','launcher_position'), ('widget_settings','allowed_domains'),
    ('rate_limit_buckets','key_hash'), ('rate_limit_buckets','request_count'), ('rate_limit_buckets','reset_at'), ('rate_limit_buckets','updated_at')
),
column_results as (
  select
    'column'::text as check_group,
    (rc.table_name || '.' || rc.column_name)::text as check_name,
    case when c.column_name is not null then 'pass' else 'fail' end as status,
    coalesce(c.data_type, 'missing')::text as evidence,
    ('Apply the missing migration or rerun supabase/schema.sql for ' || rc.table_name || '.')::text as fix_hint
  from required_columns rc
  left join information_schema.columns c
    on c.table_schema = 'public'
   and c.table_name = rc.table_name
   and c.column_name = rc.column_name
),
required_rls(table_name) as (
  values
    ('profiles'),
    ('products'),
    ('quizzes'),
    ('questions'),
    ('answer_options'),
    ('recommendation_rules'),
    ('configurators'),
    ('configurator_steps'),
    ('configurator_options'),
    ('analytics_events'),
    ('widget_settings'),
    ('rate_limit_buckets')
),
rls_results as (
  select
    'rls'::text as check_group,
    (rr.table_name || '.rls_enabled')::text as check_name,
    case when coalesce(c.relrowsecurity, false) then 'pass' else 'fail' end as status,
    coalesce(c.relrowsecurity::text, 'missing table')::text as evidence,
    ('Run: alter table public.' || rr.table_name || ' enable row level security;')::text as fix_hint
  from required_rls rr
  left join pg_class c on c.relname = rr.table_name
  left join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
),
required_functions(function_name, signature_like) as (
  values
    ('match_products', '%query_embedding%workspace_user_id%'),
    ('save_quiz_with_children', '%payload jsonb%'),
    ('save_configurator_with_children', '%payload jsonb%'),
    ('check_rate_limit', '%bucket_key text%max_requests integer%window_seconds integer%')
),
function_matches as (
  select
    rf.function_name,
    rf.signature_like,
    p.oid,
    pg_get_function_identity_arguments(p.oid) as identity_arguments
  from required_functions rf
  left join pg_proc p
    on p.proname = rf.function_name
   and p.pronamespace = 'public'::regnamespace
   and pg_get_function_identity_arguments(p.oid) ilike rf.signature_like
),
function_results as (
  select
    'function'::text as check_group,
    function_name::text as check_name,
    case when oid is not null then 'pass' else 'fail' end as status,
    coalesce(identity_arguments, 'missing')::text as evidence,
    ('Apply the migration that creates public.' || function_name || '.')::text as fix_hint
  from function_matches
),
required_function_grants(function_name, role_name, should_execute) as (
  values
    ('match_products','service_role',true),
    ('save_quiz_with_children','authenticated',true),
    ('save_configurator_with_children','authenticated',true),
    ('check_rate_limit','service_role',true),
    ('check_rate_limit','anon',false),
    ('check_rate_limit','authenticated',false)
),
function_grant_results as (
  select
    'function_grant'::text as check_group,
    (rfg.function_name || '.' || rfg.role_name || '.execute')::text as check_name,
    case
      when fm.oid is null then 'fail'
      when to_regrole(rfg.role_name) is null then 'fail'
      when has_function_privilege(rfg.role_name, fm.oid, 'EXECUTE') = rfg.should_execute then 'pass'
      else 'fail'
    end as status,
    case
      when fm.oid is null then 'missing function'
      when to_regrole(rfg.role_name) is null then 'missing role'
      else ('execute=' || has_function_privilege(rfg.role_name, fm.oid, 'EXECUTE')::text)
    end as evidence,
    case
      when rfg.should_execute then ('Grant execute on public.' || rfg.function_name || ' to ' || rfg.role_name || '.')
      else ('Revoke execute on public.' || rfg.function_name || ' from ' || rfg.role_name || '.')
    end as fix_hint
  from required_function_grants rfg
  left join function_matches fm on fm.function_name = rfg.function_name
),
policy_results as (
  select
    'policy'::text as check_group,
    'analytics_events.owner_select_only'::text as check_name,
    case
      when exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'analytics_events'
          and policyname = 'analytics_owner_read'
          and cmd = 'SELECT'
          and qual ilike '%auth.uid%'
      )
      and not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'analytics_events'
          and cmd in ('INSERT','UPDATE','DELETE','ALL')
          and roles::text ilike any (array['%anon%','%authenticated%','%public%'])
      )
      then 'pass'
      else 'fail'
    end as status,
    'Authenticated browser clients should only read their own analytics; server routes write with service role.'::text as evidence,
    'Keep only analytics_owner_read for browser access; do not add anon/auth insert/update/delete analytics policies.'::text as fix_hint
  union all
  select
    'policy'::text,
    'rate_limit_buckets.service_only'::text,
    case
      when to_regrole('anon') is not null
       and to_regrole('authenticated') is not null
       and not has_table_privilege('anon', 'public.rate_limit_buckets', 'SELECT')
       and not has_table_privilege('authenticated', 'public.rate_limit_buckets', 'SELECT')
       and has_table_privilege('service_role', 'public.rate_limit_buckets', 'SELECT')
      then 'pass'
      else 'fail'
    end,
    'Rate-limit buckets should never be browser-readable because keys are infrastructure metadata.'::text,
    'Revoke table privileges from anon/authenticated and grant table access only to service_role.'::text
),
all_results as (
  select * from extension_results
  union all select * from column_results
  union all select * from rls_results
  union all select * from function_results
  union all select * from function_grant_results
  union all select * from policy_results
)
select
  check_group,
  check_name,
  status,
  evidence,
  fix_hint
from all_results
order by
  case status when 'fail' then 0 else 1 end,
  check_group,
  check_name;
