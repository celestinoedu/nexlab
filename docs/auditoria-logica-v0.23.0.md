# Revisão lógica do NexLab publicado — v0.23.0

Revisão realizada em 18/09/2026. Este documento registra o diagnóstico e a especificação proposta; não representa funcionalidades já implementadas.

**Base confirmada:** [NexLab publicado](https://nexlab.lotusnegocios.com), versão **0.23.0**, atualização de 17/09/2026, commit `99c928fa4d67a2307147659b3808f39c5d746c69`. O [deploy correspondente](https://github.com/celestinoedu/nexlab/actions/runs/35241265407) terminou com sucesso. `main` local e remoto apontavam para esse commit. A versão foi também conferida no rodapé do aplicativo publicado, acessado pelo botão “Explorar demonstração”.

**Alcance:** navegação nas telas publicadas de OS, Dashboard, Contas a Receber, Despesas, Estoque e Fechamento; reprodução de cenários na demonstração; revisão do código correspondente, dos relatórios, cadastros, consultas e migrations. As alterações de teste da demonstração ficaram no cache do navegador. Não houve escrita em cadastros de clientes, aplicação de migrations ou publicação.

Os achados de banco abaixo descrevem as migrations versionadas. Não foi consultado o catálogo administrativo do PostgreSQL de produção nem conciliado o conjunto de lançamentos de um cliente real. Portanto, diferenças decorrentes de migrations não aplicadas ou de alterações manuais no banco ainda precisam ser verificadas. Comportamento demonstrativo não substitui validação dos triggers e das transações reais.

## 1. Diagnóstico central

O sistema usa três conceitos diferentes como se fossem comparáveis: valor de pedidos, dinheiro movimentado e resultado mensal. A solução exige definir a origem, a data e o estado considerado em cada número.

Na demonstração publicada, **“A receber” do Dashboard e Contas a Receber coincidiram em R$ 3.078,59**, com o Financeiro filtrado em “Aberto / Todos os meses”. Logo, não se confirmou uma divergência aritmética entre esses dois totais nessa amostra. O Dashboard combina esse saldo acumulado com indicadores do mês corrente, sem filtro de período e sem explicação suficiente.

| Informação atual | Regra da v0.23.0 | Problema |
|---|---|---|
| Receita bruta no mês | OS não canceladas por `mes_referencia`, incluindo produção, já abatido o desconto | É previsão operacional; o nome “bruta” também é impreciso porque há desconto |
| A receber | Todas as contas com `status = aberto`, de qualquer mês | Não acompanha o recorte temporal dos demais números |
| Recebido no mês | Contas atualmente pagas, pelo mês de `data_pagamento` | Difere do mês da OS; valor recebido não é preservado separadamente do valor editável da cobrança |
| Despesas no mês | Todas as despesas pela única `data_despesa` | Não distingue competência, vencimento e pagamento |
| Fechamento | Recebimentos por pagamento menos despesas pela data genérica | Mistura critérios e não explica a formação do resultado |

Fontes: [DashboardPage.tsx](../src/features/dashboard/DashboardPage.tsx), [ContasReceberPage.tsx](../src/features/financeiro/ContasReceberPage.tsx), [FechamentoFinanceiroPage.tsx](../src/features/fechamento/FechamentoFinanceiroPage.tsx).

## 2. Achados e prioridades

P0: corrigir antes de tratar o fechamento como resultado confiável. P1: integrar à revisão dos módulos. P2: melhorar clareza e prevenir erros operacionais.

| ID | Prioridade | Evidência e consequência | Correção proposta |
|---|---|---|---|
| F01 | P0 | A migration 0003 mantém `mes_referencia` globalmente única em `fechamentos_financeiros`; a 0010 adiciona empresa, mas não substitui essa unicidade. O frontend usa conflito apenas por mês. Duas empresas podem disputar o mesmo mês; com RLS, a segunda pode receber erro. Achado de código/schema, sem teste entre clientes reais. | Unicidade e operação de fechamento por **empresa + mês**, preservando todas as linhas existentes. |
| F02 | P0 | `sincronizar_conta_receber_ordem` retorna imediatamente quando a OS deixa de estar entregue. A conta existente permanece. Reproduzido na demo: OS nº 2 passou para produção e sua cobrança de R$ 197,34 continuou aberta. | Distinguir correção de entrega, retrabalho e cancelamento. Correção de entrega suspende a cobrança aberta; retrabalho preserva entrega/cobrança; cancelamento exige tratamento financeiro explícito. Pagamentos existentes nunca desaparecem por mudança operacional. |
| F03 | P0 | A sincronização reescreve `contas_receber.valor` inclusive quando a conta está paga. Alterar uma OS de R$ 100 para R$ 150 pode transformar o recebimento histórico em R$ 150, sem entrada adicional. | Preservar valor efetivamente recebido. No primeiro passo, impedir alteração de valor/entidade de OS liquidada até ajuste explícito; evolução por movimentos complementares e estornos, sem sobrescrever a baixa original. |
| F04 | P0 | Criação da OS grava cabeçalho e itens em requisições distintas. Edição grava cabeçalho, apaga todos os itens e reinsere. Uma falha intermediária pode deixar a OS sem itens e alterar a conta para zero. | Salvar OS, itens e futuras baixas em uma transação no PostgreSQL; conservar IDs dos itens existentes; rejeitar edição concorrente desatualizada. |
| F05 | P0 | As telas financeiras ignoram `isError`; listas ausentes viram `[]`. No fechamento, uma falha de consulta pode aparecer como zero e os valores calculados no navegador podem ser gravados. | Mostrar falha, bloquear fechamento com fonte indisponível e calcular a fotografia no banco, sobre um conjunto consistente de dados. |
| F06 | P0 | Consultas de OS, contas, despesas e estoque usam `select` sem paginação e somam no navegador. Se a quantidade superar o limite de resposta da API, os totais ficam incompletos. Não foi confirmado truncamento em cliente real. | Totais agregados no banco; listagens paginadas e filtradas no servidor; conferir o limite configurado. O limite padrão documentado do Supabase é 1.000 linhas. [Fonte oficial](https://supabase.com/docs/reference/javascript/select). |
| F07 | P1 | Dashboard sem período; previsão de pedidos e saldo acumulado aparecem junto de recebimentos mensais. Confirmado na tela publicada. | Mini extrato por pagamentos efetivos, filtro de período e indicadores de pendências explicitamente identificados. |
| F08 | P1 | Despesa possui apenas uma data, sem status de pagamento. Confirmado no formulário publicado. | Adicionar competência, vencimento, situação e pagamento efetivo; manter `data_despesa` histórica. |
| F09 | P1 | Fechar o mês congela só totais; lançamentos de origem continuam editáveis. Não existe composição congelada, versão da regra ou explicação de diferenças posteriores. | Guardar totais, composição, critério, autor e data. Detectar alterações posteriores e exigir revisão/reabertura para substituir o fechamento; não impedir a operação cotidiana por isso. |
| F10 | P1 | Conta paga também oferece “Cancelar conta”. O cancelamento muda o status e retira todo o valor dos recebimentos recalculados, embora o dinheiro possa não ter sido devolvido. | Cancelar cobrança pendente e estornar recebimento devem ser ações distintas. Estorno registra valor, motivo e data, preservando o recebimento original. |
| F11 | P1 | OS pode ser marcada paga antes da entrega, mas sua conta só nasce quando entregue. Um adiantamento pode ficar invisível no caixa durante a produção. | Registrar recebimento antecipado vinculado à OS; entra no caixa na data real, e na receita por competência apenas quando entregue. Não contar novamente quando a conta for gerada. |
| F12 | P1 | Alterar entidade de cliente para parceiro é permitido. Os totais de OS usam o tipo atual da entidade; contas existentes não são sincronizadas diretamente por essa alteração. | Impedir troca de tipo em entidade com histórico, ou criar uma nova relação comercial. Preservar preços/comissões históricos; não recalcular em massa. |
| F13 | P1 | Seleção de pagamentos em lote sobrevive aos filtros; a mutação envia todos os IDs selecionados, sem restringir a contas ainda abertas. Pode liquidar seleção invisível ou já modificada. | Exibir a lista e soma exatas na confirmação, reconciliar a seleção ao filtrar e validar status/versão no banco. |
| F14 | P1 | A baixa em Contas a Receber invalida apenas seu próprio cache; o trigger atualiza a OS, mas a lista de OS pode continuar mostrando situação antiga até refetch. | Invalidar também OS e todas as consultas financeiras dependentes após baixa/reabertura. |
| F15 | P1 | Estoque é um cadastro de quantidade editável, sem vínculo com item de OS e sem histórico de movimentos. Confirmado nas telas e no schema. | Baixa opcional por item, movimentos rastreáveis e atualização atômica de saldo. |
| F16 | P2 | Limpar o mês no Fechamento gera data inválida e aciona a tela global de erro. Reproduzido no publicado. | Tratar campo vazio antes de formatar/calcular; pedir mês válido, sem derrubar a tela. |
| F17 | P2 | Preço sugerido é aplicado ao escolher serviço, mas não ao trocar a entidade depois. Preços da entidade anterior podem permanecer; comissão vazia é aceita e vira zero no cálculo. | Ao trocar entidade, mostrar diferenças e permitir reaplicar a tabela. Exigir confirmação explícita para comissão/serviço gratuito; conservar valores negociados manualmente. |
| F18 | P2 | Formulário de OS consulta só entidades e serviços ativos. Uma OS histórica ligada a cadastro inativado pode mostrar seleção vazia mesmo mantendo o ID. | Incluir as referências históricas já vinculadas, identificadas como inativas; impedir apenas novas escolhas indevidas. |
| F19 | P2 | Relatórios personalizados usam data de recebimento da OS; extrato por entidade usa `mes_referencia`; financeiro recebido usa data de pagamento. Com filtro de serviço, o relatório soma itens sem ratear desconto da OS. | Explicitar a base temporal. Para conciliação, usar a mesma base; apresentar subtotal antes do desconto ou ratear o desconto apenas na apresentação, com soma em centavos reconciliada. |
| F20 | P2 | “Serviços atrasados” conta OS; o link abre Canhotos sem filtro correspondente. “Atualizado hoje” é fixo; OS cancelada pode contar como último movimento do cliente. | Chamar de OS atrasadas, abrir a lista filtrada, informar atualização real e excluir canceladas do indicador de relacionamento. |

Referências de implementação: [migration 0003](../supabase/migrations/0003_financeiro.sql), [migration 0010](../supabase/migrations/0010_multi_tenant.sql), [migration 0017](../supabase/migrations/0017_sincronizar_contas_receber.sql), [migration 0019](../supabase/migrations/0019_reabertura_e_sincronia_financeira.sql), [mutação de OS](../src/features/ordens-servico/hooks/useOrdemServicoMutations.ts), [mutação financeira](../src/features/financeiro/hooks/useContaReceberMutations.ts), [fechamento](../src/features/fechamento/hooks/useFechamentosFinanceiros.ts), [formulário de OS](../src/features/ordens-servico/components/OrdemServicoFormDialog.tsx), [cadastro de entidade](../src/features/entidades/components/EntidadeFormDialog.tsx), [cálculo dos relatórios](../src/features/relatorios/relatorioPersonalizado.ts).

## 3. Regra proposta para o Dashboard

Filtro visível: **Este mês / Mês passado / Período personalizado**, com início e fim inclusivos. O período selecionado acompanha os links para as telas de detalhe.

O bloco Financeiro deve mostrar:

| Campo | Critério |
|---|---|
| Entradas no período | Recebimentos efetivos pela data do recebimento, incluindo adiantamentos identificados |
| Saídas no período | Despesas pagas e devoluções/estornos efetivos pela data do pagamento |
| Movimento líquido | Entradas menos saídas; não chamar de saldo bancário, pois não há conciliação ou saldo inicial completo |
| A receber — posição atual | Cobranças pendentes elegíveis, com aviso “todos os períodos” e link para o filtro equivalente |
| A pagar — posição atual | Despesas pendentes; vencidas identificadas pelo vencimento, nunca pela competência |

**Mini extrato:** data, descrição, cliente/fornecedor quando disponível, origem/OS, entrada, saída. Mostrar as últimas 8–10 movimentações do período, com “Ver todas”. Os totais devem considerar o período inteiro, não só as linhas visíveis. Despesa pendente não entra nas saídas realizadas. Cobrança aberta não entra nas entradas realizadas.

A posição atual de pendências permanece identificada à parte do recorte do extrato. Não apresentar “saldo em julho” usando o estado atual das contas: uma posição histórica exige movimentos de pagamento/estorno que permitam reconstruir o passado.

Produção deve ter a base temporal explícita: “OS recebidas no período”, “OS entregues no período” e “Em produção agora”. Alertas de atraso e estoque representam a situação atual e devem ser rotulados assim. Não usar o mês híbrido da OS como se fosse uma data de produção universal.

## 4. Fechamento mensal simples, inspirado em DRE

Nome sugerido: **Fechamento do mês**. Explicação na tela: “Veja o resultado dos serviços entregues e das despesas que pertencem a este mês.” Trata-se de um resultado gerencial simplificado; não anunciar lucro contábil completo sem os demais componentes necessários.

Proposta para o primeiro estágio, sem impor plano de contas aos clientes:

| Linha | Exemplo ilustrativo | Regra |
|---|---:|---|
| Serviços entregues no mês | R$ 12.000,00 | Clientes pelo valor de venda; parceiros pela comissão; valores líquidos dos descontos, incluindo cobranças abertas e pagas válidas |
| (−) Despesas do mês | R$ 7.000,00 | Pela competência, pagas ou pendentes; detalhamento pelas categorias já cadastradas |
| (=) Resultado do mês | **R$ 5.000,00** | Receita por competência menos despesas por competência |

Expandir “Despesas do mês” mostra Material, Pessoal, Aluguel e outras categorias existentes. Categoria vazia aparece em “Sem categoria”; nenhum lançamento pode desaparecer por falta de classificação. Futuramente, pode haver agrupamento opcional em custos de produção e despesas administrativas, sem renomear categorias históricas.

Também mostrar, em um quadro complementar: **recebido no mês, pago no mês e movimento líquido**. Esses valores precisam ser exatamente os do extrato do Dashboard com o mesmo período. O resultado e o movimento líquido podem diferir, e a tela deve explicar essa diferença.

Exemplo: serviço de R$ 1.000 entregue em setembro e recebido em outubro; despesa de R$ 300 com competência setembro, vencimento em outubro e pagamento em novembro. Setembro tem resultado de R$ 700; outubro tem entrada de R$ 1.000; novembro tem saída de R$ 300. A despesa aparece no resultado uma única vez e no caixa uma única vez.

Fluxo em uma tela: escolher mês → conferir composição e pendências → **Fechar mês**. Contas abertas não impedem fechar por competência. Inconsistências de dados e falhas de leitura impedem; aviso de lançamento sem classificação apenas facilita a revisão. Mês ainda em curso aparece como “Prévia”; fechamento definitivo após seu término, ou ação administrativa explicitamente identificada como parcial.

Ao fechar, gravar a fotografia no banco com empresa, mês, totais, composição, critério da apuração, autor e data. Ao reabrir, manter a versão anterior para consulta e registrar motivo. Pagamentos posteriores não alteram a receita por competência de um serviço já entregue. Ajustes de valor precisam de regra explícita e trilha, especialmente em períodos fechados.

Fechamentos antigos permanecem com seus valores e com a identificação **“Critério anterior: recebimentos menos despesas pela data cadastrada”**. Não converter retrospectivamente o mesmo registro em DRE por competência. Uma nova apuração deve ser uma revisão identificada.

## 5. Despesas: três datas com propósitos distintos

| Campo | Comportamento proposto |
|---|---|
| Competência | Mês/ano ao qual a despesa pertence; alimenta o resultado |
| Vencimento | Dia previsto para quitar a conta; alimenta contas a pagar e atraso |
| Situação | A pagar / Paga; para histórico incompleto, identificação própria de “pagamento não confirmado” |
| Pagamento efetivo | Dia em que o dinheiro saiu; obrigatório ao marcar paga e vazio para pendente |
| Valor, descrição, categoria e observações | Mantêm o formato e conteúdo atuais |

Para novos registros, sugerir a competência atual e permitir ajuste. Pagamento não deve ser preenchido automaticamente como se já tivesse acontecido. A lista precisa de filtros por competência, vencimento ou pagamento, além de situação, e totais distintos de previsto, pago e pendente.

**Tratamento do legado:** preservar `data_despesa`. Usar seu mês como referência provisória de competência, explicitando a origem. Não transformar essa data em três fatos comprovados. Vencimento e pagamento ficam sem informação até confirmação. Para comparar com o histórico, disponibilizar a apuração antiga; no novo extrato, identificar valores antigos com pagamento não confirmado e impedir que sejam apresentados silenciosamente como caixa conciliado. Não reclassificar todas as despesas antigas como pendentes, pois isso criaria uma dívida fictícia.

Lançamentos de investimento, retirada dos sócios e transferências merecem classificação futura própria: não deduzir automaticamente seu valor integral do resultado operacional. Como as categorias atuais são livres, não inferir essa classificação apenas pelo nome nem alterar registros antigos sem revisão.

## 6. Estoque integrado aos itens das OS

Ao incluir ou editar um serviço, oferecer **“Baixar estoque”**, inicialmente desmarcado. Quando marcado, mostrar os insumos escolhidos, a quantidade a consumir de cada um, sua unidade e o saldo disponível. Serviço e insumo são cadastros distintos; não assumir equivalência por nome. Um serviço pode consumir mais de um insumo, e a quantidade consumida pode ser fracionária.

Regras propostas:

1. A baixa ocorre **ao salvar com sucesso a OS**. Selecionar a opção ou abandonar o formulário não altera saldo.
2. Quantidade informada deve ser rotulada como total a consumir naquele item. Evita multiplicação ambígua pela quantidade de serviços; uma sugestão por unidade poderá ser adicionada posteriormente.
3. Salvar novamente sem mudanças não baixa novamente. Cada item mantém sua identidade e cada operação possui controle de repetição.
4. Correções de quantidade registram apenas a diferença. Mudanças de insumo registram devolução/correção do anterior e consumo do novo, na mesma transação.
5. Ao remover item, desmarcar baixa ou cancelar OS que já consumiu material, perguntar se houve **devolução física** ou se o material foi **consumido/perdido**. Cancelamento financeiro não devolve resina já utilizada. Registrar decisão e motivo.
6. Duas pessoas não podem consumir o mesmo saldo simultaneamente acima do disponível. Conferência e atualização acontecem no banco; se faltar estoque, nenhuma parte da OS/baixa é gravada.
7. Histórico de estoque registra entrada, saída, devolução e ajuste, com insumo, quantidade, unidade, OS/item quando aplicável, usuário e data. Insumo com histórico deve ser inativado, preservando os vínculos.
8. OS antigas não geram baixas retroativas. O saldo cadastrado atual é a posição inicial; movimentos passam a existir a partir da ativação da integração.
9. Baixar estoque não cria automaticamente outra despesa. No primeiro estágio, o resultado continua usando despesas por competência; somar também o custo do consumo duplicaria o custo de compras já lançadas. Custeio por consumo exige etapa própria e regra de transição.

## 7. Preservação dos dados atuais

Não alterar IDs, números internos, número de OS do cliente, vínculos, preços, comissões, descontos, categorias, unidades ou datas antigas. Corrigir comportamento não exige redesenhar os cadastros históricos.

As mudanças necessárias são **aditivas**: campos opcionais para as novas informações, movimentos vinculados a registros existentes e metadados/versões de fechamento. É inevitável guardar os novos conceitos em algum lugar; tentar colocá-los em `observacoes` ou reaproveitar uma data com outro significado criaria mais incoerência.

Manter as tabelas e campos antigos legíveis pelas versões já instaladas do aplicativo. A PWA pode manter clientes na versão anterior até aceitarem a atualização: a migração precisa suportar esse intervalo, com regras essenciais também no banco. O frontend novo deve ser publicado somente após a disponibilização das mudanças de banco compatíveis.

Preservar valor cheio para clientes e comissão para parceiros; não aplicar percentuais genéricos. Alteração de catálogo ou tabela de preço não deve reprecificar OS existentes. Preservar o piso zero dos totais atuais e explicitar descontos que excedam o subtotal para revisão.

Antes de qualquer ajuste histórico, gerar uma relação de inconsistências para conferência, sem correção automática: contas abertas ligadas a OS não entregue; valores divergentes de OS/conta; contas pagas sem data; OS pagas antes da entrega; despesas sem informação temporal suficiente. Dados ambíguos devem continuar identificados como ambíguos até validação.

## 8. Ordem de execução recomendada

1. **Confiabilidade:** fechamento por empresa/mês, transações de OS, pagamentos imutáveis, cancelamento/retrabalho, tratamento de erro e consultas completas.
2. **Datas e conciliação:** competência/vencimento/pagamento de despesas, adiantamentos, baixa financeira e atualização das telas dependentes.
3. **Dashboard e fechamento:** filtro de período, mini extrato, resultado por competência, composição e versões de fechamento.
4. **Estoque:** movimentos e baixa opcional por item, com concorrência e tratamento de devolução/perda.
5. **Coerência transversal:** filtros de relatórios, descontos, cadastros inativos, precificação ao trocar entidade e links dos indicadores.

## 9. Critérios de aceite

| Cenário | Resultado esperado |
|---|---|
| Dashboard “A receber — posição atual” e financeiro “Aberto / Todos os meses” | Mesmo total, mesma elegibilidade |
| Recebimento em mês diferente da entrega | Resultado no mês da entrega; caixa no mês recebido |
| Competência, vencimento e pagamento em três meses diferentes | Cada data afeta apenas seu indicador |
| Despesa antiga sem informações novas | Continua acessível, sem vencimento ou pagamento inventado |
| OS paga com alteração de preço | Pagamento original preservado; ajuste explícito |
| Adiantamento de OS em produção | Caixa reconhece o recebimento; entrega não duplica a entrada |
| Cancelamento de OS/cobrança já recebida | Recebimento preservado; devolução identificada separadamente |
| Duas empresas fecham o mesmo mês | Duas fotografias independentes |
| Falha de leitura financeira | Erro visível e fechamento indisponível, nunca zero presumido |
| Mais de 1.000 registros | Totais completos e conciliáveis com consulta agregada |
| Mês vazio/inválido | Validação local, sem tela global de erro |
| Salvar OS com baixa duas vezes | Uma única baixa para o consumo informado |
| Falha ao gravar itens ou falta de estoque | Transação integralmente revertida |
| Cancelamento com material consumido | Saldo não aumenta sem devolução física confirmada |
| Edição concorrente da mesma OS ou saldo | Conflito tratado sem sobrescrever silenciosamente |
| Extrato mostra só 10 movimentos | Totais continuam considerando todo o período |
| Fechamento antigo e revisão nova | Critérios e versões distintos; valores anteriores preservados |
| Compra já lançada em Despesas e baixa do mesmo material | Sem duplicação automática de custo no resultado |
| Pagamento em lote após filtro/alteração concorrente | Apenas as contas exibidas na confirmação e ainda elegíveis são liquidadas |

Evidências locais da inspeção ficam em `output/playwright/`: `dashboard-publicado.yml`, `dashboard-publicado.png`, `contas-publicado.yml`, `fechamento-julho-publicado.yml`, `despesa-form-publicado.yml`, `estoque-publicado.yml`, `os-form-publicado.yml`, `os-reaberta-demo.yml`, `conta-os-reaberta-demo.yml` e `fechamento-mes-vazio.yml`. Esses artefatos são ignorados pelo Git. A reprodução da OS reaberta e a limpeza do mês ocorreram somente na sessão de demonstração.
