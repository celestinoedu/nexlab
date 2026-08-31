# Kit de boas-vindas e convites

O cadastro de usuários é feito em **Configurações → Usuários → Novo usuário**. A Edge Function `invite-user` valida que a pessoa logada é administradora, cria o acesso no Supabase Auth, vincula o perfil à mesma empresa e envia o convite. A `service_role` permanece somente no Supabase.

## Publicação inicial

1. Publique as funções no mesmo projeto usado pelo NexLab:
   ```bash
   npx supabase functions deploy invite-user --project-ref SEU_PROJECT_REF
   npx supabase functions deploy provision-client --no-verify-jwt --project-ref SEU_PROJECT_REF
   ```
   `provision-client` não recebe JWT de usuário porque é uma operação interna anterior à criação da conta; ela exige o header secreto próprio em todas as chamadas.
2. Cadastre a URL pública do aplicativo e gere um segredo longo e exclusivo para o provisionamento:
   ```bash
   npx supabase secrets set NEXLAB_APP_URL=https://nexlab.lotusnegocios.com NEXLAB_PROVISION_SECRET=UM_SEGREDO_ALEATORIO_LONGO --project-ref SEU_PROJECT_REF
   ```
   `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já são disponibilizados automaticamente às Edge Functions hospedadas.
3. Em **Authentication → URL Configuration**, use `https://nexlab.lotusnegocios.com` como Site URL e inclua `https://nexlab.lotusnegocios.com/` nas Redirect URLs.
4. Em **Authentication → Email Templates → Invite user**, use o assunto `Boas-vindas ao NexLab — seu acesso está pronto` e cole o conteúdo de [`supabase/templates/invite.html`](../supabase/templates/invite.html).
5. Em **Authentication → Emails → SMTP Settings**, habilite o SMTP da caixa oficial e configure o remetente como `contato@lotusnegocios.com` e o nome como `NexLab · Lotus Negócios`. O SMTP padrão do Supabase é apenas para testes e aparece como remetente Supabase; produção exige credenciais SMTP próprias.

O template contém hiperlinks, a identidade visual do NexLab, cinco passos iniciais e instruções específicas para instalar o PWA no Android e no iPhone.

## Primeiro acesso

O convite leva ao NexLab com uma sessão temporária. O metadado `must_change_password` bloqueia todas as telas internas até a pessoa criar uma senha própria em `/redefinir-senha`. Ao salvar, o bloqueio é removido. A mesma tela atende o fluxo “Esqueci minha senha”.

## Operação

- Convites seguintes são feitos inteiramente no NexLab; não é necessário copiar UUID nem cadastrar senha temporária.
- O kit é enviado exclusivamente pelo fluxo de **convite** e somente para um e-mail ainda inexistente no Supabase Auth. Recuperação de senha nunca é usada para simular boas-vindas.
- O primeiro administrador é provisionado internamente pela Lotus com a função `provision-client`, que cria o tenant, vincula o responsável como `admin` e envia o mesmo kit. Exemplo em PowerShell (substitua os valores e não salve o segredo no repositório):
  ```powershell
  $headers = @{ 'x-provision-secret' = 'SEU_SEGREDO' }
  $body = @{
    empresa = @{ nome_fantasia = 'Nome do laboratório'; documento = ''; telefone = ''; email = 'contato@laboratorio.com.br' }
    responsavel = @{ nome = 'Nome da responsável'; email = 'responsavel@laboratorio.com.br' }
  } | ConvertTo-Json -Depth 3
  Invoke-RestMethod -Method Post -Uri 'https://SEU_PROJECT_REF.supabase.co/functions/v1/provision-client' -Headers $headers -ContentType 'application/json' -Body $body
  ```
- Se um convite expirar, remova o usuário pendente no painel do Supabase e envie um novo convite pelo NexLab.
