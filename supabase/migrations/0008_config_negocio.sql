-- =============================================================================
-- NexLab — Migration 0008: configuração do negócio editável + logo
--
-- empresa_config já existia (singleton, id=1) mas só era lido, nunca editado
-- pela interface. Agora tem uma tela própria (admin) pra editar endereço,
-- telefone, e-mail e logo, cada um com um toggle "mostrar no cabeçalho dos
-- documentos" (OS em PDF, Relatório de Fechamento) — nome_fantasia sempre
-- aparece, não tem toggle.
-- =============================================================================

alter table empresa_config add column mostrar_endereco boolean not null default true;
alter table empresa_config add column mostrar_telefone boolean not null default true;
alter table empresa_config add column mostrar_email boolean not null default true;
alter table empresa_config add column mostrar_logo boolean not null default true;

-- Bucket público de Storage pra logo — leitura pública (é só o logo do
-- próprio laboratório, usado nos PDFs), escrita restrita a admin.
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "logos_select_public" on storage.objects for select using (bucket_id = 'logos');
create policy "logos_insert_admin" on storage.objects for insert
  with check (bucket_id = 'logos' and is_admin_user());
create policy "logos_update_admin" on storage.objects for update
  using (bucket_id = 'logos' and is_admin_user());
create policy "logos_delete_admin" on storage.objects for delete
  using (bucket_id = 'logos' and is_admin_user());
