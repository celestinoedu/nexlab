# Automação do Instagram da NexLab

## Arquitetura

`instagram_publicacoes` mantém a fila e o histórico. O Supabase Cron chama a Edge Function `publish-instagram` a cada cinco minutos. A função reserva posts vencidos com trava transacional, cria os contêineres na API oficial do Instagram e publica imagens ou carrosséis.

Nenhum token vai para a landing page, GitHub ou tabela. As credenciais ficam em **Edge Function Secrets**.

As ações administrativas `validate` e `sync_manifest` usam a mesma proteção do
Cron. A primeira confirma a identidade do perfil sem expor o token; a segunda
importa o manifesto público da campanha e mantém os novos itens como `draft`.

## Pré-requisitos na Meta

- Conta profissional do Instagram (Business ou Creator).
- Aplicativo configurado no Meta for Developers.
- Instagram API with Instagram Login com as permissões `instagram_business_basic` e `instagram_business_content_publish`, ou o fluxo equivalente vigente na conta.
- Token válido com permissão de publicação e o ID da conta profissional.
- URLs HTTPS públicas para todos os JPEGs.

As permissões e versões da Graph API mudam. Antes da ativação, confirmar os nomes mostrados no painel da Meta e definir explicitamente a versão suportada pelo aplicativo.

## Ativação

1. Aplicar `supabase/migrations/0013_instagram_automation.sql`.
2. Publicar a landing e confirmar que um arquivo em `/nexlab/social/generated/` abre sem login.
3. Gerar a seed executando `node nexlab/social/generate-social-assets.mjs` no repositório da landing e aplicar o arquivo `generated/instagram-seed.sql` no SQL Editor.
4. Definir os secrets:

```powershell
supabase secrets set INSTAGRAM_USER_ID="..." INSTAGRAM_ACCESS_TOKEN="..." INSTAGRAM_CRON_SECRET="..." META_GRAPH_API_VERSION="vXX.X"
```

5. Publicar a função:

```powershell
supabase functions deploy publish-instagram --no-verify-jwt
```

6. No Supabase Dashboard, abrir **Integrations → Cron → Create job**:
   - nome: `publish-instagram-every-5-minutes`
   - agenda: `*/5 * * * *`
   - tipo: HTTP / Edge Function
   - método: `POST`
   - URL: `https://PROJECT_REF.supabase.co/functions/v1/publish-instagram`
   - header: `x-cron-secret: <mesmo valor de INSTAGRAM_CRON_SECRET>`
   - body: `{}`

7. Para o primeiro teste, deixar apenas uma linha como `scheduled`, agendada para alguns minutos à frente. Confirmar o post, o permalink salvo e os logs antes de liberar as demais.

## Operação e falhas

- `draft`: conteúdo ainda não autorizado.
- `scheduled`: pronto para entrar na fila.
- `publishing`: reservado por uma execução.
- `published`: publicado e registrado.
- `failed`: falhou três vezes e exige revisão.

Falhas transitórias são reagendadas para 15 minutos depois, até três tentativas. Itens presos em `publishing` por mais de 30 minutos voltam à fila. Se um contêiner já tiver sido criado, a função tenta retomá-lo em vez de criar outra publicação.

## Segurança operacional

- Nunca colar token ou `service_role` em migration, seed, `.env` versionado ou HTML.
- Revogar e substituir o token imediatamente se ele aparecer em log, print ou commit.
- Manter a conta protegida por autenticação em dois fatores.
- Revisar legenda, ordem dos slides e links antes de mudar o status de `draft` para `scheduled`.
- Pausar o Cron antes de fazer alterações em lote na fila.
