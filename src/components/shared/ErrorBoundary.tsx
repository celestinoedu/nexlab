import * as React from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'
import { Logo } from '@/components/shared/Logo'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  erro: Error | null
}

/**
 * Rede de segurança pra qualquer erro de render não tratado. Sem isso, o
 * React desmonta a árvore inteira e sobra uma tela branca — sem nenhum
 * aviso pro usuário nem rastro do que aconteceu (foi o caso investigado em
 * 2026-08: tela branca após login, só no Safari/iOS, sem stale-cache
 * envolvido — ver `docs/architecture.md` § "Cache do index.html..." pro
 * outro caso de tela branca, esse sim de cache).
 *
 * Cobre erros de render dos componentes filhos (React exige classe pra
 * isso — não existe equivalente em hook). NÃO cobre erros em handlers de
 * evento, código assíncrono (ex.: dentro de `.then`/`async`) nem erros no
 * próprio ErrorBoundary — esses continuam precisando de try/catch local.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { erro: null }

  static getDerivedStateFromError(erro: Error): ErrorBoundaryState {
    return { erro }
  }

  componentDidCatch(erro: Error, info: React.ErrorInfo) {
    // Único registro que temos desse erro (sem serviço de monitoramento
    // externo, por ora — ver restrição #1 do CLAUDE.md). Ajuda quem tiver
    // acesso ao DevTools/Web Inspector a pegar o stack completo.
    console.error('[ErrorBoundary] erro não tratado no render:', erro, info.componentStack)
  }

  tentarNovamente = () => {
    this.setState({ erro: null })
  }

  render() {
    const { erro } = this.state
    if (!erro) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex w-full max-w-md flex-col items-center gap-6">
          <Logo />
          <Card className="w-full">
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-100">
                <AlertTriangle className="text-danger-500" size={26} />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-base font-semibold text-slate-900">Algo deu errado nesta tela</p>
                <p className="max-w-sm text-sm text-slate-500">
                  Foi um erro inesperado, não é algo que você tenha feito. Tente novamente — se
                  continuar acontecendo, avise o suporte com a mensagem abaixo.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="secondary" onClick={() => window.location.reload()}>
                  <RotateCw size={16} />
                  Recarregar página
                </Button>
                <Button variant="primary" onClick={this.tentarNovamente}>
                  Tentar novamente
                </Button>
              </div>

              <details className="w-full text-left">
                <summary className="cursor-pointer text-xs font-medium text-slate-400 hover:text-slate-600">
                  Detalhes técnicos
                </summary>
                <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-slate-100 p-3 text-left text-xs whitespace-pre-wrap text-slate-600">
                  {erro.message}
                </pre>
              </details>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
}
