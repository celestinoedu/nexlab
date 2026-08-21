-- =============================================================================
-- NexLab — Migration 0015: OS do Cliente e número interno sequencial
--
-- - Adiciona um campo próprio para o número usado pelo laboratório cliente.
-- - Recupera os números que foram registrados nas observações no formato
--   "os; 1234" (incluindo variações de espaços e maiúsculas).
-- - Preserva todos os numero_os existentes e faz o próximo insert usar sempre
--   o contador da empresa. O número interno também passa a ser imutável.
-- =============================================================================

alter table public.ordens_servico
  add column if not exists numero_os_cliente text;

comment on column public.ordens_servico.numero_os_cliente is
  'Número da OS informado pelo laboratório cliente; independente do numero_os interno e sequencial do NexLab.';

-- Os dados reais anteriores usaram somente esse padrão inequívoco. Mantemos
-- observacoes como estavam para não apagar informação histórica.
update public.ordens_servico
set numero_os_cliente = substring(
  observacoes from '^[[:space:]]*[Oo][Ss][[:space:]]*;[[:space:]]*([0-9]+)[[:space:]]*$'
)
where numero_os_cliente is null
  and observacoes ~ '^[[:space:]]*[Oo][Ss][[:space:]]*;[[:space:]]*[0-9]+[[:space:]]*$';

-- O próximo número deve continuar depois do maior número já existente em cada
-- empresa. greatest() também evita recuar um contador que já esteja adiantado.
update public.empresas e
set proximo_numero_os = greatest(
  e.proximo_numero_os,
  coalesce((
    select max(o.numero_os) + 1
    from public.ordens_servico o
    where o.empresa_id = e.id
  ), 1)
);

-- numero_os passa a vir exclusivamente do contador atômico por empresa,
-- mesmo se algum cliente antigo da API ainda tentar enviar esse campo.
create or replace function public.trg_fn_ordens_servico_before_insert()
returns trigger as $$
begin
  if auth.uid() is not null then
    new.empresa_id := current_empresa_id();
  end if;
  if new.empresa_id is null then
    raise exception 'empresa_id não pôde ser determinado para a nova Ordem de Serviço';
  end if;

  update public.empresas
    set proximo_numero_os = proximo_numero_os + 1
    where id = new.empresa_id
    returning proximo_numero_os - 1 into new.numero_os;

  if new.numero_os is null then
    raise exception 'não foi possível gerar o número sequencial da Ordem de Serviço';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.trg_fn_lock_numero_os()
returns trigger as $$
begin
  new.numero_os := old.numero_os;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_ordens_servico_lock_numero_os on public.ordens_servico;

create trigger trg_ordens_servico_lock_numero_os
  before update on public.ordens_servico
  for each row execute function public.trg_fn_lock_numero_os();
