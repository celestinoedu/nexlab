# NexLab — Schema do banco de dados

> Espelha `supabase/migrations/0001_init.sql` a `0005_financeiro_ajustes.sql`. Se o schema mudar, atualize a migration nova + este arquivo no mesmo commit — nunca deixe este documento desatualizado em relação às migrations reais.

## Diagrama de relacionamento (visão simplificada)

```
auth.users ──1:1── profiles

entidades (Cliente | Parceiro)
   │
   ├──< tabela_precos >── servicos         (preço/comissão específico por entidade × serviço)
   │
   ├──< ordens_servico                     (cabeçalho da OS — cliente/parceiro, status, datas, status financeiro)
   │        │
   │        ├──< ordem_servico_itens >── servicos   (os serviços da OS: cor, arco, quantidade, valor)
   │        │
   │        ├──< notas_servico             (cupom emitido a partir de uma OS)
   │        │
   │        └──< contas_receber            (1 linha por OS entregue — criada automaticamente)
   │
   └──< fechamentos                        (snapshot mensal de Contas a Receber por entidade — Fase 4 original, sem UI própria ainda)

despesas                          (cadastro simples de saídas de caixa do laboratório)
fechamentos_financeiros           (snapshot do resultado do laboratório por mês: receitas pagas − despesas)
empresa_config (linha única — dados do GRS Lab para os PDFs)
```

Uma **Ordem de Serviço (OS)** pode ter vários serviços (itens). Cor e arco (superior/inferior) são atributos de cada item, não do catálogo de serviços — o catálogo guarda só o "serviço pai" (ex.: "Contenção Hawley").

## Enums

| Enum | Valores | Uso |
|---|---|---|
| `tipo_entidade` | `cliente`, `parceiro` | Diferencia cobrança direta (cliente) de comissão (parceiro) na mesma tabela `entidades`. |
| `status_os` | `recebido`, `em_producao`, `pronto_entrega`, `entregue`, `cancelado` | Colunas do Kanban (ver `docs/ux-flows.md`). Renomeado de `status_demanda` na migration `0002`. |
| `arco_dentario` | `superior`, `inferior` | Atributo opcional de cada item de OS. |
| `status_fechamento` | `aberto`, `fechado`, `pago` | Ciclo de vida de um fechamento mensal **por entidade** em `fechamentos` (Fase 4 original, sem UI própria ainda). |
| `role_usuario` | `admin`, `operador` | `admin` pode editar preços/comissões e excluir registros; `operador` só cria/edita o dia a dia (OS, cadastros). |
| `status_pagamento_os` | `pendente`, `pago` | Status financeiro editável no formulário da OS (migration `0003`). |
| `status_conta_receber` | `aberto`, `pago`, `cancelado` | Status de uma linha de `contas_receber`; `cancelado` é a "exclusão" (soft-delete com justificativa). |
| `status_fechamento_periodo` | `aberto`, `fechado` | Status de um fechamento **do laboratório inteiro** em `fechamentos_financeiros` (distinto de `status_fechamento`, que é por entidade). |

## Tabelas

### `profiles`
Perfil interno de cada usuário (não há cadastro público — usuários são criados via convite no painel Supabase Auth).

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | = `auth.users.id` |
| `nome` | text | |
| `role` | `role_usuario` | default `operador` |
| `ativo` | boolean | usuário desativado perde acesso mesmo com login válido (ver RLS) |
| `created_at` | timestamptz | |

### `empresa_config`
Singleton (`id` sempre `1`) com os dados do GRS Lab usados nos cabeçalhos de PDF.

`nome_fantasia`, `razao_social`, `documento`, `telefone`, `email`, `endereco`, `logo_url`, `prefixo_nota_servico` (default `'NS'`), `proximo_numero_nota` (default `1`), `updated_at`.

### `entidades`
Unifica **Clientes** (consultórios/dentistas — cobrança direta) e **Parceiros** (laboratórios maiores — pagam comissão). Diferenciados pela coluna `tipo`.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `tipo` | `tipo_entidade` | `cliente` ou `parceiro` |
| `nome` | text | |
| `documento`, `telefone`, `email`, `endereco`, `observacoes` | text | opcionais |
| `ativo` | boolean | default `true` |
| `created_at`, `updated_at` | timestamptz | |

Índices: `idx_entidades_tipo`, índice trigram em `nome` (busca rápida por nome parcial).

### `servicos`
Catálogo de tipos de serviço/prótese do laboratório — só o "serviço pai" (cor/arco são escolhidos por item da OS, não aqui).

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `nome` | text | ex.: "PIPS - Pistas Indiretas Planas Simples + Expansor" |
| `categoria` | text | opcional, ex.: "Contenção" |
| `preco_padrao` | numeric(10,2) | usado quando a entidade não tem preço específico em `tabela_precos` |
| `tempo_medio_dias` | int | opcional — dias médios estimados para conclusão, usado para sugerir a data de entrega prevista de uma OS (adicionado na migration `0002`) |
| `ativo` | boolean | |

Seed inicial em `supabase/seed.sql`, extraído dos relatórios reais dos parceiros (mantidos só localmente em `docs/assets/relatorios-exemplo/`, não versionados — ver `.gitignore`).

