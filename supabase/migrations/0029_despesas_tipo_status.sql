-- =============================================================================
-- NexLab — Migration 0029: categoria (fixa/variável) e status nas despesas
--
-- - tipo: 'fixa' (repete todo mês: aluguel, salários) ou 'variavel'.
-- - status: 'pago' ou 'pendente'. Só despesas pagas entram no Fechamento
--   Financeiro (dinheiro que saiu), pelo mês do pagamento.
-- - data_pagamento: dia em que foi paga; vazia quando pendente.
-- - data_despesa continua sendo a data de referência/vencimento e define o
--   mês em que a despesa é controlada na tela de Despesas.
--
-- Histórico: despesas já lançadas eram registradas como "saída de caixa",
-- então ficam como pagas, com data_pagamento vazia (o fechamento usa
-- data_despesa nesse caso — mesmo total de antes). Nenhuma vira pendente,
-- o que criaria uma dívida que não existe.
--
-- Compatível com a versão anterior do app: os defaults cobrem inserts que
-- ainda não enviam tipo/status. Seguro para rodar mais de uma vez.
-- =============================================================================

alter table public.despesas
  add column if not exists tipo text not null default 'variavel',
  add column if not exists status text not null default 'pago',
  add column if not exists data_pagamento date;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'despesas_tipo_check') then
    alter table public.despesas add constraint despesas_tipo_check check (tipo in ('fixa', 'variavel'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'despesas_status_check') then
    alter table public.despesas add constraint despesas_status_check check (status in ('pago', 'pendente'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'despesas_pagamento_coerente') then
    alter table public.despesas add constraint despesas_pagamento_coerente
      check (status = 'pago' or data_pagamento is null);
  end if;
end $$;

-- Consultas por mês dentro da empresa (tela de Despesas, Fechamento, Dashboard).
create index if not exists despesas_empresa_data_idx on public.despesas (empresa_id, data_despesa);

comment on column public.despesas.tipo is 'fixa (repete todo mês) ou variavel.';
comment on column public.despesas.status is 'pago ou pendente. Só pagas entram no Fechamento Financeiro.';
comment on column public.despesas.data_pagamento is 'Dia do pagamento; vazio quando pendente. Despesas antigas (antes da 0029) ficam vazias e usam data_despesa.';
