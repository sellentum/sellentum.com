-- Adds optional answer-level routing for conditional finder flows.

alter table public.answer_options
add column if not exists next_question_id text references public.questions(id) on delete set null;
