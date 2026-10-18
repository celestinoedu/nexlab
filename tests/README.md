# Testes automatizados do NexLab

Duas suítes, ambas **locais**: nenhuma grava dados reais.

## E2E — telas (Playwright)

Usa a conta de demonstração (`teste@teste.com` / `teste123`). A empresa demo mantém toda alteração só no cache do navegador, então a suíte pode criar, editar e salvar à vontade.

```bash
npm run dev -- --port 5199        # terminal 1
npm run test:e2e                  # terminal 2 — todos os blocos
npm run test:e2e -- precos        # um bloco só
BASE=http://localhost:4173/ npm run test:e2e   # contra o build (npm run build && npm run preview)
```

Precisa do Google Chrome instalado (a suíte usa `channel: 'chrome'`).

| Bloco | O que cobre |
|---|---|
| `teclado` | Tab/Shift+Tab, digitação nas listas pesquisáveis, Esc, "Adicionar serviço" (duplo clique, Enter segurado), Enter não salva a OS, ordem do Tab numa linha |
| `precos` | Preço do parceiro e comissão da tabela, valor manual preservado, troca Cliente/Parceiro, serviço antes da entidade, linha em branco ao salvar, erro sem serviço |
| `salvamentoSeguido` | Várias Novas OS seguidas sem linhas fantasmas nem erro ao salvar |
| `edicao` | Abrir OS existentes não reprecifica; salvar sem alterações; Nova OS limpa depois de editar |
| `outrasTelas` | Listas pesquisáveis de Contas a Receber e Relatórios |
| `despesas` | Controle por mês, Fixa/Variável, Pago/Pendente, "Pagar", lançar fixas do mês anterior, Fechamento com mês vazio |
| `celular` | Seleção de serviço por toque (Pixel 7) |

Toda verificação também falha se houver erro de JavaScript na página.

## Banco — RLS, triggers e regras (Postgres local)

Aplica `supabase_shim.sql` (simula `anon`/`authenticated`, `auth.uid()`, `auth.users` e `storage`) e **todas** as migrations num banco limpo, depois roda `testes_banco.sql`: isolamento entre laboratórios, anon, usuário sem perfil, operador, admin, inativo, inadimplente, RPC expostas, unicidade por empresa, sincronização de Contas a Receber e despesas.

Uma vez, criar um cluster descartável (exemplo no Windows com PostgreSQL 18):

```bash
"C:/Program Files/PostgreSQL/18/bin/initdb.exe" -D <pasta-temporaria>/pgdata -U postgres -A trust -E UTF8 --locale=C
"C:/Program Files/PostgreSQL/18/bin/pg_ctl.exe" -D <pasta-temporaria>/pgdata -o "-p 54329" -l <pasta-temporaria>/pg.log start
```

Depois:

```bash
npm run test:db                 # migrations + testes
npm run test:db -- --carga      # + medição com 30 mil OS (desempenho da RLS)
```

Variáveis opcionais: `PSQL` (caminho do psql), `PGHOST`, `PGPORT` (padrão 54329), `PGUSER` (padrão postgres).

**Nunca** aponte essas variáveis para o banco do Supabase: o script apaga e recria o banco `nexlab_test`.
