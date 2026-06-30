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
