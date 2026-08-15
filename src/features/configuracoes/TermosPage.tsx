import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/**
 * Texto estático (sem banco) — se precisar mudar o conteúdo, é só editar este
 * arquivo. Cobre uso interno do NexLab e tratamento de dados pessoais de
 * terceiros (nome de cliente final/paciente) sob a LGPD, já que o sistema
 * guarda esse tipo de dado desde o módulo de Ordens de Serviço.
 */
export function TermosPage() {
  const navigate = useNavigate()

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
            O NexLab é um sistema de gestão de uso <strong>interno</strong>, desenvolvido sob medida para o
            GRS Lab (laboratório de próteses dentárias), para controle de Ordens de Serviço, cadastro de
            clientes e parceiros, catálogo de serviços e financeiro. Não é um produto de acesso público —
            só pessoas autorizadas pela direção do GRS Lab têm login.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-slate-900">2. Uso do sistema</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>O acesso é pessoal e intransferível — cada usuário é responsável pelo que for feito com seu login.</li>
            <li>
              Não existe cadastro público: novos acessos são criados manualmente pela direção do GRS Lab,
              com papel de <strong>Administrador</strong> (acesso completo, incluindo preços/comissões e
              fechamento financeiro) ou <strong>Operador</strong> (uso do dia a dia, sem esses acessos
              sensíveis).
            </li>
            <li>Os dados cadastrados (Ordens de Serviço, clientes, parceiros, financeiro) são de responsabilidade do GRS Lab.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-slate-900">3. Proteção de dados (LGPD)</h2>
          <p>
            O NexLab trata dados pessoais de terceiros — principalmente <strong>nome do cliente final</strong>{' '}
            e <strong>nome do paciente</strong> vinculados a cada Ordem de Serviço — necessários para a
            prestação do serviço de prótese dentária contratado pelos Clientes e Parceiros do GRS Lab.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Base legal</strong>: execução de contrato/legítimo interesse do GRS Lab na prestação
              do serviço, conforme art. 7º da Lei nº 13.709/2018 (LGPD).
            </li>
            <li>
              <strong>Quem acessa</strong>: só usuários autenticados do GRS Lab, controlado por papel
              (Administrador/Operador) via regras de segurança no banco de dados (Row Level Security) — não
              há exposição pública de nenhum dado.
            </li>
            <li>
              <strong>Onde fica armazenado</strong>: banco de dados Supabase (Postgres), com conexão
              criptografada (HTTPS/TLS) entre o navegador e o servidor.
            </li>
            <li>
              <strong>Retenção</strong>: os dados ficam enquanto forem necessários para o histórico
              operacional e financeiro do GRS Lab, ou até o titular solicitar a exclusão (respeitado o
              prazo legal de guarda de documentos fiscais/contábeis, quando aplicável).
            </li>
            <li>
              <strong>Direitos do titular</strong>: qualquer pessoa cujo nome apareça em uma Ordem de
              Serviço (paciente/cliente final) pode solicitar acesso, correção ou exclusão dos seus dados
              diretamente ao GRS Lab, responsável pelo tratamento.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-slate-900">4. Contato</h2>
          <p>
            Dúvidas sobre uso do sistema ou sobre dados pessoais tratados: fale diretamente com a direção
            do <strong>GRS Lab</strong>, responsável pelo tratamento dos dados cadastrados no sistema.
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
            cadastrados pelo GRS Lab no dia a dia.
          </p>
        </section>
      </div>
    </div>
  )
}
