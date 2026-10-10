# Mercado Pago — mensalidade do NexLab

O cliente paga a mensalidade pelo Mercado Pago, na conta PJ da **Lotus Negócios LTDA**. A baixa no NexLab é automática: o webhook confirma o pagamento e o vencimento avança sozinho, como no botão "Registrar pagamento" do painel.

## Como funciona

| Forma | O que o cliente faz | Quando dá baixa |
|---|---|---|
| **Pagar agora** (Checkout Pro) | Em Meu Perfil, clica em "Pagar" e escolhe Pix, cartão ou boleto. Se houver várias mensalidades atrasadas, paga todas de uma vez. | Assim que o Mercado Pago aprova. Pix e cartão em segundos; boleto em até 3 dias úteis. |
| **Débito automático** (assinatura) | O administrador do laboratório clica em "Ativar débito automático" e cadastra o cartão uma vez. | A cada cobrança mensal aprovada no cartão. |

Peças envolvidas:

- `supabase/functions/mercadopago-pagamento`: chamada pelo app com o usuário logado. Gera o link de pagamento e ativa ou cancela o débito automático.
- `supabase/functions/mercadopago-webhook`: recebe as notificações do Mercado Pago, valida a assinatura secreta, **reconsulta o pagamento na API** e dá baixa via `registrar_pagamento_mercadopago` (migration `0026`). Cada pagamento é processado uma única vez (tabela `pagamentos_mercadopago`). Pagamentos de outros produtos da Lotus na mesma conta são ignorados.
- O Access Token nunca vai para o navegador: fica só nos secrets do Supabase.

## Configuração (uma vez)

### 1. Criar a aplicação no Mercado Pago

1. Entre com a conta **PJ da Lotus** em <https://www.mercadopago.com.br/developers/panel/app>.
2. **Criar aplicação**: nome "NexLab", tipo de solução **Pagamentos online**, produto **Checkout Pro**. Confirme.
3. Em **Credenciais de produção**, copie o **Access Token** (começa com `APP_USR-`). Não cole em conversas, e-mails ou no código.

### 2. Configurar o webhook

1. Na aplicação, abra **Webhooks → Configurar notificações**, aba **Modo produção**.
2. URL:

   ```
   https://jycpsvlnnmbiwscvgdth.supabase.co/functions/v1/mercadopago-webhook
   ```

3. Eventos: marque **Pagamentos** e **Planos e assinaturas**.
4. Salve. Clique em **Revelar** na **Assinatura secreta** e copie.

### 3. Cadastrar os secrets no Supabase

Supabase → **Edge Functions → Secrets** → adicione:

| Nome | Valor |
|---|---|
| `MP_ACCESS_TOKEN` | Access Token de produção (passo 1) |
| `MP_WEBHOOK_SECRET` | Assinatura secreta do webhook (passo 2) |

`NEXLAB_APP_URL` já existe (usado nos convites) e é reaproveitado nos links de retorno.

### 4. Banco e funções

1. SQL Editor: rode `supabase/migrations/0026_mercado_pago.sql`.
2. Publique as funções (na pasta `NexLab`):

   ```bash
   npx supabase functions deploy mercadopago-pagamento
   npx supabase functions deploy mercadopago-webhook --no-verify-jwt
   ```

   O `--no-verify-jwt` é obrigatório no webhook: quem chama é o Mercado Pago, sem login do Supabase. A segurança vem da assinatura secreta.

3. Publique o frontend (push na `main`).

### 5. Testar antes de liberar

1. No painel de Webhooks, use **Simular notificação** e confira em Supabase → Edge Functions → `mercadopago-webhook` → Logs: deve aparecer resposta 200 (o pagamento simulado não é da Lotus e é ignorado).
2. Configure a cobrança de uma empresa sua no painel `/#/admin` com valor baixo (ex.: R$ 1,00) e vencimento hoje.
3. Entre com um usuário dessa empresa, clique em **Pagar agora** e pague por Pix. Em segundos, o pagamento aparece no histórico como "Mercado Pago (Pix)" e o vencimento avança um mês.
4. Teste também **Ativar débito automático** com um cartão real e cancele em seguida.
5. Use **Desfazer último pagamento** no painel para limpar o teste. O estorno do valor é feito no próprio Mercado Pago.

## Situações especiais

- **Mudança de preço com débito automático ativo**: o valor já cadastrado no cartão não muda sozinho. O painel avisa; peça ao cliente para cancelar e ativar de novo o débito automático em Meu Perfil.
- **Cartão recusado no débito automático**: a mensalidade fica em atraso, o cliente vê o aviso e pode pagar por "Pagar agora".
- **Pagamento por fora do Mercado Pago** (transferência, dinheiro): continue usando "Registrar pagamento" no painel.
- **Notificação perdida**: o Mercado Pago reenvia quando o webhook responde erro. Se ainda assim um pagamento aprovado não aparecer, registre-o manualmente no painel.
