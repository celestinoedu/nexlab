-- =============================================================================
-- NexLab — Migration 0013: fila de publicações do Instagram
--
-- A tabela é operacional da marca, não pertence a um tenant. Somente a
-- service_role usada pela Edge Function pode acessá-la; não há políticas para
-- anon/authenticated. Tokens da Meta nunca são armazenados no banco.
-- =============================================================================

create table instagram_publicacoes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  caption text not null,
  alt_text text,
  media_type text not null check (media_type in ('image', 'carousel')),
  media_urls text[] not null,
  scheduled_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  meta_container_id text,
  meta_media_id text,
  meta_permalink text,
  last_error text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint instagram_publicacoes_media_count check (
    (media_type = 'image' and cardinality(media_urls) = 1)
    or (media_type = 'carousel' and cardinality(media_urls) between 2 and 10)
  )
);

create index idx_instagram_publicacoes_due
  on instagram_publicacoes (scheduled_at)
  where status = 'scheduled';

create trigger trg_instagram_publicacoes_updated_at
  before update on instagram_publicacoes
  for each row execute function set_updated_at();

alter table instagram_publicacoes enable row level security;

comment on table instagram_publicacoes is 'Fila privada de posts da marca NexLab publicados pela Edge Function na API oficial do Instagram.';
comment on column instagram_publicacoes.media_urls is 'JPEGs públicos em ordem; 1 para imagem, 2 a 10 para carrossel.';

-- Reserva lotes com SKIP LOCKED para impedir duas execuções do Cron de
-- publicarem o mesmo item simultaneamente. Também recupera uma reserva que
-- ficou presa por mais de 30 minutos após uma interrupção inesperada.
create or replace function claim_due_instagram_posts(batch_size integer default 3)
returns setof instagram_publicacoes
language plpgsql
security definer
set search_path = public
as $$
begin
  update instagram_publicacoes
  set status = 'scheduled',
      last_error = coalesce(last_error, 'Execução anterior interrompida; item reenfileirado automaticamente.')
  where status = 'publishing'
    and updated_at < now() - interval '30 minutes';

  return query
  with due as (
    select id
    from instagram_publicacoes
    where status = 'scheduled'
      and scheduled_at <= now()
    order by scheduled_at
    for update skip locked
    limit greatest(1, least(batch_size, 10))
  )
  update instagram_publicacoes as post
  set status = 'publishing',
      attempt_count = post.attempt_count + 1,
      last_error = null
  from due
  where post.id = due.id
  returning post.*;
end;
$$;

revoke all on table instagram_publicacoes from anon, authenticated;
revoke all on function claim_due_instagram_posts(integer) from public, anon, authenticated;
grant all on table instagram_publicacoes to service_role;
grant execute on function claim_due_instagram_posts(integer) to service_role;

