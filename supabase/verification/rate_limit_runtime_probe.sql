-- Optional Sellentum shared rate-limit runtime probe.
-- Run this only after production_schema_check.sql passes.
-- It writes/updates one harmless verification bucket in public.rate_limit_buckets.
-- Expected result: attempts 1-3 allowed=true, attempt 4 allowed=false.

with attempts as (
  select
    gs.attempt,
    rl.allowed,
    rl.remaining,
    rl.retry_after,
    rl.reset_at
  from generate_series(1, 4) as gs(attempt)
  cross join lateral public.check_rate_limit(
    'sellentum-production-verification-runtime-probe',
    3,
    60
  ) as rl
)
select
  attempt,
  allowed,
  remaining,
  retry_after,
  reset_at,
  case
    when attempt < 4 and allowed then 'pass'
    when attempt = 4 and not allowed then 'pass'
    else 'fail'
  end as expected_result
from attempts
order by attempt;
