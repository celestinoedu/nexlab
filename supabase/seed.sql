-- =============================================================================
-- NexLab — Seed do catálogo de serviços
-- Catálogo e preços REAIS da GRS Lab (tabela de preços fornecida pelo
-- cliente, docs/assets/lista-preco/ — não versionado, só o PDF original;
-- estes valores foram aprovados para ficar públicos no código).
--
-- tempo_medio_dias = 7 para todos: prazo padrão informado pela GRS Lab
-- ("Prazo de entrega de 7 dias úteis após retirada do serviço"). Serviços
-- urgentes têm taxa de 30% à parte — não modelado no catálogo por ora.
--
-- Serviços com preco_padrao = 0.00 foram adicionados a partir da lista de
-- comissões 2026 do parceiro Laboratório Spartan (docs/assets/lista-preco/)
-- para permitir uma comissão específica por serviço — a GRS Lab ainda não
-- informou o preço de venda direta (Cliente) desses itens; revisar depois.
--
-- TRUNCATE CASCADE: seguro rodar numa base recém-migrada (fluxo do
-- SETUP.md). Se já houver tabela_precos/ordem_servico_itens usando o
-- catálogo antigo, eles são apagados junto — refaça o cadastro depois.
-- =============================================================================

truncate table servicos cascade;

