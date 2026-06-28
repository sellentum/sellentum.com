-- Transactional workspace saves for nested finder and configurator builders.
-- Postgres functions execute inside a single transaction, preventing partial
-- parent/child saves when a question, answer option, step or option insert fails.

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

  insert into public.quizzes (
    id,
    user_id,
    name,
    slug,
    welcome_title,
    welcome_message,
    published,
    recommendation_overrides
  )
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

    insert into public.questions (
      id,
      quiz_id,
      user_id,
      title,
      helper_text,
      position
    )
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

      insert into public.answer_options (
        id,
        question_id,
        user_id,
        label,
        match_type,
        match_value,
        weight,
        next_question_id,
        position
      )
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

  return jsonb_build_object(
    'id', saved_quiz_id,
    'questions', array_length(question_ids, 1),
    'saved', true
  );
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

  insert into public.configurators (
    id,
    user_id,
    name,
    slug,
    title,
    subtitle,
    hero_image_url,
    base_price,
    published
  )
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

    insert into public.configurator_steps (
      id,
      configurator_id,
      user_id,
      title,
      helper_text,
      selection_type,
      required,
      position
    )
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

      select coalesce(array_agg(value), '{}')
      into tags
      from jsonb_array_elements_text(coalesce(option_item -> 'tags', '[]'::jsonb)) as tag_value(value);

      select coalesce(array_agg(value), '{}')
      into incompatible_ids
      from jsonb_array_elements_text(coalesce(option_item -> 'incompatible_option_ids', '[]'::jsonb)) as incompatible_value(value);

      select value
      into invalid_incompatible_id
      from unnest(incompatible_ids) as incompatible_value(value)
      where not value = any(option_ids)
      limit 1;

      if invalid_incompatible_id is not null then
        raise exception 'Configurator option has an invalid incompatible option reference.' using errcode = '23503';
      end if;

      insert into public.configurator_options (
        id,
        step_id,
        user_id,
        label,
        description,
        image_url,
        price_delta,
        product_id,
        tags,
        incompatible_option_ids,
        position
      )
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

  return jsonb_build_object(
    'id', saved_configurator_id,
    'steps', array_length(step_ids, 1),
    'options', array_length(option_ids, 1),
    'saved', true
  );
end;
$$;

revoke all on function public.save_quiz_with_children(jsonb) from public;
revoke all on function public.save_configurator_with_children(jsonb) from public;
grant execute on function public.save_quiz_with_children(jsonb) to authenticated;
grant execute on function public.save_configurator_with_children(jsonb) to authenticated;
