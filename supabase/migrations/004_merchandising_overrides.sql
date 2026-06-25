-- Adds per-finder merchandising controls for deterministic recommendations.

alter table public.quizzes
add column if not exists recommendation_overrides jsonb not null default '[]'::jsonb;

do $$
begin
  alter table public.quizzes
  add constraint quizzes_recommendation_overrides_array
  check (jsonb_typeof(recommendation_overrides) = 'array');
exception
  when duplicate_object then null;
end $$;