insert into servicos (nome, categoria, preco_padrao, tempo_medio_dias) values
  -- Encapsulados (Técnica de Maurício)
  ('Distalizador', 'Encapsulados (Técnica de Maurício)', 130.00, 7),
  ('Expansor (Encapsulado)', 'Encapsulados (Técnica de Maurício)', 120.00, 7),
  ('Mesializador', 'Encapsulados (Técnica de Maurício)', 141.00, 7),
  ('Monobloco', 'Encapsulados (Técnica de Maurício)', 193.00, 7),
  ('Vestibularizador', 'Encapsulados (Técnica de Maurício)', 130.00, 7),
  ('Encapsulado de Maurício', 'Encapsulados (Técnica de Maurício)', 0.00, 7),
  ('Encapsulado de Maurício com Aletas de Resina', 'Encapsulados (Técnica de Maurício)', 0.00, 7),

  -- Aparelhos fixos
  ('Banda Alça', 'Aparelhos Fixos', 92.00, 7),
  ('Barra Lingual', 'Aparelhos Fixos', 118.00, 7),
  ('Barra Palatina', 'Aparelhos Fixos', 118.00, 7),
  ('Pendex (fio TMA)', 'Aparelhos Fixos', 304.00, 7),
  -- Família Contenção 3x3 (substitui a antiga "Contenção Fixa 3x3" genérica)
  ('Contenção 3x3 Higiênica', 'Aparelhos Fixos', 0.00, 7),
  ('Contenção 3x3 Reta', 'Aparelhos Fixos', 0.00, 7),
  ('Contenção 3x3 com Posicionador', 'Aparelhos Fixos', 0.00, 7),
  ('Contenção 3x3 Higiênica (Modelo N)', 'Aparelhos Fixos', 0.00, 7),
  ('Contenção 3x3 (Fio TMA)', 'Aparelhos Fixos', 0.00, 7),
  ('Contenção 1x1 Higiênica', 'Aparelhos Fixos', 0.00, 7),
  ('Contenção 1x1 Reta', 'Aparelhos Fixos', 0.00, 7),
  ('Contenção 2x2 Higiênica', 'Aparelhos Fixos', 0.00, 7),
  ('Contenção 4x4 Higiênica', 'Aparelhos Fixos', 0.00, 7),
  ('APM - Aparelho Propulsor Mandibular', 'Aparelhos Fixos', 0.00, 7),
  ('Arco Lingual de Nance', 'Aparelhos Fixos', 0.00, 7),
  ('Bi-Hélice', 'Aparelhos Fixos', 0.00, 7),
  ('Botão de Nance', 'Aparelhos Fixos', 0.00, 7),
  ('Pendulum (fio TMA)', 'Aparelhos Fixos', 0.00, 7),
  ('Platô Anterior Fixo', 'Aparelhos Fixos', 0.00, 7),
  ('Platô Posterior Fixo', 'Aparelhos Fixos', 0.00, 7),
  ('Quadri-Hélice', 'Aparelhos Fixos', 0.00, 7),

  -- Aparelhos funcionais
  ('Bimler A, B ou C', 'Aparelhos Funcionais', 310.00, 7),
  ('HGS II ou III', 'Aparelhos Funcionais', 280.00, 7),
  ('Bionator', 'Aparelhos Funcionais', 250.00, 7),
  ('PIPS (Planas Composto)', 'Aparelhos Funcionais', 290.00, 7),
  ('PIPS (Planas Simples)', 'Aparelhos Funcionais', 270.00, 7),
  ('Twin Block', 'Aparelhos Funcionais', 336.00, 7),
  -- Família Klammt (substitui o antigo "Ativador Klammt" genérico)
  ('Klammt CL I', 'Aparelhos Funcionais', 0.00, 7),
  ('Klammt CL II (com escudo inferior)', 'Aparelhos Funcionais', 0.00, 7),
  ('Klammt CL III (com escudo superior)', 'Aparelhos Funcionais', 0.00, 7),
  -- Família SN (substitui o antigo "SN1, 2, 3" genérico)
  ('SN1', 'Aparelhos Funcionais', 0.00, 7),
  ('SN2 (Mantenedor Lingual)', 'Aparelhos Funcionais', 0.00, 7),
  ('SN3', 'Aparelhos Funcionais', 0.00, 7),
  ('SN4', 'Aparelhos Funcionais', 0.00, 7),
  ('SN7', 'Aparelhos Funcionais', 0.00, 7),
  ('SN11', 'Aparelhos Funcionais', 0.00, 7),
  ('Bionator Fechado', 'Aparelhos Funcionais', 0.00, 7),
  ('Aparelho Bioajustador de Classe II', 'Aparelhos Funcionais', 0.00, 7),
  ('Arco Base de Ricketts', 'Aparelhos Funcionais', 0.00, 7),
  ('Ativador de Rossi', 'Aparelhos Funcionais', 0.00, 7),
  ('Aparelho Móvel com Arco Eschler', 'Aparelhos Funcionais', 0.00, 7),
  ('Aparelho Móvel com Arco Hawley', 'Aparelhos Funcionais', 0.00, 7),
  ('Aparelho Móvel em Leque (Morelli)', 'Aparelhos Funcionais', 0.00, 7),
  ('Aparelho Móvel Schwarz', 'Aparelhos Funcionais', 0.00, 7),
  ('Aparelho Móvel Sem Arco', 'Aparelhos Funcionais', 0.00, 7),
  ('Frankel CL I', 'Aparelhos Funcionais', 0.00, 7),
  ('Frankel CL II', 'Aparelhos Funcionais', 0.00, 7),
  ('Frankel CL III', 'Aparelhos Funcionais', 0.00, 7),
  ('HGS (Superior e Inferior)', 'Aparelhos Funcionais', 0.00, 7),
  ('Aparelho Móvel com Pista Metálica', 'Aparelhos Funcionais', 0.00, 7),
  ('PIPE (Planas Especiais)', 'Aparelhos Funcionais', 0.00, 7),
  ('Plano Inclinado', 'Aparelhos Funcionais', 0.00, 7),
  ('Progênico', 'Aparelhos Funcionais', 0.00, 7),
  ('Sanders (Superior e Inferior)', 'Aparelhos Funcionais', 0.00, 7),

  -- Disjuntores
  ('Hass', 'Disjuntores', 190.00, 7),
  ('Hyrax', 'Disjuntores', 180.00, 7),
  ('Mcnamara', 'Disjuntores', 170.00, 7),
  ('Disjuntor / HGS', 'Disjuntores', 309.00, 7),
  ('Mcnamara Modificado (Gabriela)', 'Disjuntores', 190.00, 7),
  ('Hass Modificado', 'Disjuntores', 0.00, 7),
  ('Hyrax Modificado', 'Disjuntores', 0.00, 7),
  ('Hyrax Modificado Butterfly (Em Leque)', 'Disjuntores', 0.00, 7),

  -- Placa e aparelhos ortodônticos removíveis
  ('Contenção Removível de Hawley', 'Placas e Aparelhos Removíveis', 99.00, 7),
  ('Contenção Removível Contínua', 'Placas e Aparelhos Removíveis', 109.00, 7),
  ('Grade Impedidora de Língua', 'Placas e Aparelhos Removíveis', 138.00, 7),
  ('Placa de Acetato', 'Placas e Aparelhos Removíveis', 99.00, 7),
  ('Placa Miorrelaxante', 'Placas e Aparelhos Removíveis', 129.00, 7),
  ('Thurow / Splint', 'Placas e Aparelhos Removíveis', 161.00, 7),
  ('Contenção Acetato 1mm', 'Placas e Aparelhos Removíveis', 0.00, 7),
  ('Contenção Acetato 2mm', 'Placas e Aparelhos Removíveis', 0.00, 7),
  ('Contenção Arco de Begg (Contínuo)', 'Placas e Aparelhos Removíveis', 0.00, 7),
  ('Contenção Arco Eschler', 'Placas e Aparelhos Removíveis', 0.00, 7),
  ('Contenção Arco Estético', 'Placas e Aparelhos Removíveis', 0.00, 7),
  ('Contenção com Placa Dupla (Acetato + Acrílico)', 'Placas e Aparelhos Removíveis', 0.00, 7),
  ('Contenção Wraparound', 'Placas e Aparelhos Removíveis', 0.00, 7),
  ('Contenção de Acetato Essix Dentsply', 'Placas e Aparelhos Removíveis', 0.00, 7),
  ('PPM - Placa Palatina de Memória', 'Placas e Aparelhos Removíveis', 0.00, 7),

  -- Aparelhos para ronco e apneia
  ('Placa de Ronco e Apneia CL1', 'Ronco e Apneia', 464.00, 7),
  ('Placa de Ronco e Apneia CL2', 'Ronco e Apneia', 499.00, 7),
  ('Placa de Ronco e Apneia CL3', 'Ronco e Apneia', 499.00, 7),
  ('Placa Reposicionadora Mandibular', 'Ronco e Apneia', 199.00, 7),

  -- Adicionais
  ('Mola em S', 'Adicionais', 8.00, 7),
  ('Mola Digital', 'Adicionais', 11.00, 7),
  ('Mola em Leque', 'Adicionais', 18.00, 7),
  ('Alça de Conquista', 'Adicionais', 9.00, 7),
  ('Gancho', 'Adicionais', 11.00, 7),
  ('Grade', 'Adicionais', 17.00, 7),
  ('Escudo Labial', 'Adicionais', 24.00, 7),
  ('Redutor de Diastema', 'Adicionais', 18.00, 7),
  ('Expansor (Parafuso)', 'Adicionais', 20.00, 7),
  ('Dente de Estoque', 'Adicionais', 20.00, 7);