### `tabela_precos`
Preço (se `entidades.tipo = 'cliente'`) ou valor de comissão (se `tipo = 'parceiro'`) **específico por entidade × serviço** — decisão de negócio confirmada com o cliente (cada Parceiro/Cliente negocia seu próprio valor por serviço, não existe uma % genérica automática).

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `entidade_id` | uuid FK → `entidades` | |
| `servico_id` | uuid FK → `servicos` | |
| `preco` | numeric(10,2) | semântica depende de `entidades.tipo` |
| `updated_at` | timestamptz | |

`unique (entidade_id, servico_id)` — uma linha por combinação.

### `ordens_servico` (era `demandas` — renomeada na migration `0002`)
Núcleo do sistema: o **cabeçalho** de cada Ordem de Serviço, base do Kanban e da Lista. Os serviços da OS ficam em `ordem_servico_itens` (uma OS pode ter vários).

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `numero_os` | bigint, identity | numeração interna do GRS Lab — sugerida automaticamente mas editável na criação (ex.: para manter uma numeração legada); continua única |
| `entidade_id` | uuid FK → `entidades` | quem será cobrado/comissionado |
| `cliente_final` | text | nome do paciente/consultório final — **texto livre, não é FK** (informativo, como aparece nos relatórios reais dos parceiros) |
| `status` | `status_os` | default `recebido` — colunas do Kanban |
| `data_recebimento` | date | default hoje (era `data_entrada`) — editável no formulário |
| `data_prevista` | date | data de entrega prevista; sugerida a partir do `tempo_medio_dias` dos itens, editável |
| `data_entrega` | date | data de entrega real, preenchida quando o status vira `entregue` |
| `desconto` | numeric(10,2) | default 0, aplicado sobre o total da OS |
| `mes_referencia` | date, **gerada** | `date_trunc('month', coalesce(data_entrega, data_recebimento)::timestamp)::date` — fechamento sempre mês cheio (dia 1 ao último dia). O cast para `timestamp` é obrigatório (ver nota em `0001_init.sql`/`0002_ordens_servico.sql`). |
| `observacoes` | text | |
| `status_pagamento` | `status_pagamento_os` | default `pendente` — editada no popup "Informações financeiras" do formulário (migration `0003`); a "verdade" operacional de cobrança passa a ser a linha correspondente em `contas_receber` assim que a OS é entregue |
| `forma_pagamento` | text | opcional, livre (ex.: "Pix", "Boleto") |
| `data_pagamento` | date | preenchida no popup financeiro quando `status_pagamento = pago` (migration `0005`) — copiada pra `contas_receber.data_pagamento` na criação da linha, evita que uma OS já entregue paga fique sem data de recebimento (bug corrigido na `0005`) |
| `created_by` | uuid FK → `profiles` | |
| `created_at`, `updated_at` | timestamptz | |

Índices: `(entidade_id, mes_referencia)`, `status`, trigram em `cliente_final`.

### `ordem_servico_itens` (nova na migration `0002`)
Cada serviço dentro de uma OS — é aqui que moram quantidade, valor/comissão, cor e arco.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `ordem_id` | uuid FK → `ordens_servico` | `on delete cascade` |
| `servico_id` | uuid FK → `servicos` | |
| `cor` | text | opcional, variação livre (ex.: código de cor dental) — não afeta preço |
| `arco` | `arco_dentario` | opcional (`superior`/`inferior`) — não afeta preço |
| `quantidade` | int | default 1, `check (quantidade > 0)` |
| `valor_unitario` | numeric(10,2) | snapshot do preço no momento da criação (copiado de `tabela_precos`/`preco_padrao`), editável |
| `valor_comissao` | numeric(10,2) | preenchido só quando `entidades.tipo` da OS é `parceiro` |
| `created_at` | timestamptz | |

Índice: `ordem_id`.

### `fechamentos`
Snapshot de Contas a Receber **por entidade × mês** — **trava o valor** do período mesmo que uma OS seja editada depois de fechado. Existe desde a v0.1.0; a migration `0003` não mexe nele — não tem UI própria ainda (não confundir com `fechamentos_financeiros`, abaixo, que é o resultado do laboratório inteiro).

`entidade_id`, `mes_referencia`, `valor_total`, `status` (`status_fechamento`), `data_fechamento`, `data_pagamento`, `observacoes`. `unique (entidade_id, mes_referencia)`.

### `notas_servico`
"Nota de Serviço" estilo cupom, **sem valor fiscal**, emitida a partir de uma OS entregue.

`numero` (único, formato `prefixo + sequencial` a partir de `empresa_config`), `ordem_id` FK (era `demanda_id`), `entidade_id` FK, `valor_total`, `data_emissao`, `created_by`.

