-- =============================================================================
-- NexLab — Migration 0014: correções críticas de autorização
--
-- 1. A view legada de relatório foi criada como security definer (padrão do
--    Postgres) e, por isso, ignorava as RLS das tabelas-base. Ela não é usada
--    pelo frontend atual; removemos todo acesso dos papéis expostos pela API.
-- 2. A policy de autoedição de profiles permitia alterar também role e ativo,
--    possibilitando elevação para admin e reativação da própria conta.
-- =============================================================================

-- SEC-001: nenhum cliente da API deve acessar a view legada. Se ela voltar a
-- ser necessária, deve ser recriada com security_invoker = true e ter acesso
-- concedido somente ao papel estritamente necessário.
revoke all on table public.vw_relatorio_fechamento_itens from anon, authenticated;

-- SEC-002: o produto não oferece edição do próprio perfil para operadores.
-- Administradores continuam cobertos por profiles_admin_all, restrita ao
-- próprio tenant. Uma futura edição de nome deve usar RPC limitada à coluna.
drop policy if exists "profiles_update_self" on public.profiles;

