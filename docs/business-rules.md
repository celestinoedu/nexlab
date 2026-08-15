# NexLab — Regras de negócio

## Clientes vs. Parceiros

- **Cliente**: consultório/dentista atendido diretamente pelo GRS Lab. O GRS Lab cobra o **valor cheio** do serviço.
- **Parceiro**: laboratório maior para quem o GRS Lab presta serviço como subcontratado. O Parceiro paga uma **comissão** por serviço entregue (não o valor cheio).
- Mesma tabela (`entidades`), diferenciadas por `tipo`. Isso significa que, dependendo da entidade vinculada a uma Ordem de Serviço, cada item usa `valor_unitario` (cliente) ou `valor_comissao` (parceiro) como o que o GRS Lab efetivamente recebe.

## Ordem de Serviço (OS) com múltiplos serviços

Uma OS pode conter **vários serviços** (itens) — por exemplo, uma mesma OS de um paciente pode ter "Contenção Hawley Superior" e "Contenção Hawley Inferior" como dois itens separados. Cada item tem seu próprio valor/comissão, além de dois atributos de produção:

- **Cor**: texto livre (ex.: código de cor dental) — não afeta preço, é só informação de produção.
- **Arco**: Superior ou Inferior, quando aplicável — também não afeta preço.

O catálogo de serviços (`servicos`) guarda só o **serviço pai** (ex.: "Contenção Hawley") — cor e arco **não são cadastrados no catálogo**, são escolhidos por item dentro de cada OS.

## Tabela de preços por entidade × serviço

Confirmado com o cliente: **não existe uma % genérica automática de comissão**. Cada Parceiro negocia um valor (fixo ou equivalente a uma % implícita) por tipo de serviço, e cada Cliente pode ter seu próprio preço de venda por serviço. Evidência real (relatórios recebidos dos parceiros — mantidos só localmente em `docs/assets/relatorios-exemplo/`, **não versionados** por conterem nomes de pacientes de terceiros; repositório é público):

- **SpartanDentalLab**: comissão em valor fixo por tipo de serviço, sem relação de % constante (ex.: PIPS R$642 → comissão R$135 ≈ 21%; Meia Mola R$29 → R$8 ≈ 27,5%).
- **MS Laboratorio**: comissão em % fixo de 37% sobre todos os itens (mas isso é uma coincidência de negociação desse parceiro específico — não uma regra do sistema).

Por isso a tabela `tabela_precos` guarda o **valor final já negociado** por `entidade_id × servico_id`, e não uma fórmula. Ao adicionar um item de serviço numa OS, o sistema busca esse valor automaticamente; se não existir, cai no `preco_padrao` do catálogo (`servicos`) — só relevante para Clientes (Parceiros sem preço específico cadastrado não devem gerar comissão "adivinhada", o valor fica em branco para preenchimento manual).

**Cliente novo nasce com a tabela de preços da GRS Lab, Parceiro nasce vazio**: ao cadastrar uma Entidade tipo Cliente, um trigger (`trg_copiar_precos_cliente`, migration `0009`) copia automaticamente o `preco_padrao` de cada serviço ativo do catálogo pra `tabela_precos` daquele cliente — editável depois, linha a linha, na mesma tela de sempre. Parceiro continua sem cópia nenhuma (tabela vazia até alguém preencher preço do parceiro + comissão), porque não existe "comissão padrão" pra copiar — cada Parceiro negocia a dele do zero (ver acima).

Na tela de Tabela de Preços, quando a entidade é Parceiro, cada serviço tem **dois** campos: **Preço do Parceiro** (o que o próprio parceiro cobra por aquele serviço — só referência, não entra em cálculo nenhum) e **Comissão** (o que o GRS Lab efetivamente recebe — esse sim usado em tudo: item de OS, Contas a Receber, Fechamento Financeiro). Isso porque o pagamento da comissão é calculado pelo parceiro em cima da tabela de preço **dele**, não da tabela do GRS Lab — o campo existe pra dar visibilidade e conferir se a comissão negociada bate. Um botão alterna a entrada da Comissão entre **R$** e **%** — o `%` é só uma conveniência de digitação (calcula a partir do Preço do Parceiro já preenchido, ou do `preco_padrao` do catálogo se ainda não tiver); o que fica gravado em `tabela_precos.preco` é sempre o valor final em R$, nunca a fórmula. Não muda a regra acima: continua sendo um valor fixo por entidade × serviço, não uma % genérica aplicada automaticamente a tudo.

## Tempo médio de conclusão → sugestão de prazo

Cada serviço do catálogo pode ter um `tempo_medio_dias` (dias médios estimados para conclusão). Ao montar uma OS, a **data de entrega prevista** é sugerida automaticamente como `data_recebimento + maior tempo_medio_dias entre os itens escolhidos` — é só uma sugestão inicial, sempre editável pelo usuário.

## Fechamento mensal ("mês cheio")

