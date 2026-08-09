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

## 4. Criar seus usuários de login

O NexLab usa **login por código de 6 dígitos enviado por e-mail — sem senha** (mais simples para quem nunca usou um sistema). Não existe tela de "criar conta" (por segurança — só quem já tem acesso ao painel Supabase cria novos usuários):

1. No painel Supabase, vá em **Authentication → Users → Add user → Create new user**.
2. Preencha o e-mail da pessoa. **Não precisa de senha** — marque **Auto Confirm User** para o e-mail já entrar confirmado.
3. Copie o **UUID** do usuário criado (aparece na lista de usuários).
4. Volte no **SQL Editor** e rode (trocando os valores):
   ```sql
   insert into profiles (id, nome, role)
   values ('COLE-O-UUID-AQUI', 'Nome da pessoa', 'admin');
   ```
   Use `'admin'` para quem pode editar preços/comissões e fechar o financeiro (ex.: dono/gestor do laboratório). Para o uso do dia a dia (demandas, cadastros), use `'operador'`.

Repita para cada pessoa que vai usar o sistema. Pronto — esses e-mails já conseguem pedir o código de acesso no NexLab.

## 4.1 Configurar o e-mail do código de acesso (obrigatório)

Por padrão, o Supabase manda um **link clicável**, não um código de 6 dígitos. Para o NexLab funcionar como projetado, ajuste o template do e-mail:

1. No painel Supabase, vá em **Authentication → Email Templates → Magic Link**.
2. No corpo do e-mail, troque a parte que usa `{{ .ConfirmationURL }}` para mostrar `{{ .Token }}` em destaque (é o código de 6 dígitos). Exemplo simples de corpo:
   ```html
   <h2>Seu código de acesso ao NexLab</h2>
   <p>Use o código abaixo para entrar (válido por alguns minutos):</p>
   <h1 style="letter-spacing: 4px;">{{ .Token }}</h1>
   ```
3. Salve.

> ⚠️ **Limite de envio no plano Free**: o e-mail padrão do Supabase manda só **2 a 4 e-mails por hora** por projeto — dá para testar e usar com 1-2 pessoas no começo, mas fica curto se o laboratório inteiro for logar todo dia (cada login pede um código novo por e-mail). Quando isso acontecer, configure um SMTP próprio (ainda gratuito) em **Authentication → Settings → SMTP Settings** usando o [Resend](https://resend.com) (3.000 e-mails/mês grátis) — requer verificar um domínio próprio do GRS Lab. Não é urgente para começar a usar o sistema, mas vale planejar antes do uso em produção com toda a equipe.

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
