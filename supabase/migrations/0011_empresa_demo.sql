-- =============================================================================
-- NexLab — Migration 0011: empresa Demonstração
--
-- Cria um tenant fictício ("Laboratório Demonstração") para prospects
-- testarem o NexLab sem risco de sujar dado real de cliente — mesmo projeto
-- Supabase compartilhado dos demais tenants (nenhuma exceção à arquitetura
-- multi-tenant da migration 0010), só marcado com is_demo = true.
--
-- O frontend usa essa flag pra bloquear qualquer escrita real no banco
-- quando o usuário logado pertence a essa empresa: toda criação/edição/
-- exclusão fica só no cache do navegador (ver src/lib/demoMode.ts) — a RLS
-- deste tenant continua igual à de qualquer outro (isolado por empresa_id),
-- é só uma camada extra no cliente que nunca chega a chamar o Supabase para
-- mutação nas telas operacionais.
--
-- UUID fixo (não gen_random_uuid()) para que supabase/seed_demo.sql possa
-- referenciar a mesma empresa sem o operador precisar copiar nada — só o
-- provisionamento do usuário de login (auth.users) continua manual, mesmo
-- fluxo já usado para o primeiro usuário de qualquer tenant (ver SETUP.md).
-- =============================================================================

alter table empresas add column is_demo boolean not null default false;

comment on column empresas.is_demo is 'Tenant de demonstração (prospects) — frontend bloqueia escrita real no banco quando true, ver src/lib/demoMode.ts.';

insert into empresas (
  id, nome_fantasia, razao_social, documento, telefone, email, endereco,
  prefixo_nota_servico, mostrar_endereco, mostrar_telefone, mostrar_email, mostrar_logo,
  status_assinatura, is_demo
) values (
  'de000000-0000-4000-8000-000000000001',
  'Laboratório Demonstração',
  'Laboratório Demonstração LTDA (dados fictícios)',
  '00.000.000/0001-00',
  '(11) 0000-0000',
  'contato@demonstracao.nexlab.app',
  'Rua Exemplo, 123 — Centro, São Paulo/SP',
  'NS',
  true, true, true, true,
  'ativa', true
);
