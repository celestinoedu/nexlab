# NexLab — Schema do banco de dados

> Espelha `supabase/migrations/0001_init.sql` a `0010_multi_tenant.sql`. Se o schema mudar, atualize a migration nova + este arquivo no mesmo commit — nunca deixe este documento desatualizado em relação às migrations reais.

## Multi-tenant

Desde a migration `0010_multi_tenant.sql`, o NexLab atende vários clientes (labs) dentro do **mesmo** projeto Supabase — cada cliente é uma linha em `empresas` (tenant), e praticamente toda outra tabela de negócio carrega uma coluna `empresa_id` que isola os dados de um cliente dos demais. Decisão de arquitetura: um único projeto Supabase compartilhado, não um projeto por cliente — o plano Free do Supabase limita quantos projetos gratuitos ativos dá pra ter por organização, o que inviabilizaria escalar pra vários clientes sem virar pago (restrição #1 do `CLAUDE.md`). Quando uma assinatura é confirmada, a função interna `provision-client` cria a empresa e o primeiro administrador; o SQL manual do `SETUP.md` fica como contingência.

**Empresa Demonstração** (migration `0011_empresa_demo.sql`): um tenant a mais, igual a qualquer outro, só marcado com `empresas.is_demo = true` e populado com dado fictício (`supabase/seed_demo.sql`) — login `teste@teste.com`/`teste123`, ver `SETUP.md` § "Provisionar a empresa Demonstração". A RLS desse tenant não tem nenhuma exceção; o que muda é só no frontend: com `is_demo = true`, toda mutação (criar/editar/excluir OS, entidade, serviço, despesa, conta a receber, tabela de preços) é interceptada **antes** de chamar o Supabase e aplicada só no cache do TanStack Query — nunca grava no banco. Configurações (Usuários, Dados da empresa, Termos) fica bloqueada nessa conta (toast "indisponível na demonstração"), porque depende do painel Auth do Supabase (não dá pra simular criação de usuário só no navegador). Detalhes da implementação em `src/lib/demoMode.ts`.

## Diagrama de relacionamento (visão simplificada)

```
empresas (um cliente/tenant — dados usados nos cabeçalhos de PDF)
   │
   └──< profiles ──1:1── auth.users     (cada usuário pertence a uma única empresa)

entidades (Cliente | Parceiro) — de uma empresa
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

despesas                          (cadastro simples de saídas de caixa do laboratório, de uma empresa)
fechamentos_financeiros           (snapshot do resultado do laboratório por mês: receitas pagas − despesas, de uma empresa)
```

**Todas** as tabelas listadas acima (menos `empresas`) têm uma coluna `empresa_id` (uuid, not null, FK → `empresas`), omitida do diagrama por brevidade — ver § Multi-tenant.

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

> Desde a migration `0010` (e `insumos`, que já nasceu multi-tenant na migration `0012`), **todas** as tabelas de negócio abaixo (`entidades`, `servicos`, `tabela_precos`, `ordens_servico`, `ordem_servico_itens`, `notas_servico`, `fechamentos`, `contas_receber`, `despesas`, `fechamentos_financeiros`, `insumos`, além de `profiles`) têm uma coluna `empresa_id uuid not null references empresas (id)`, omitida das tabelas de coluna abaixo por brevidade (já documentada uma vez aqui). Ela nunca vem do payload do frontend — é preenchida automaticamente por trigger (`security definer`) na criação da linha, e travada contra alteração depois (`trg_fn_lock_empresa_id`). Duas origens possíveis: **do usuário que está inserindo** (`trg_fn_set_empresa_id`, via `current_empresa_id()`) nas tabelas sem linha-pai (`profiles`, `entidades`, `servicos`, `despesas`, `notas_servico`, `fechamentos`, `fechamentos_financeiros`, e a variante dedicada `ordens_servico`), ou **denormalizada da linha-mãe** (`trg_fn_empresa_id_from_ordem`/`trg_fn_empresa_id_from_entidade`) em `ordem_servico_itens`, `contas_receber` (a partir da OS) e `tabela_precos` (a partir da entidade) — mesmo padrão que o projeto já usa pra `entidade_id`/`mes_referencia` em `contas_receber`.

### `profiles`
Perfil interno de cada usuário (não há cadastro público — administradores enviam convites autenticados por `Configurações → Usuários`; ver `docs/kit-boas-vindas.md`). Cada usuário pertence a **uma única** empresa.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | = `auth.users.id` |
| `empresa_id` | uuid FK → `empresas` | migration `0010` — imutável após criado (`trg_fn_lock_empresa_id`), define de qual cliente é o usuário |
| `nome` | text | |
| `role` | `role_usuario` | default `operador` |
| `ativo` | boolean | usuário desativado perde acesso mesmo com login válido (ver RLS) |
| `created_at` | timestamptz | |

### `empresas` (era `empresa_config`, singleton — virou multi-linha na migration `0010`)
Um cliente (tenant) do NexLab — dados usados nos cabeçalhos de PDF, editável na tela "Informações do negócio" (`EmpresaConfigDialog`, atalho no Topbar, escrita só `admin` **da própria empresa**). É a raiz do isolamento multi-tenant (ver § Multi-tenant): toda outra tabela de negócio tem `empresa_id` apontando pra uma linha aqui.

`nome_fantasia`, `razao_social`, `documento`, `telefone`, `email`, `endereco`, `logo_url`, `prefixo_nota_servico` (default `'NS'`), `proximo_numero_nota` (default `1`), `updated_at`. Migration `0008`: `mostrar_endereco`, `mostrar_telefone`, `mostrar_email`, `mostrar_logo` (boolean, default `true` cada) — controlam se o campo aparece no cabeçalho dos PDFs (`nome_fantasia` sempre aparece, sem toggle). `logo_url` aponta pro bucket público de Storage `logos`, num caminho prefixado por empresa (`${empresaId}/logo-*`) — leitura pública, escrita só `admin` da empresa dona do arquivo. Migration `0010`: `proximo_numero_os` (bigint, default `1` — contador do próximo número de OS **por empresa**, ver `ordens_servico.numero_os`) e `status_assinatura` (`text`, default `'ativa'`, informativo — situação junto à Lotus, sem automação de cobrança). Migration `0011`: `is_demo` (boolean, default `false`) — marca o tenant fictício de demonstração (ver § Multi-tenant acima); o frontend usa essa flag pra bloquear escrita real no banco.

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
| `preco` | numeric(10,2) | semântica depende de `entidades.tipo`: preço (Cliente) ou comissão que o GRS Lab recebe (Parceiro) — o único valor usado em cálculos (OS, Contas a Receber, Fechamento) |
| `preco_parceiro` | numeric(10,2) | migration `0006` — só Parceiro: preço do serviço na tabela do próprio parceiro. **Só referência**, pra conferir se a comissão negociada está correta (o pagamento da comissão é baseado na tabela de preço do Parceiro, não na do GRS Lab) — não entra em nenhum cálculo |
| `updated_at` | timestamptz | |

`unique (entidade_id, servico_id)` — uma linha por combinação.

**Cópia automática pra Cliente novo**: trigger `trg_copiar_precos_cliente` (função `trg_fn_copiar_precos_cliente`, `security definer`, migration `0009`) dispara em `after insert on entidades` e, só quando `new.tipo = 'cliente'`, copia `servicos.preco_padrao` (só ativos) pra cada linha de `tabela_precos` daquele cliente — nasce igual ao catálogo, editável depois. `security definer` porque criar Entidade é liberado a qualquer usuário ativo, mas escrever em `tabela_precos` é só `admin`. Parceiro **não** tem cópia automática — a tabela dele nasce vazia, pra preenchimento manual (preço do parceiro + comissão).

### `ordens_servico` (era `demandas` — renomeada na migration `0002`)
Núcleo do sistema: o **cabeçalho** de cada Ordem de Serviço, base do Kanban e da Lista. Os serviços da OS ficam em `ordem_servico_itens` (uma OS pode ter vários).

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `numero_os` | bigint | **Nº Registro** interno por empresa (migration `0010`: deixou de ser `identity`/sequência global; migration `0015`: passou a ser sempre gerado pelo contador `empresas.proximo_numero_os` e imutável). Os valores históricos foram preservados; único por empresa (`unique (empresa_id, numero_os)`) |
| `numero_os_cliente` | text | **Nº OS** opcional informado pelo laboratório cliente, independente do Nº Registro. A migration `0015` recupera os valores históricos anotados no formato `os; número` |
| `entidade_id` | uuid FK → `entidades` | quem será cobrado/comissionado |
| `cliente_final` | text | nome do consultório/cliente final — **texto livre, não é FK** (informativo, como aparece nos relatórios reais dos parceiros) |
| `nome_paciente` | text | nome do paciente, separado do `cliente_final` (migration `0007`) — texto livre, não é FK |
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

### `insumos` (nova na migration `0012`)
Cadastro simples de Estoque do laboratório — sem controle de movimentação (entrada/saída), só a foto atual.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `nome` | text | |
| `categoria` | text | opcional, livre — mesmo padrão de `servicos.categoria` |
| `quantidade` | numeric(10,2) | default 0 |
| `unidade` | text | opcional, livre (ex.: "un", "kg", "litro") |
| `valor_unitario` | numeric(10,2) | default 0 |
| `local_estoque` | text | opcional — onde o item fica guardado |
| `sinalizar_compra` | boolean | default `false` — marcação **manual** (sem limite mínimo automático); conta pro ícone de Alertas no Topbar |
| `observacoes`, `created_by`, `created_at`, `updated_at` | | |

RLS: leitura/criação/edição para qualquer usuário ativo da empresa, exclusão só `admin` — mesmo padrão de `despesas`.

### `instagram_publicacoes` (nova na migration `0013`)

Fila operacional da marca NexLab, sem vínculo com um laboratório/tenant. Armazena legenda, texto alternativo, uma ou mais URLs públicas de mídia, agendamento, estado da publicação, tentativas e IDs devolvidos pela Meta.

Estados: `draft` → `scheduled` → `publishing` → `published`; após três erros, `failed`. A função `claim_due_instagram_posts()` reserva itens vencidos com `for update skip locked`, evitando duas execuções simultâneas para o mesmo post, e recupera reservas interrompidas há mais de 30 minutos.

RLS fica habilitada e não existe policy para `anon` ou `authenticated`. Somente a `service_role` da Edge Function pode ler ou alterar esta tabela. O token do Instagram nunca é gravado no banco.

### `fechamentos_financeiros` (nova na migration `0003`)
Snapshot do **resultado do laboratório inteiro** por mês (não por entidade): `total_receitas` (soma de `contas_receber.valor` com `status = pago` no mês, por `data_pagamento`) menos `total_despesas` (soma de `despesas.valor` no mês, por `data_despesa`).

`mes_referencia` (`unique`), `total_receitas`, `total_despesas`, `resultado`, `status` (`status_fechamento_periodo`), `data_fechamento`, `observacoes`, `created_by`. Antes de "fechar o mês", a tela calcula os totais ao vivo; depois de fechado, mostra o snapshot travado.

## Views

### `vw_relatorio_fechamento_itens`
Uma linha por item de OS entregue, com todas as colunas necessárias para reproduzir o layout dos relatórios reais dos parceiros (Nº OS, datas, cliente final, serviço, cor, arco, quantidade, valores). Existe desde a migration `0002`; ainda não consumida por nenhuma tela (o extrato por entidade da v0.7.0 usa `useOrdensServico()` filtrado no cliente, não esta view) — mantida para uso futuro.

> `vw_contas_receber` (agregado por entidade×mês) foi **removida** na migration `0003` — `contas_receber` agora é tabela real.

## Row Level Security (RLS)

Cenário desde a migration `0010`: **vários** laboratórios (tenants) no mesmo banco, cada um com poucos usuários internos, sem acesso público/anônimo a dado de negócio, e **sem acesso de um tenant ao dado de outro em nenhuma hipótese**.

- Três funções `security definer`: `is_active_user()` (existe em `profiles`, `ativo = true`), `is_admin_user()` (idem + `role = 'admin'`) e `current_empresa_id()` (devolve o `empresa_id` de `profiles` do usuário logado). Usadas em todas as policies — evita repetir a subquery e evita recursão de RLS (a função roda com privilégio do dono, ignorando RLS de `profiles` na sua própria checagem).
- **Toda policy de toda tabela de negócio** (além da checagem de papel que já existia) agora também exige `empresa_id = current_empresa_id()` — um usuário nunca enxerga nem altera linha de outra empresa, mesmo sendo `admin`.
- **Leitura**: todo usuário ativo lê tudo da própria empresa (`entidades`, `servicos`, `ordens_servico`, `ordem_servico_itens`, `tabela_precos`, `fechamentos`, `notas_servico`, `contas_receber`, `despesas`, `insumos`, `fechamentos_financeiros`, `empresas`).
- **Criação/edição do dia a dia** (`entidades`, `servicos`, `ordens_servico`, `ordem_servico_itens`, `notas_servico`, `despesas`, `insumos`): qualquer usuário ativo, sempre dentro da própria empresa — `empresa_id` nunca vem do payload do cliente, é preenchido por trigger (ver § Multi-tenant) e travado contra alteração depois.
- **Exclusão** (`entidades`, `servicos`, `ordens_servico`, `despesas`, `insumos`): só `admin` da própria empresa. Itens de OS (`ordem_servico_itens`) podem ser excluídos por qualquer usuário ativo (faz parte de editar a lista de serviços de uma OS).
- **Preços/comissões** (`tabela_precos`) e **configuração da empresa** (`empresas`): escrita só `admin` da própria empresa — evita que um operador altere um valor financeiro por engano, e que um admin edite a empresa de outro cliente. `empresas` não tem policy de insert/delete pra usuário comum — provisionar uma empresa nova é manual (ver `SETUP.md`).
- **Fechamentos** (`fechamentos` e `fechamentos_financeiros`): leitura para todo usuário ativo da empresa, escrita (fechar mês / marcar pago) só `admin` da empresa.
- **Contas a Receber** (`contas_receber`): leitura para ativo da empresa; qualquer usuário ativo pode marcar como pago/pendente, mas **só admin pode cancelar** (`with check` que só bloqueia especificamente `status = 'cancelado'` para não-admin) — a inserção normal acontece via trigger `security definer`, que ignora RLS mas ainda assim deriva `empresa_id` da OS de origem.
- `profiles`: cada usuário vê/edita o próprio registro; `admin` vê e edita todos os perfis **da mesma empresa** (não mais "todos" globalmente — `is_admin_user()` sozinho passou a ser insuficiente, ver `0010_multi_tenant.sql`).
- **Storage `logos`**: leitura pública (não é dado sensível), escrita (`insert`/`update`/`delete`) só `admin`, restrita ao caminho `${empresaId}/...` da própria empresa (`storage.foldername(name)`).
- Nenhuma policy libera acesso ao role `anon` a dado de negócio — só usuários autenticados chegam aos dados, e só aos da própria empresa.
- `instagram_publicacoes` é uma fila interna da marca, fora do escopo dos tenants: não tem policy para usuários do aplicativo e só é acessada pela `service_role` da automação.

## Convenções para novas migrations

- Nome: `NNNN_descricao_curta.sql`, sequencial (`0003_...`, `0004_...`).
- Nunca editar uma migration já aplicada em produção — sempre uma nova.
- Toda tabela nova de negócio: lembrar de `enable row level security` + policies (nunca deixar uma tabela sem RLS).
- Atualizar este arquivo no mesmo commit da migration.
