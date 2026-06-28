-- Allows public runtimes to record optional recommendation-quality feedback.
-- The original five launch-contract events remain the required preflight baseline.

alter table public.analytics_events
drop constraint if exists analytics_events_event_type_check;

alter table public.analytics_events
add constraint analytics_events_event_type_check
check (event_type in (
  'widget_view',
  'quiz_start',
  'quiz_complete',
  'product_recommended',
  'buy_click',
  'recommendation_feedback'
));
