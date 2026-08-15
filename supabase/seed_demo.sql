-- =============================================================================
-- NexLab — Seed da empresa Demonstração (dado 100% fictício)
--
-- Roda DEPOIS de: migration 0011_empresa_demo.sql (cria a linha em `empresas`
-- com is_demo = true) + o usuário de login teste@teste.com criado manualmente
-- e vinculado em `profiles` (ver SETUP.md § "Provisionar a empresa
-- Demonstração"). Todo nome de cliente/parceiro/paciente aqui é inventado —
-- qualquer semelhança com laboratório ou paciente real é coincidência.
--
-- Gera ~3 meses de movimento (hoje - 92 dias até hoje): catálogo de
-- serviços, clientes/parceiros, tabela de preços, ~48 Ordens de Serviço em
-- vários status (a maior parte "entregue", algumas em andamento, uma ou
-- outra cancelada), despesas do laboratório e 2 fechamentos financeiros já
-- fechados. Contas a Receber nasce sozinho via trigger existente
-- (trg_os_criar_conta_receber) quando uma OS é marcada como "entregue" —
-- por isso cada OS é inserida em duas etapas (cabeçalho + itens, depois um
-- UPDATE que muda o status pro valor final): a soma dos itens só existe
-- depois da segunda etapa, senão a Conta a Receber nasceria com valor 0.
--
-- Idempotente: reexecutável — apaga o dado demo anterior (só desta empresa,
-- nunca de outro tenant) antes de inserir de novo.
-- =============================================================================

do $$
declare
  v_empresa_id uuid := 'de000000-0000-4000-8000-000000000001';
  v_hoje date := current_date;

  v_servicos uuid[];
  v_clientes uuid[];
  v_parceiros uuid[];

  v_nomes_pacientes text[] := array[
    'Ana Beatriz Lima', 'Bruno Cardoso Silva', 'Camila Ferreira', 'Diego Almeida Santos',
    'Elisa Martins Rocha', 'Felipe Nogueira', 'Gabriela Ramos', 'Henrique Barbosa',
    'Isabela Correia', 'João Pedro Teixeira', 'Larissa Moura', 'Marcos Vinícius Dias',
    'Natália Pereira', 'Otávio Guimarães', 'Patrícia Nunes', 'Rafael Cavalcanti',
    'Sofia Andrade', 'Thiago Monteiro', 'Vitória Campos', 'William Souza Costa'
  ];
  v_clinicas text[] := array[
    'Consultório Dr. Eduardo Ramos', 'Clínica Sorriso Pleno', 'Espaço Odonto Vida',
    'Consultório Dra. Renata Alves', 'Clínica OdontoCare', 'Consultório Dr. Paulo Freitas'
  ];
  v_formas_pagamento text[] := array['Pix', 'Boleto', 'Cartão', 'Transferência'];

  v_entidade_id uuid;
  v_entidade_tipo text;
  v_ordem_id uuid;
  v_dias_atras int;
  v_data_receb date;
  v_data_prevista date;
  v_data_entrega date;
  v_status text;
  v_status_pagto text;
  v_data_pagto date;
  v_forma_pgto text;
  v_desconto numeric(10,2);
  v_cliente_final text;
  v_paciente text;
  v_num_itens int;
  v_servico_id uuid;
  v_preco_base numeric(10,2);
  v_valor_unit numeric(10,2);
  v_qtd int;
  v_arco arco_dentario;
  v_comissao numeric(10,2);
  v_mes date;
begin
  -- ---------------------------------------------------------------------------
  -- 0. Limpeza idempotente — só o dado desta empresa (nunca mexe em outro tenant)
  -- ---------------------------------------------------------------------------
  delete from ordens_servico where empresa_id = v_empresa_id;
  delete from tabela_precos where empresa_id = v_empresa_id;
  delete from despesas where empresa_id = v_empresa_id;
  delete from insumos where empresa_id = v_empresa_id;
  delete from fechamentos_financeiros where empresa_id = v_empresa_id;
  delete from entidades where empresa_id = v_empresa_id;
  delete from servicos where empresa_id = v_empresa_id;

  -- ---------------------------------------------------------------------------
  -- 1. Catálogo de serviços (fictício, várias categorias)
  -- ---------------------------------------------------------------------------
  insert into servicos (empresa_id, nome, categoria, preco_padrao, tempo_medio_dias, ativo) values
    (v_empresa_id, 'Placa Hawley', 'Contenções', 180.00, 5, true),
    (v_empresa_id, 'Contenção Essix', 'Contenções', 150.00, 4, true),
    (v_empresa_id, 'Contenção Fixa 3x3', 'Contenções', 120.00, 5, true),
    (v_empresa_id, 'Mantenedor de Espaço', 'Contenções', 160.00, 6, true),
    (v_empresa_id, 'Aparelho Expansor Palatino', 'Aparelhos Ortodônticos', 320.00, 8, true),
    (v_empresa_id, 'Arco Lingual', 'Aparelhos Ortodônticos', 210.00, 6, true),
    (v_empresa_id, 'Bionator', 'Aparelhos Ortodônticos', 340.00, 9, true),
    (v_empresa_id, 'Posicionador Dentário', 'Aparelhos Ortodônticos', 260.00, 7, true),
    (v_empresa_id, 'Placa de Bruxismo', 'Placas e Guias', 190.00, 5, true),
    (v_empresa_id, 'Placa Miorrelaxante', 'Placas e Guias', 200.00, 5, true),
    (v_empresa_id, 'Guia Cirúrgico', 'Placas e Guias', 280.00, 6, true),
    (v_empresa_id, 'Moldeira Individual', 'Placas e Guias', 110.00, 3, true),
    (v_empresa_id, 'Prótese Total', 'Próteses', 650.00, 12, true),
    (v_empresa_id, 'Prótese Parcial Removível', 'Próteses', 480.00, 10, true),
    (v_empresa_id, 'Coroa Provisória', 'Próteses', 140.00, 4, true),
    (v_empresa_id, 'Núcleo de Preenchimento', 'Próteses', 130.00, 4, true),
    (v_empresa_id, 'Reembasamento de Prótese', 'Próteses', 95.00, 3, true),
    (v_empresa_id, 'Splint de Estabilização', 'Placas e Guias', 220.00, 6, true);

  select array_agg(id) into v_servicos from servicos where empresa_id = v_empresa_id;

  -- ---------------------------------------------------------------------------
  -- 2. Clientes (consultórios — cobrança direta) e Parceiros (comissão)
  --    Inserir clientes dispara o trigger existente trg_copiar_precos_cliente,
  --    que já copia preco_padrao de cada serviço ativo pra tabela_precos do
  --    cliente — não precisa seedar isso manualmente.
  -- ---------------------------------------------------------------------------
  insert into entidades (empresa_id, tipo, nome, documento, telefone, email, ativo) values
    (v_empresa_id, 'cliente', 'Consultório Sorriso Feliz', '11.222.333/0001-44', '(11) 3456-7890', 'contato@sorrisofeliz.exemplo', true),
    (v_empresa_id, 'cliente', 'Clínica OdontoVida', '22.333.444/0001-55', '(11) 3456-1234', 'financeiro@odontovida.exemplo', true),
    (v_empresa_id, 'cliente', 'Dr. Marcos Andrade', '111.222.333-44', '(11) 98765-4321', 'marcos.andrade@exemplo.com', true),
    (v_empresa_id, 'cliente', 'Dra. Camila Souza — Ortodontia', '222.333.444-55', '(11) 98765-1122', 'camila.souza@exemplo.com', true),
    (v_empresa_id, 'cliente', 'Clínica Odonto Excellence', '33.444.555/0001-66', '(11) 3222-8899', 'contato@excellence.exemplo', true),
    (v_empresa_id, 'cliente', 'Dr. Rodrigo Peixoto', '333.444.555-66', '(11) 98888-2233', 'rodrigo.peixoto@exemplo.com', true);

  insert into entidades (empresa_id, tipo, nome, documento, telefone, email, ativo) values
    (v_empresa_id, 'parceiro', 'Laboratório Prisma Odonto', '44.555.666/0001-77', '(11) 3777-4455', 'parceria@prismaodonto.exemplo', true),
    (v_empresa_id, 'parceiro', 'Delta Prótese Dental', '55.666.777/0001-88', '(11) 3999-2211', 'comercial@deltapdental.exemplo', true),
    (v_empresa_id, 'parceiro', 'OrtoLab Parceiros', '66.777.888/0001-99', '(11) 3111-6677', 'ortolab@parceiros.exemplo', true);

  select array_agg(id) into v_clientes from entidades where empresa_id = v_empresa_id and tipo = 'cliente';
  select array_agg(id) into v_parceiros from entidades where empresa_id = v_empresa_id and tipo = 'parceiro';

  -- Parceiro não tem cópia automática de tabela de preços — cadastra a
  -- comissão (preco) e o preço de referência do próprio parceiro
  -- (preco_parceiro), pra cada serviço ativo.
  insert into tabela_precos (entidade_id, servico_id, preco, preco_parceiro)
  select ent.id, srv.id, round(srv.preco_padrao * 0.65, 2), round(srv.preco_padrao * 1.3, 2)
  from entidades ent
  cross join servicos srv
  where ent.empresa_id = v_empresa_id and ent.tipo = 'parceiro' and srv.empresa_id = v_empresa_id and srv.ativo = true;

  -- Um pouco de "tabela negociada" nos clientes — alguns preços diferentes
  -- do catálogo padrão (a cópia automática já deixou tudo igual ao catálogo).
  update tabela_precos set preco = round(preco * 0.9, 2)
  where entidade_id = v_clientes[1] and servico_id in (v_servicos[1], v_servicos[5]);
  update tabela_precos set preco = round(preco * 0.85, 2)
  where entidade_id = v_clientes[2] and servico_id = v_servicos[13];

  -- ---------------------------------------------------------------------------
  -- 3. ~48 Ordens de Serviço distribuídas nos últimos ~3 meses
  -- ---------------------------------------------------------------------------
  for i in 1..48 loop
    if random() < 0.7 then
      v_entidade_tipo := 'cliente';
      v_entidade_id := v_clientes[1 + floor(random() * array_length(v_clientes, 1))::int];
    else
      v_entidade_tipo := 'parceiro';
      v_entidade_id := v_parceiros[1 + floor(random() * array_length(v_parceiros, 1))::int];
    end if;

    v_dias_atras := floor(random() * 92)::int;
    v_data_receb := v_hoje - v_dias_atras;
    v_paciente := v_nomes_pacientes[1 + floor(random() * array_length(v_nomes_pacientes, 1))::int];
    v_cliente_final := case when v_entidade_tipo = 'parceiro'
      then v_clinicas[1 + floor(random() * array_length(v_clinicas, 1))::int]
      else null
    end;

    -- Cabeçalho inicial (status "recebido") — status final vem depois do
    -- UPDATE, já com os itens inseridos (ver comentário no topo do arquivo).
    insert into ordens_servico (empresa_id, entidade_id, cliente_final, nome_paciente, data_recebimento)
    values (v_empresa_id, v_entidade_id, v_cliente_final, v_paciente, v_data_receb)
    returning id into v_ordem_id;

    v_num_itens := 1 + floor(random() * 3)::int;
    for j in 1..v_num_itens loop
      v_servico_id := v_servicos[1 + floor(random() * array_length(v_servicos, 1))::int];
      select preco_padrao into v_preco_base from servicos where id = v_servico_id;
      v_valor_unit := round((v_preco_base * (0.9 + random() * 0.2))::numeric, 2);
      v_qtd := case when random() < 0.15 then 2 else 1 end;
      v_arco := case when random() < 0.55
        then (array['superior', 'inferior']::arco_dentario[])[1 + floor(random() * 2)::int]
        else null
      end;
      v_comissao := case when v_entidade_tipo = 'parceiro' then round(v_valor_unit * 0.65, 2) else null end;

      insert into ordem_servico_itens (ordem_id, servico_id, arco, quantidade, valor_unitario, valor_comissao)
      values (v_ordem_id, v_servico_id, v_arco, v_qtd, v_valor_unit, v_comissao);
    end loop;

    -- Status final: quanto mais antiga a OS, mais provável já ter sido
    -- entregue (com uma pequena chance de cancelamento).
    if v_dias_atras > 12 then
      v_status := case when random() < 0.06 then 'cancelado' else 'entregue' end;
    elsif v_dias_atras > 5 then
      v_status := (array['em_producao', 'pronto_entrega'])[1 + floor(random() * 2)::int];
    else
      v_status := (array['recebido', 'em_producao'])[1 + floor(random() * 2)::int];
    end if;

    if v_status = 'entregue' then
      v_data_entrega := least(v_data_receb + (3 + floor(random() * 8))::int, v_hoje);
      v_data_prevista := v_data_entrega;
    elsif v_status = 'cancelado' then
      v_data_entrega := null;
      v_data_prevista := v_data_receb + 7;
    else
      v_data_entrega := null;
      v_data_prevista := v_data_receb + (5 + floor(random() * 5))::int;
    end if;

    if v_status = 'entregue' and random() < 0.72 then
      v_status_pagto := 'pago';
      v_data_pagto := least(v_data_entrega + floor(random() * 5)::int, v_hoje);
      v_forma_pgto := v_formas_pagamento[1 + floor(random() * array_length(v_formas_pagamento, 1))::int];
    else
      v_status_pagto := 'pendente';
      v_data_pagto := null;
      v_forma_pgto := null;
    end if;

    v_desconto := case when random() < 0.12 then round((5 + random() * 45)::numeric, 2) else 0 end;

    update ordens_servico set
      status = v_status::status_os,
      data_prevista = v_data_prevista,
      data_entrega = v_data_entrega,
      desconto = v_desconto,
      observacoes = case when random() < 0.15 then 'Confirmar cor com o paciente antes da entrega final.' else null end,
      status_pagamento = v_status_pagto::status_pagamento_os,
      forma_pagamento = v_forma_pgto,
      data_pagamento = v_data_pagto
    where id = v_ordem_id;
  end loop;

  -- ---------------------------------------------------------------------------
  -- 4. Despesas do laboratório espalhadas pelos últimos ~3 meses
  -- ---------------------------------------------------------------------------
  insert into despesas (empresa_id, categoria, descricao, valor, data_despesa) values
    (v_empresa_id, 'Material', 'Resina acrílica — reposição de estoque', 480.00, v_hoje - 5),
    (v_empresa_id, 'Material', 'Gesso tipo IV', 210.00, v_hoje - 12),
    (v_empresa_id, 'Material', 'Fio ortodôntico TMA', 340.00, v_hoje - 20),
    (v_empresa_id, 'Equipamento', 'Manutenção da politriz', 260.00, v_hoje - 18),
    (v_empresa_id, 'Equipamento', 'Manutenção do forno de polimerização', 390.00, v_hoje - 45),
    (v_empresa_id, 'Aluguel', 'Aluguel do galpão — mês corrente', 2200.00, v_hoje - 8),
    (v_empresa_id, 'Aluguel', 'Aluguel do galpão — mês anterior', 2200.00, v_hoje - 38),
    (v_empresa_id, 'Aluguel', 'Aluguel do galpão — dois meses atrás', 2200.00, v_hoje - 68),
    (v_empresa_id, 'Utilidades', 'Conta de energia elétrica', 480.00, v_hoje - 10),
    (v_empresa_id, 'Utilidades', 'Conta de água', 120.00, v_hoje - 10),
    (v_empresa_id, 'Utilidades', 'Internet e telefone', 220.00, v_hoje - 9),
    (v_empresa_id, 'Transporte', 'Motoboy — entregas da semana', 180.00, v_hoje - 3),
    (v_empresa_id, 'Transporte', 'Motoboy — entregas da semana', 165.00, v_hoje - 25),
    (v_empresa_id, 'Transporte', 'Combustível — coleta em consultórios', 210.00, v_hoje - 33),
    (v_empresa_id, 'Pessoal', 'Pró-labore sócio-técnico', 3500.00, v_hoje - 15),
    (v_empresa_id, 'Pessoal', 'Salário auxiliar de laboratório', 1800.00, v_hoje - 15),
    (v_empresa_id, 'Marketing', 'Impressão de material para consultórios parceiros', 150.00, v_hoje - 55),
    (v_empresa_id, 'Outros', 'Assinatura de software de gestão', 89.90, v_hoje - 2);

  -- ---------------------------------------------------------------------------
  -- 5. Estoque — insumos fictícios, alguns já sinalizados para compra
  -- ---------------------------------------------------------------------------
  insert into insumos (empresa_id, nome, categoria, quantidade, unidade, valor_unitario, local_estoque, sinalizar_compra) values
    (v_empresa_id, 'Resina acrílica incolor', 'Resinas', 4, 'kg', 120.00, 'Armário 1 — Prateleira A', false),
    (v_empresa_id, 'Resina acrílica rosa', 'Resinas', 1, 'kg', 115.00, 'Armário 1 — Prateleira A', true),
    (v_empresa_id, 'Gesso tipo IV', 'Gessos', 8, 'saco', 85.00, 'Almoxarifado', false),
    (v_empresa_id, 'Gesso tipo III', 'Gessos', 2, 'saco', 65.00, 'Almoxarifado', true),
    (v_empresa_id, 'Fio ortodôntico TMA 0.017x0.025', 'Fios e Arcos', 15, 'un', 22.00, 'Armário 2 — Gaveta 3', false),
    (v_empresa_id, 'Fio ortodôntico redondo 0.9mm', 'Fios e Arcos', 3, 'un', 18.00, 'Armário 2 — Gaveta 3', true),
    (v_empresa_id, 'Cera utilidade', 'Ceras', 6, 'caixa', 28.00, 'Armário 1 — Prateleira B', false),
    (v_empresa_id, 'Cera rosa nº 7', 'Ceras', 1, 'caixa', 25.00, 'Armário 1 — Prateleira B', true),
    (v_empresa_id, 'Placa de acetato 1.0mm', 'Placas', 20, 'un', 6.50, 'Armário 3', false),
    (v_empresa_id, 'Placa de acetato 2.0mm', 'Placas', 5, 'un', 8.00, 'Armário 3', false),
    (v_empresa_id, 'Isolante para gesso', 'Insumos gerais', 2, 'litro', 32.00, 'Almoxarifado', false),
    (v_empresa_id, 'Lixa d''água grão 400', 'Insumos gerais', 30, 'un', 1.50, 'Bancada de acabamento', false),
    (v_empresa_id, 'Broca carbide tronco-cônica', 'Ferramentas', 4, 'un', 14.00, 'Bancada de acabamento', true),
    (v_empresa_id, 'Disco de carborundum', 'Ferramentas', 10, 'un', 3.20, 'Bancada de acabamento', false);

  -- ---------------------------------------------------------------------------
  -- 6. Fechamentos financeiros já fechados dos 2 meses anteriores ao atual
  --    (o mês corrente fica em aberto, calculado ao vivo pela tela)
  -- ---------------------------------------------------------------------------
  for k in 1..2 loop
    v_mes := date_trunc('month', v_hoje - make_interval(months => k))::date;

    insert into fechamentos_financeiros (empresa_id, mes_referencia, total_receitas, total_despesas, resultado, status, data_fechamento)
    select
      v_empresa_id,
      v_mes,
      coalesce((
        select sum(cr.valor) from contas_receber cr
        where cr.empresa_id = v_empresa_id and cr.status = 'pago'
          and date_trunc('month', cr.data_pagamento::timestamp)::date = v_mes
      ), 0),
      coalesce((
        select sum(d.valor) from despesas d
        where d.empresa_id = v_empresa_id
          and date_trunc('month', d.data_despesa::timestamp)::date = v_mes
      ), 0),
      coalesce((
        select sum(cr.valor) from contas_receber cr
        where cr.empresa_id = v_empresa_id and cr.status = 'pago'
          and date_trunc('month', cr.data_pagamento::timestamp)::date = v_mes
      ), 0) - coalesce((
        select sum(d.valor) from despesas d
        where d.empresa_id = v_empresa_id
          and date_trunc('month', d.data_despesa::timestamp)::date = v_mes
      ), 0),
      'fechado',
      (v_mes + interval '1 month' - interval '1 day')::date
    on conflict (mes_referencia) do nothing;
  end loop;
end $$;
