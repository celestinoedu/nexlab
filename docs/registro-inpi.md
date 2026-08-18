# Registro do NexLab no INPI

Passo a passo para registrar o NexLab como programa de computador diretamente no INPI, sem assessoria. Informações conferidas em 18/08/2026.

> O registro não cria o direito autoral — a proteção do software já nasce com a criação —, mas fortalece a prova de autoria, titularidade e do conteúdo existente na data do depósito.

## 1. Definir autor e titular

Preenchimento recomendado para o NexLab:

- **Título:** NexLab — Sistema de Gestão para Laboratórios de Prótese Dentária
- **Titular:** Lotus Negócios LTDA — CNPJ 45.537.878/0001-07
- **Autor/criador:** nome civil completo e CPF de cada pessoa que escreveu partes originais do sistema
- **Versão:** a versão estável que será congelada para o depósito

Se o autor e o titular forem pessoas diferentes, manter sob a guarda da empresa o contrato de trabalho, prestação de serviços ou cessão de direitos que comprove por que a Lotus é titular. Registrar primeiro no CPF e transferir depois gera outro procedimento e outra taxa.

## 2. Ter certificado digital ICP-Brasil

O pedido exige certificado digital qualificado ICP-Brasil:

- titular pessoa jurídica: **e-CNPJ** da Lotus, utilizado por seu representante legal;
- titular pessoa física: **e-CPF**.

Assinaturas avançadas do Gov.br não são aceitas pelo sistema e-Software. Se a empresa já utiliza e-CNPJ para fins fiscais ou contábeis, verificar sua validade antes de comprar outro.

## 3. Congelar e guardar a versão registrada

Criar um ZIP contendo o material original necessário para identificar a versão, por exemplo:

- `src/`, `public/`, `supabase/` e `brand/`;
- `index.html`, `package.json` e `package-lock.json`;
- configurações do TypeScript, Vite, PostCSS e PWA;
- documentação técnica relevante.

Não incluir:

- `.env.local`, senhas, tokens ou chaves;
- a pasta `Supabase Credentials`;
- dados reais de clientes;
- `.git`, `node_modules` ou `dist`.

Nome sugerido: `NexLab-INPI-v0.18.0-2026-08-18.zip`.

O ZIP não é enviado ao INPI. O titular deve conservar exatamente o arquivo utilizado para gerar o hash. Guardar pelo menos duas cópias de segurança, em locais diferentes, juntamente com o certificado e os documentos de titularidade.

## 4. Gerar o resumo digital SHA-512

No PowerShell, executar:

```powershell
Get-FileHash -Algorithm SHA512 -LiteralPath "C:\caminho\NexLab-INPI-v0.18.0-2026-08-18.zip"
```

Copiar o valor exibido e salvá-lo também em um arquivo de texto. No formulário, informar o algoritmo **SHA-512** e esse resumo.

Não editar, recomprimir nem renomear internamente os arquivos do ZIP após gerar o hash. Qualquer alteração produz outro resumo e elimina a correspondência com o registro.

## 5. Cadastrar-se e emitir a GRU

1. Acessar [Solicitar o registro de programa de computador](https://www.gov.br/pt-br/servicos/solicitar-o-registro-de-programa-de-computador).
2. Entrar com a conta Gov.br e concluir ou confirmar o cadastro no e-INPI.
3. Acessar o sistema oficial de emissão de GRU pelo próprio portal do INPI.
4. Selecionar o código **730 — Pedido de Registro de Programa de Computador**.
5. Conferir se o requerente/titular é a Lotus Negócios LTDA.
6. Pagar a GRU antes de protocolar o pedido.

Em 18/08/2026, o valor oficial do serviço 730 é **R$ 210,00**, sem desconto para programa de computador. Conferir novamente a [tabela oficial de custos](https://www.gov.br/inpi/pt-br/servicos/programas-de-computador/custos) antes de pagar. O INPI não envia boletos ou cobranças espontâneas por e-mail ou WhatsApp.

## 6. Assinar a Declaração de Veracidade

Baixar a Declaração de Veracidade gerada no fluxo da GRU/e-Software e assiná-la digitalmente com o certificado ICP-Brasil adequado. Não imprimir e escanear: o arquivo deve manter uma assinatura digital validável.

## 7. Preencher e protocolar o e-Software

Somente depois da compensação do pagamento, acessar o e-Software e preencher:

- dados da Lotus como titular;
- dados de todos os autores/criadores;
- título e versão do NexLab;
- datas verdadeiras de criação e, se aplicável, publicação;
- linguagens utilizadas, como TypeScript, JavaScript, HTML, CSS e SQL;
- campos de aplicação relacionados a administração e gestão;
- tipo de programa correspondente a aplicativo/sistema de gestão;
- algoritmo SHA-512 e o hash calculado;
- Declaração de Veracidade assinada.

Usar as datas comprováveis pelo histórico Git e pelos documentos da empresa; não estimar datas. Revisar cuidadosamente nomes, CPF, CNPJ e demais campos antes de protocolar, pois correções causadas pelo requerente podem gerar nova taxa.

## 8. Acompanhar e arquivar o certificado

1. Guardar o recibo e o número do processo.
2. Acompanhar o pedido no BuscaWeb e na Revista da Propriedade Industrial (RPI), publicada às terças-feiras.
3. Após a concessão, baixar o certificado eletrônico no BuscaWeb.
4. Guardar juntos o certificado, o ZIP original, o hash, a GRU e os documentos de titularidade.

O portal oficial informa prazo estimado de até oito dias corridos e validade de 50 anos, contada conforme as regras indicadas no serviço. Versões futuras com alterações substanciais podem receber novos registros.

## Fontes oficiais

- [Serviço oficial de registro de programa de computador](https://www.gov.br/pt-br/servicos/solicitar-o-registro-de-programa-de-computador)
- [Guia básico do INPI](https://www.gov.br/inpi/pt-br/servicos/programas-de-computador/guia-basico)
- [Informações sobre hash e guarda da documentação](https://www.gov.br/inpi/pt-br/servicos/programas-de-computador/guia-completo-de-programa-de-computador)
- [Custos e emissão de GRU](https://www.gov.br/inpi/pt-br/servicos/programas-de-computador/custos)
- [Perguntas frequentes sobre programas de computador](https://www.gov.br/inpi/pt-br/acesso-a-informacao/perguntas-frequentes/programas-de-computador)
