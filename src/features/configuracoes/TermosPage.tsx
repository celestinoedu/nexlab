import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'

/**
 * Texto praticamente estático — só o nome da empresa/tenant é dinâmico
 * (`useEmpresaConfig`), já que o NexLab atende vários laboratórios (ver
 * docs/database-schema.md § Multi-tenant): cada cliente vê os Termos com o
 * próprio nome como responsável pelo tratamento dos dados, nunca o de outro.
 * Se precisar mudar o conteúdo em si, é só editar este arquivo.
 */
export function TermosPage() {
  const navigate = useNavigate()
  const { data: empresa } = useEmpresaConfig()
  const nomeEmpresa = empresa?.nome_fantasia || 'o laboratório contratante'

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => navigate('/configuracoes')}
        className="flex w-fit items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={15} />
        Configurações
      </button>

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Termos e Condições de Uso</h1>
        <p className="text-sm text-slate-500">Última atualização: 15 de agosto de 2026.</p>
      </div>

      <div className="flex max-w-3xl flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-600">
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-slate-900">1. Sobre o NexLab</h2>
          <p>
            O NexLab é um sistema de gestão de uso <strong>interno</strong>, desenvolvido para laboratórios de
            próteses dentárias controlarem Ordens de Serviço, cadastro de clientes e parceiros, catálogo de
            serviços e financeiro. Cada laboratório cliente (como <strong>{nomeEmpresa}</strong>) tem seus dados
            isolados dos demais dentro do sistema. Não é um produto de acesso público — só pessoas autorizadas
            pela direção de <strong>{nomeEmpresa}</strong> têm login.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-slate-900">2. Uso do sistema</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>O acesso é pessoal e intransferível — cada usuário é responsável pelo que for feito com seu login.</li>
            <li>
              Não existe cadastro público: novos acessos são criados manualmente pela direção de{' '}
              <strong>{nomeEmpresa}</strong>, com papel de <strong>Administrador</strong> (acesso completo,
              incluindo preços/comissões e fechamento financeiro) ou <strong>Operador</strong> (uso do dia a dia,
              sem esses acessos sensíveis).
            </li>
            <li>Os dados cadastrados (Ordens de Serviço, clientes, parceiros, financeiro) são de responsabilidade de <strong>{nomeEmpresa}</strong>.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-slate-900">3. Proteção de dados (LGPD)</h2>
          <p>
            O NexLab trata dados pessoais de terceiros — principalmente <strong>nome do cliente final</strong>{' '}
            e <strong>nome do paciente</strong> vinculados a cada Ordem de Serviço — necessários para a
            prestação do serviço de prótese dentária contratado pelos Clientes e Parceiros de{' '}
            <strong>{nomeEmpresa}</strong>.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Base legal</strong>: execução de contrato/legítimo interesse de <strong>{nomeEmpresa}</strong> na
              prestação do serviço, conforme art. 7º da Lei nº 13.709/2018 (LGPD).
            </li>
            <li>
              <strong>Quem acessa</strong>: só usuários autenticados de <strong>{nomeEmpresa}</strong>, controlado
              por papel (Administrador/Operador) via regras de segurança no banco de dados (Row Level Security) —
              não há exposição pública de nenhum dado, nem acesso de um laboratório cliente aos dados de outro.
            </li>
            <li>
              <strong>Onde fica armazenado</strong>: banco de dados Supabase (Postgres), com conexão
              criptografada (HTTPS/TLS) entre o navegador e o servidor.
            </li>
            <li>
              <strong>Retenção</strong>: os dados ficam enquanto forem necessários para o histórico
              operacional e financeiro de <strong>{nomeEmpresa}</strong>, ou até o titular solicitar a exclusão
              (respeitado o prazo legal de guarda de documentos fiscais/contábeis, quando aplicável).
            </li>
            <li>
              <strong>Direitos do titular</strong>: qualquer pessoa cujo nome apareça em uma Ordem de
              Serviço (paciente/cliente final) pode solicitar acesso, correção ou exclusão dos seus dados
              diretamente a <strong>{nomeEmpresa}</strong>, responsável pelo tratamento.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-slate-900">4. Contato</h2>
          <p>
            Dúvidas sobre uso do sistema ou sobre dados pessoais tratados: fale diretamente com a direção
            de <strong>{nomeEmpresa}</strong>, responsável pelo tratamento dos dados cadastrados no sistema.
          </p>
          <p className="text-xs text-slate-400">
            O NexLab é desenvolvido e mantido por{' '}
            <a
              href="https://www.lotusnegocios.com"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-dotted hover:text-slate-600"
            >
              Lotus Negócios LTDA
            </a>{' '}
            — CNPJ 45.537.878/0001-07 — como fornecedora de tecnologia, sem acesso operacional aos dados
            cadastrados por <strong>{nomeEmpresa}</strong> no dia a dia.
          </p>
        </section>
      </div>
    </div>
  )
}
