# NexLab — Passo a passo de configuração (contas e deploy)

Este é o único trecho do projeto que **precisa ser feito manualmente por você** — envolve criar contas e clicar em botões que nenhuma IA/CLI consegue fazer por conta própria (login, aceite de termos, etc.). Depois de concluído uma vez, o dia a dia é só `git push` — o deploy é automático.

Repositório: **https://github.com/celestinoedu/nexlab**

## 1. Criar o projeto Supabase (gratuito)

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita (pode entrar com sua conta do GitHub).
2. Clique em **New Project**. Escolha um nome (ex.: `nexlab`), uma senha forte para o banco (guarde em local seguro, você não vai precisar dela no dia a dia) e a região mais próxima do Brasil (ex.: `South America (São Paulo)`).
3. Escolha o **plano Free** (é o padrão) — o projeto inteiro foi desenhado para caber nesse plano, sem custo algum.
4. Aguarde ~2 minutos até o projeto ficar pronto.

> ⚠️ **Importante sobre o plano Free**: se o sistema ficar cerca de 1 semana sem nenhum acesso, o Supabase **pausa** o projeto automaticamente. O primeiro acesso depois disso pode demorar um pouco mais (o banco "acorda"), ou pode aparecer um aviso no painel do Supabase pedindo para reativar manualmente com um clique. Não é um defeito do NexLab.

## 2. Pegar a URL e a chave do projeto

No painel do Supabase, vá em **Project Settings → API**. Copie dois valores:
- **Project URL** (ex.: `https://xxxxxxxxxxxx.supabase.co`)
- **anon public key** (uma chave longa)

## 3. Rodar o schema do banco

No painel do Supabase, vá em **SQL Editor → New query**:

1. Abra o arquivo [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) deste repositório, copie todo o conteúdo, cole no SQL Editor e clique em **Run**.
2. Repita o mesmo processo com [`supabase/seed.sql`](./supabase/seed.sql) (cadastra o catálogo inicial de serviços).

Se aparecer algum erro, confira se colou o arquivo inteiro (algumas instruções dependem de outras rodarem antes).

## 4. Criar seu usuário de login

Ainda não existe tela de "criar conta" no NexLab (por segurança — só quem já tem acesso ao painel Supabase cria novos usuários):

1. No painel Supabase, vá em **Authentication → Users → Add user → Create new user**.
2. Preencha seu e-mail e uma senha. Marque a opção de já confirmar o e-mail automaticamente (**Auto Confirm User**), para não depender de configurar envio de e-mail agora.
3. Copie o **UUID** do usuário criado (aparece na lista de usuários).
4. Volte no **SQL Editor** e rode (trocando os valores):
   ```sql
   insert into profiles (id, nome, role)
   values ('COLE-O-UUID-AQUI', 'Seu nome', 'admin');
   ```
   Use `'admin'` para o primeiro usuário (dono do laboratório) — ele poderá editar preços/comissões depois. Para outros usuários do dia a dia, use `'operador'`.

Pronto — esse e-mail/senha já funcionam para logar no NexLab.

> Isso configura a **primeira empresa** (tenant) do sistema. Desde a migration `0010_multi_tenant.sql`, o NexLab atende vários clientes dentro do **mesmo** projeto Supabase — para o próximo cliente que assinar pela Lotus, não repita os passos 1-4 (não crie um projeto novo), use o passo abaixo.

## Provisionar uma empresa (cliente) nova

Sempre que uma assinatura for confirmada na landing page da Lotus, o NexLab **não** ganha um projeto Supabase novo — o cliente novo vira só mais uma linha em `empresas` dentro do mesmo projeto (isolada das demais por RLS, ver `docs/database-schema.md` § Multi-tenant). Passo a passo manual, via **SQL Editor** do painel Supabase:

1. Criar a empresa:
   ```sql
   insert into empresas (nome_fantasia, documento, telefone, email)
   values ('Nome do laboratório', '00.000.000/0001-00', '(00) 00000-0000', 'contato@exemplo.com')
   returning id;
   ```
   Guarde o `id` (uuid) retornado.
2. Criar o primeiro usuário desse cliente: **Authentication → Users → Add user → Create new user** (mesmo processo do passo 4 acima). Copie o UUID gerado.
3. Vincular esse usuário à empresa criada no passo 1, como `admin`:
   ```sql
   insert into profiles (id, nome, role, empresa_id)
   values ('COLE-O-UUID-DO-USUARIO', 'Nome do responsável', 'admin', 'COLE-O-ID-DA-EMPRESA-DO-PASSO-1');
   ```

Só o **primeiro** usuário de cada empresa precisa desse passo manual — os próximos usuários daquele mesmo cliente podem ser criados normalmente pela tela **Configurações → Usuários** do próprio NexLab (o admin logado já vincula ao `empresa_id` certo automaticamente).

## 5. Configurar as variáveis de ambiente

### Para rodar localmente
```bash
cp .env.example .env.local
```
Abra `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores do passo 2.

### Para o deploy automático (GitHub Actions)
No repositório GitHub, vá em **Settings → Secrets and variables → Actions → New repository secret** e cadastre dois secrets:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

(mesmos valores do passo 2 — são "públicos por design", mas usamos secrets para não deixar hardcoded no código de qualquer forma).

## 6. Habilitar o GitHub Pages

No repositório, vá em **Settings → Pages** e em "Build and deployment → Source" escolha **GitHub Actions** (não "Deploy from a branch"). O workflow `.github/workflows/deploy.yml` cuida do resto a partir do próximo push em `main`.

## 7. Publicar

```bash
git push origin main
```
Acompanhe o progresso na aba **Actions** do repositório. Quando o workflow terminar, o link do site aparece em **Settings → Pages** (formato `https://celestinoedu.github.io/nexlab/`).

## Regenerar os tipos TypeScript do banco (opcional, avançado)

Sempre que o schema mudar, é possível gerar tipos TypeScript reais (em vez do stub em `src/types/supabase.ts`) instalando a Supabase CLI e rodando:
```bash
npx supabase gen types typescript --project-id SEU_PROJECT_ID > src/types/supabase.ts
```
Não é obrigatório para o sistema funcionar — só melhora o autocomplete/checagem de tipos durante o desenvolvimento.
