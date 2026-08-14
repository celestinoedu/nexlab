-- =============================================================================
-- NexLab — Migration 0007: separa "Cliente final" e "Nome do paciente" na OS
--
-- cliente_final (texto livre, informativo, existe desde a 0001) até aqui
-- misturava dois conceitos diferentes: o consultório/cliente final e o nome
-- do próprio paciente. Agora são dois campos — cliente_final continua sendo
-- o consultório/cliente final, e nome_paciente é novo.
-- =============================================================================

alter table ordens_servico add column nome_paciente text;
comment on column ordens_servico.nome_paciente is 'Nome do paciente, separado do cliente_final (consultório/cliente final) — texto livre, informativo, não é FK.';
