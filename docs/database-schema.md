# NexLab — Schema do banco de dados

> Espelha `supabase/migrations/0001_init.sql`. Se o schema mudar, atualize os dois — nunca deixe este documento desatualizado em relação à migration real.

## Diagrama de relacionamento (visão simplificada)

```
auth.users ──1:1── profiles

entidades (Cliente | Parceiro)
   │
   ├──< tabela_precos >── servicos     (preço/comissão específico por entidade × serviço)
   │
   ├──< demandas >── servicos           (ordens de serviço; cada uma referencia 1 serviço)
   │        │
   │        └──< notas_servico          (cupom emitido a partir de uma demanda)
   │
   └──< fechamentos                     (snapshot mensal de Contas a Receber)

empresa_config (linha única — dados do GRS Lab para os PDFs)
```

## Enums

| Enum | Valores | Uso |
|---|---|---|
| `tipo_entidade` | `cliente`, `parceiro` | Diferencia cobrança direta (cliente) de comissão (parceiro) na mesma tabela `entidades`. |
| `status_demanda` | `recebido`, `em_producao`, `pronto_entrega`, `entregue`, `cancelado` | Colunas do Kanban (ver `docs/ux-flows.md`). |
| `status_fechamento` | `aberto`, `fechado`, `pago` | Ciclo de vida de um fechamento mensal em Contas a Receber. |
| `role_usuario` | `admin`, `operador` | `admin` pode editar preços/comissões e excluir registros; `operador` só cria/edita o dia a dia (demandas, cadastros). |

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
Catálogo de tipos de serviço/prótese do laboratório.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `nome` | text | ex.: "PIPS - Pistas Indiretas Planas Simples + Expansor" |
| `categoria` | text | opcional, ex.: "Contenção" |
| `preco_padrao` | numeric(10,2) | usado quando a entidade não tem preço específico em `tabela_precos` |
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

### `demandas`
Núcleo do sistema: as ordens de serviço, base do Kanban e da Lista.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `numero_os` | bigint, identity | numeração interna sequencial do GRS Lab (não confundir com nº de OS do parceiro, que fica em `observacoes` se relevante) |
| `entidade_id` | uuid FK → `entidades` | quem será cobrado/comissionado |
| `servico_id` | uuid FK → `servicos` | |
| `cliente_final` | text | nome do paciente/consultório final — **texto livre, não é FK** (é só informativo, como aparece nos relatórios reais dos parceiros) |
| `quantidade` | int | default 1, `check (quantidade > 0)` |
| `status` | `status_demanda` | default `recebido` — colunas do Kanban |
| `data_entrada` | date | default hoje |
| `data_prevista` | date | usada para alerta de atraso no Kanban |
| `data_entrega` | date | preenchida quando o status vira `entregue` |
| `valor_servico` | numeric(10,2) | snapshot do preço no momento da criação (copiado de `tabela_precos`/`preco_padrao`), editável manualmente |
| `valor_comissao` | numeric(10,2) | preenchido só quando `entidades.tipo = 'parceiro'` |
| `desconto` | numeric(10,2) | default 0 — existe nos relatórios reais (coluna "Desc") |
| `mes_referencia` | date, **gerada** | `date_trunc('month', coalesce(data_entrega, data_entrada)::timestamp)::date` — fechamento sempre mês cheio (dia 1 ao último dia). O cast para `timestamp` é obrigatório: sem ele o Postgres resolve para a variante `timestamptz` de `date_trunc` (STABLE) e rejeita a coluna gerada com o erro `42P17`. |
| `observacoes` | text | |
| `created_by` | uuid FK → `profiles` | |
| `created_at`, `updated_at` | timestamptz | |

Índices: `(entidade_id, mes_referencia)`, `status`, trigram em `cliente_final`.

### `fechamentos`
Snapshot de Contas a Receber por entidade × mês — **trava o valor** do período mesmo que uma demanda seja editada depois de fechado.

`entidade_id`, `mes_referencia`, `valor_total`, `status` (`status_fechamento`), `data_fechamento`, `data_pagamento`, `observacoes`. `unique (entidade_id, mes_referencia)`.

### `notas_servico`
"Nota de Serviço" estilo cupom, **sem valor fiscal**, emitida a partir de uma demanda entregue.

`numero` (único, formato `prefixo + sequencial` a partir de `empresa_config`), `demanda_id` FK, `entidade_id` FK, `valor_total`, `data_emissao`, `created_by`.

## Views

### `vw_contas_receber`
Uma linha por `entidade_id × mes_referencia`, somando `valor_comissao` (parceiro) ou `valor_servico - desconto` (cliente) das demandas com `status = 'entregue'`. Junta com `fechamentos` para mostrar o status de pagamento. **Base da tela de Contas a Receber.**

### `vw_relatorio_fechamento_itens`
Uma linha por demanda entregue, com todas as colunas necessárias para reproduzir o layout dos relatórios reais dos parceiros (Nº OS, datas, cliente final, serviço, quantidade, valores). **Base do PDF de Relatório de Fechamento.**

## Row Level Security (RLS)

Cenário: um único laboratório, poucos usuários internos, sem acesso público/anônimo a dado de negócio.

- Duas funções `security definer`: `is_active_user()` (existe em `profiles`, `ativo = true`) e `is_admin_user()` (idem + `role = 'admin'`). Usadas em todas as policies — evita repetir a subquery e evita recursão de RLS (a função roda com privilégio do dono, ignorando RLS de `profiles` na sua própria checagem).
- **Leitura**: todo usuário ativo lê tudo (`entidades`, `servicos`, `demandas`, `tabela_precos`, `fechamentos`, `notas_servico`, `empresa_config`).
- **Criação/edição do dia a dia** (`entidades`, `servicos`, `demandas`, `notas_servico`): qualquer usuário ativo.
- **Exclusão** (`entidades`, `servicos`, `demandas`): só `admin`.
- **Preços/comissões** (`tabela_precos`) e **configuração da empresa** (`empresa_config`): escrita só `admin` — evita que um operador altere um valor financeiro por engano.
- **Fechamentos**: leitura para todo usuário ativo, escrita (fechar mês / marcar pago) só `admin`.
- `profiles`: cada usuário vê/edita o próprio registro; `admin` vê e edita todos.
- Nenhuma policy libera acesso ao role `anon` — só usuários autenticados chegam aos dados.

## Convenções para novas migrations

- Nome: `NNNN_descricao_curta.sql`, sequencial (`0002_...`, `0003_...`).
- Nunca editar uma migration já aplicada em produção — sempre uma nova.
- Toda tabela nova de negócio: lembrar de `enable row level security` + policies (nunca deixar uma tabela sem RLS).
- Atualizar este arquivo no mesmo commit da migration.
