-- Copia somente os preços do catálogo da mesma empresa ao criar um cliente.
-- Sem esse filtro, um tenant novo recebe linhas de serviços de outros tenants.
create or replace function public.trg_fn_copiar_precos_cliente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tipo = 'cliente' then
    insert into public.tabela_precos (empresa_id, entidade_id, servico_id, preco)
    select new.empresa_id, new.id, s.id, s.preco_padrao
    from public.servicos s
    where s.empresa_id = new.empresa_id
      and s.ativo = true
    on conflict (entidade_id, servico_id) do nothing;
  end if;
  return new;
end;
$$;
