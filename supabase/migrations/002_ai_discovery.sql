create extension if not exists vector;

alter table public.products add column if not exists search_text text not null default '';
alter table public.products add column if not exists buyer_needs text[] not null default '{}';
alter table public.products add column if not exists enrichment_status text not null default 'pending';
alter table public.products add column if not exists enriched_at timestamptz;
alter table public.products add column if not exists embedding vector(1536);

create index if not exists products_embedding_idx on public.products using hnsw (embedding vector_cosine_ops);

create or replace function public.match_products(
  query_embedding vector(1536),
  workspace_user_id uuid,
  match_count integer default 8,
  max_price numeric default null
)
returns table (id text, similarity float)
language sql stable security definer set search_path = '' as $$
  select p.id, 1 - (p.embedding OPERATOR(public.<=>) query_embedding) as similarity
  from public.products p
  where p.user_id = workspace_user_id and p.active = true and p.embedding is not null
    and (max_price is null or p.price <= max_price)
  order by p.embedding OPERATOR(public.<=>) query_embedding
  limit greatest(1, least(match_count, 50));
$$;

revoke all on function public.match_products(vector, uuid, integer, numeric) from public;
grant execute on function public.match_products(vector, uuid, integer, numeric) to service_role;
