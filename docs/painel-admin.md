# Painel administrativo — assinaturas

Painel exclusivo da Lotus para controlar a mensalidade de cada laboratório. Endereço: `/#/admin` (também aparece no menu da conta como **Painel administrativo** para quem tem acesso).

## O que ele faz

- Lista todas as empresas clientes (a Demonstração fica de fora) com mensalidade, próximo vencimento, situação e último pagamento.
- **Configurar cobrança / Editar**: valor mensal, próximo vencimento, quantos dias antes avisar o cliente e se a cobrança está ativa. Desmarcar "Cobrança ativa" pausa os avisos (cortesia, piloto, contrato encerrado).
- **Registrar pagamento**: dá baixa no vencimento atual, grava o pagamento no histórico que o cliente vê em **Meu Perfil** e avança o vencimento para o mês seguinte, mantendo o dia contratado (um cliente "dia 31" vence em 28/02 e volta para 31/03).
- **Desfazer último pagamento** (dentro de Editar): corrige uma baixa feita por engano e devolve o vencimento para a data anterior.

## Mercado Pago

Os clientes pagam pelo Mercado Pago (Pix, cartão, boleto ou débito automático) e a baixa é automática. O painel mostra o selo **Débito automático** e, no histórico, a forma de cada pagamento. "Registrar pagamento" continua disponível para pagamentos feitos por fora. Configuração em [`mercado-pago.md`](./mercado-pago.md).

## O que o cliente vê

| Situação | Quando | No app do cliente |
|---|---|---|
| Em dia | faltam mais dias que o prazo de aviso | nada |
| Vence em breve | faltam de 0 até N dias (N configurável, padrão 5) | pop-up 1× por dia + tarja amarela no rodapé |
| Em atraso | passou do vencimento sem pagamento registrado | pop-up 1× por dia + tarja vermelha no rodapé |
| Sem cobrança | sem cobrança configurada ou pausada | nada |

Todos os usuários do laboratório veem os avisos. Eles somem sozinhos quando o pagamento é confirmado (o app consulta a assinatura a cada 15 minutos, ao recarregar e logo após voltar do Mercado Pago). Com débito automático ativo, só o atraso gera aviso. O acesso **não é bloqueado** automaticamente.

## Ativação (uma vez)

1. No Supabase, **SQL Editor**: rode `supabase/migrations/0025_painel_admin_assinaturas.sql`.
2. Ainda no SQL Editor, libere o painel para a sua conta de login do NexLab:

   ```sql
   insert into public.platform_admins (user_id)
   select id from auth.users where email = 'SEU_EMAIL_DE_LOGIN';
   ```

3. Publique o frontend normalmente (push na `main`). Entre no NexLab com essa conta e abra `/#/admin`.

Para revogar um acesso: `delete from public.platform_admins where user_id = '...';`.

## Segurança

- Sem Edge Function nem chave de serviço no navegador. O painel chama funções `admin_*` no banco (`security definer`) que recusam a chamada (erro `42501`) se a conta não estiver em `platform_admins`.
- `platform_admins` não pode ser lida nem alterada pelo app; só pelo SQL Editor.
- Cada laboratório lê somente a própria linha de `assinaturas` e não consegue alterá-la. Ser `admin` de um laboratório não dá acesso ao painel.