### `contas_receber` (nova na migration `0003`)
**Uma linha por OS entregue** — substitui a antiga `vw_contas_receber` (agregado por entidade×mês): virou tabela real porque precisa suportar marcar como paga e "excluir" (soft-delete com justificativa). A tela de Contas a Receber agrega por entidade/mês no cliente, mesmo padrão de filtro já usado em Ordens de Serviço.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `ordem_id` | uuid FK → `ordens_servico` | `unique` — uma linha por OS |
| `entidade_id`, `mes_referencia` | | denormalizados da OS no momento da criação, para filtrar sem join |
| `valor` | numeric(10,2) | snapshot calculado no momento da entrega (mesma fórmula que a antiga `vw_contas_receber` usava) |
| `status` | `status_conta_receber` | `aberto` → `pago` ou `cancelado` |
| `forma_pagamento` | text | opcional |
| `data_pagamento` | date | preenchida ao marcar como paga |
| `justificativa_cancelamento` | text | **obrigatória** quando `status = cancelado` (validada na aplicação) — "exclusão" nunca é silenciosa |
| `created_at`, `updated_at` | timestamptz | |

**Criada automaticamente**: trigger `trg_os_criar_conta_receber` (função `security definer`) dispara quando `ordens_servico.status` vira `entregue` e insere a linha (`on conflict (ordem_id) do nothing` — não duplica se a OS sair e voltar para "entregue"). O valor **não** é recalculado automaticamente se a OS for editada depois — mesma filosofia de "trava o valor" já usada em `fechamentos`.

### `despesas` (nova na migration `0003`)
Cadastro simples de saídas de caixa do laboratório.

`categoria` (text, livre — mesmo padrão de `servicos.categoria`), `descricao` (obrigatória), `valor`, `data_despesa` (default hoje), `observacoes`, `created_by`.

### `fechamentos_financeiros` (nova na migration `0003`)
Snapshot do **resultado do laboratório inteiro** por mês (não por entidade): `total_receitas` (soma de `contas_receber.valor` com `status = pago` no mês, por `data_pagamento`) menos `total_despesas` (soma de `despesas.valor` no mês, por `data_despesa`).

`mes_referencia` (`unique`), `total_receitas`, `total_despesas`, `resultado`, `status` (`status_fechamento_periodo`), `data_fechamento`, `observacoes`, `created_by`. Antes de "fechar o mês", a tela calcula os totais ao vivo; depois de fechado, mostra o snapshot travado.

## Views

### `vw_relatorio_fechamento_itens`
Uma linha por item de OS entregue, com todas as colunas necessárias para reproduzir o layout dos relatórios reais dos parceiros (Nº OS, datas, cliente final, serviço, cor, arco, quantidade, valores). Existe desde a migration `0002`; ainda não consumida por nenhuma tela (o extrato por entidade da v0.7.0 usa `useOrdensServico()` filtrado no cliente, não esta view) — mantida para uso futuro.

> `vw_contas_receber` (agregado por entidade×mês) foi **removida** na migration `0003` — `contas_receber` agora é tabela real.

## Row Level Security (RLS)

Cenário: um único laboratório, poucos usuários internos, sem acesso público/anônimo a dado de negócio.

- Duas funções `security definer`: `is_active_user()` (existe em `profiles`, `ativo = true`) e `is_admin_user()` (idem + `role = 'admin'`). Usadas em todas as policies — evita repetir a subquery e evita recursão de RLS (a função roda com privilégio do dono, ignorando RLS de `profiles` na sua própria checagem).
- **Leitura**: todo usuário ativo lê tudo (`entidades`, `servicos`, `ordens_servico`, `ordem_servico_itens`, `tabela_precos`, `fechamentos`, `notas_servico`, `contas_receber`, `despesas`, `fechamentos_financeiros`, `empresa_config`).
- **Criação/edição do dia a dia** (`entidades`, `servicos`, `ordens_servico`, `ordem_servico_itens`, `notas_servico`, `despesas`): qualquer usuário ativo.
- **Exclusão** (`entidades`, `servicos`, `ordens_servico`, `despesas`): só `admin`. Itens de OS (`ordem_servico_itens`) podem ser excluídos por qualquer usuário ativo (faz parte de editar a lista de serviços de uma OS).
- **Preços/comissões** (`tabela_precos`) e **configuração da empresa** (`empresa_config`): escrita só `admin` — evita que um operador altere um valor financeiro por engano.
- **Fechamentos** (`fechamentos` e `fechamentos_financeiros`): leitura para todo usuário ativo, escrita (fechar mês / marcar pago) só `admin`.
- **Contas a Receber** (`contas_receber`): leitura para ativo; qualquer usuário ativo pode marcar como pago/pendente, mas **só admin pode cancelar** (`with check` que só bloqueia especificamente `status = 'cancelado'` para não-admin) — a inserção normal acontece via trigger `security definer`, que ignora RLS.
- `profiles`: cada usuário vê/edita o próprio registro; `admin` vê e edita todos.
- Nenhuma policy libera acesso ao role `anon` — só usuários autenticados chegam aos dados.

## Convenções para novas migrations

- Nome: `NNNN_descricao_curta.sql`, sequencial (`0003_...`, `0004_...`).
- Nunca editar uma migration já aplicada em produção — sempre uma nova.
- Toda tabela nova de negócio: lembrar de `enable row level security` + policies (nunca deixar uma tabela sem RLS).
- Atualizar este arquivo no mesmo commit da migration.
