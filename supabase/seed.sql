-- =============================================================================
-- NexLab — Seed inicial
-- Catálogo de serviços extraído dos relatórios reais dos parceiros (mantidos
-- só localmente em docs/assets/relatorios-exemplo/, não versionados — contêm
-- nomes de pacientes de terceiros e o repositório é público).
-- preco_padrao aqui é só um ponto de partida — ajuste os valores reais do
-- GRS Lab pela tela de Catálogo de Serviços antes de usar em produção.
-- =============================================================================

insert into servicos (nome, categoria, preco_padrao) values
  ('PIPS - Pistas Indiretas Planas Simples + Expansor', 'Contenção', 642.00),
  ('Meia Mola', 'Contenção', 29.00),
  ('Mola Digital (em ''S'')', 'Contenção', 14.50),
  ('Caracterização Aparelho Adesivo + Caixinha + Chaveiro', 'Acabamento', 18.00),
  ('Disjuntor Hyrax Modificado (Bandas não inclusas)', 'Aparelho Fixo', 355.00),
  ('Gancho', 'Contenção', 37.00),
  ('SN1 + Expansor', 'Contenção', 363.00),
  ('SN3 + Expansor', 'Contenção', 577.00),
  ('Equiplan', 'Contenção', 40.00),
  ('Hass Modificado + Expansor (Bandas não inclusas)', 'Aparelho Fixo', 363.00),
  ('Banda', 'Aparelho Fixo', 22.00),
  ('Encapsulado de Maurício + Expansor', 'Contenção', 363.00),
  ('Aparelho Móvel com Arco Hawley', 'Contenção', 281.00),
  ('Contenção Hawley', 'Contenção', 180.00),
  ('Contenção Hawley c/ Expansor', 'Contenção', 180.00),
  ('Contenção Hawley c/ Expansor Caract', 'Contenção', 180.00),
  ('Contenção Hawley Inferior', 'Contenção', 100.00),
  ('Contenção Hawley Superior', 'Contenção', 100.00),
  ('Contenção Higiênica Inferior', 'Contenção', 100.00),
  ('Contenção Higiênica Superior', 'Contenção', 100.00),
  ('Contenção Higiênica Inf Reta', 'Contenção', 40.00),
  ('Contenção Hawley Sup Transparente', 'Contenção', 40.00),
  ('Planas I com Expansor', 'Contenção', 40.00),
  ('Hirax Sup', 'Aparelho Fixo', 150.00)
on conflict do nothing;
