-- Ao cadastrar um novo Cliente, copia o preço padrão do catálogo
-- (servicos.preco_padrao) para a tabela de preços dele — nasce igual ao
-- catálogo da GRS Lab, mas cada linha continua editável depois pela mesma
-- tela de sempre (Tabela de Preços). Parceiro continua sem cópia automática:
-- a tabela dele nasce vazia, para preenchimento manual (preço do parceiro +
-- comissão), como já era.
--
-- Trigger (não insert direto do frontend) porque a criação de Entidade é
-- permitida a qualquer usuário ativo, mas escrever em tabela_precos é
-- restrito a admin (ver 0001_init.sql) — precisa rodar como security definer
-- pra funcionar independente de quem está criando o cliente.

create or replace function trg_fn_copiar_precos_cliente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tipo = 'cliente' then
    insert into tabela_precos (entidade_id, servico_id, preco)
    select new.id, s.id, s.preco_padrao
    from servicos s
    where s.ativo = true
    on conflict (entidade_id, servico_id) do nothing;
  end if;
  return new;
end;
$$;

comment on function trg_fn_copiar_precos_cliente() is 'Ao criar um Cliente, copia servicos.preco_padrao para a tabela de preços dele — Parceiro continua nascendo sem tabela de preços.';

create trigger trg_copiar_precos_cliente
  after insert on entidades
  for each row execute function trg_fn_copiar_precos_cliente();