Todo fechamento financeiro considera o mês **completo**: do dia 1 ao último dia do mesmo mês — nunca um período parcial ou "mês móvel" (ex.: dia 15 a dia 14). A coluna `ordens_servico.mes_referencia` já calcula isso automaticamente a partir de `data_entrega` (ou `data_recebimento` se ainda não entregue). A tela de Contas a Receber sempre agrupa por esse mês cheio.

## Ordem de status de uma OS (Kanban)

`recebido` → `em_producao` → `pronto_entrega` → `entregue`. `cancelado` é um estado terminal alternativo, fora do fluxo principal (não aparece como coluna do Kanban — ver `docs/ux-flows.md`). Só OS com `status = 'entregue'` entram no cálculo de Contas a Receber (`vw_contas_receber`) — uma OS em produção não é "a receber" ainda.

## Numeração

- **Nº OS** (`ordens_servico.numero_os`): sequencial interno do GRS Lab. Sugerido automaticamente ao abrir uma nova OS, mas **editável** — útil para manter uma numeração legada (ex.: migrando de um controle em papel). Continua único; se um número já estiver em uso, o sistema avisa e pede outro (ou deixar em branco para gerar automaticamente). Não é o número de OS do laboratório parceiro (esse, se precisar ser registrado, vai em `observacoes`).
- **Nota de Serviço** (`notas_servico.numero`): `prefixo_nota_servico` + sequencial, controlado por `empresa_config.proximo_numero_nota`. Documento **sem valor fiscal** — não substitui nota fiscal eletrônica.

## Contas a Receber

- **Cada OS entregue vira automaticamente uma linha de Contas a Receber** (`contas_receber`) — não é preciso lançar nada manualmente. A linha nasce com o valor calculado no momento da entrega (mesma lógica de "valor efetivo" descrita acima) e **não muda sozinha** se a OS for editada depois (mesma filosofia de "travar o valor" do fechamento mensal).
- Uma conta a receber tem três estados: `aberto` (default, aguardando) → `pago` (com data e forma de pagamento) ou `cancelado`.
- **"Excluir" uma conta a receber é sempre um cancelamento com justificativa**, nunca uma exclusão de verdade: exige que o usuário explique o motivo, a linha some da visão padrão da tela mas continua no banco com `status = cancelado` e só reaparece se o usuário marcar "Mostrar cancelados". Ação restrita a `admin`.
- O formulário da própria OS tem um **status financeiro** (Pendente/Pago) e **forma de pagamento** — é a mesma informação usada para popular a conta a receber no momento em que a OS é marcada como entregue; depois disso, quem gerencia o pagamento é a tela de Contas a Receber.
- "Fechar o mês" (ação em `fechamentos`, por entidade) tira uma foto do valor total daquele momento — recurso existente desde a v0.1.0, ainda sem tela própria.

## Fechamento Financeiro (resultado do laboratório)

Distinto do fechamento por entidade acima: mostra o **resultado do laboratório inteiro** num mês — tudo que foi efetivamente recebido (Contas a Receber com `status = pago`, pelo mês do pagamento) menos as Despesas lançadas naquele mês. Antes de fechar, os totais são recalculados ao vivo toda vez que a tela é aberta; a ação "Fechar o mês" (só `admin`) trava um snapshot em `fechamentos_financeiros` — se novas contas/despesas entrarem depois, o valor fechado não muda até alguém fechar o mês de novo.

## Despesas

Cadastro simples de saídas de caixa do laboratório (categoria livre, descrição, valor, data, observações) — sem vínculo com OS ou entidade. Alimenta o Fechamento Financeiro.

## Emissão de documentos

- **Download do PDF da Ordem de Serviço**: disponível quando a OS está com status **Entregue** — sempre baixa um arquivo PDF (`OS-<número>.pdf`) com os dados da OS e a lista de itens (serviço, cor, arco, quantidade, valor), nunca só abre pra visualizar. Não é um documento fiscal.
- **Relatório de Fechamento** (Fase 4): por entidade + mês, replica o formato dos relatórios reais recebidos dos parceiros (linha a linha: Nº OS, datas, cliente final, serviço, quantidade, valor, comissão) — serve tanto para o GRS Lab cobrar um Cliente quanto para conferir/cobrar a comissão de um Parceiro.
- **Nota de Serviço** (Fase 4): emitida por OS entregue, formato cupom numerado, sem valor fiscal — comprovante interno de entrega/cobrança. Diferente do PDF da OS: a Nota de Serviço tem numeração sequencial própria e fica registrada em `notas_servico`.

## Perfis de usuário

- `admin`: acesso completo, incluindo editar preços/comissões (`tabela_precos`), configuração da empresa, cancelar uma conta a receber (com justificativa) e fechar o mês (por entidade em `fechamentos`, ou o resultado do laboratório em `fechamentos_financeiros`).
- `operador`: opera o dia a dia (criar/editar Ordens de Serviço, cadastrar Clientes/Parceiros, lançar Despesas, marcar uma conta a receber como paga/pendente, baixar PDF de OS e do Relatório de Fechamento) mas não altera preços nem fecha o financeiro — reduz risco de erro por parte de quem só usa o sistema para o fluxo operacional.
