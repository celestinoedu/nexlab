import * as React from 'react'
import { toast } from 'sonner'
import { Loader2, Lock, Upload } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useEmpresaConfig } from '@/hooks/useEmpresaConfig'
import { useProfile } from '@/hooks/useProfile'
import { useEmpresaConfigMutations } from '../hooks/useEmpresaConfigMutations'

interface EmpresaConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CampoState {
  nome_fantasia: string
  endereco: string
  telefone: string
  email: string
  logo_url: string
  mostrar_endereco: boolean
  mostrar_telefone: boolean
  mostrar_email: boolean
  mostrar_logo: boolean
}

const ESTADO_VAZIO: CampoState = {
  nome_fantasia: '',
  endereco: '',
  telefone: '',
  email: '',
  logo_url: '',
  mostrar_endereco: true,
  mostrar_telefone: true,
  mostrar_email: true,
  mostrar_logo: true,
}

/**
 * Informações do negócio (GRS Lab): endereço, telefone, e-mail e logo, cada
 * um com um toggle "mostrar no cabeçalho dos documentos" (PDF de OS e de
 * Relatório de Fechamento). Escrita restrita a admin (ver docs/database-schema.md § RLS).
 */
export function EmpresaConfigDialog({ open, onOpenChange }: EmpresaConfigDialogProps) {
  const { data: empresa, isLoading: carregando } = useEmpresaConfig()
  const { data: profile } = useProfile()
  const { salvar, enviarLogo } = useEmpresaConfigMutations()
  const podeEditar = profile?.role === 'admin'

  const [estado, setEstado] = React.useState<CampoState>(ESTADO_VAZIO)
  const inputArquivoRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!open || !empresa) return
    setEstado({
      nome_fantasia: empresa.nome_fantasia ?? '',
      endereco: empresa.endereco ?? '',
      telefone: empresa.telefone ?? '',
      email: empresa.email ?? '',
      logo_url: empresa.logo_url ?? '',
      mostrar_endereco: empresa.mostrar_endereco,
      mostrar_telefone: empresa.mostrar_telefone,
      mostrar_email: empresa.mostrar_email,
      mostrar_logo: empresa.mostrar_logo,
    })
  }, [open, empresa])

  async function escolherLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    try {
      const url = await enviarLogo.mutateAsync(arquivo)
      setEstado((prev) => ({ ...prev, logo_url: url }))
      toast.success('Logo enviado — clique em Salvar para confirmar.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível enviar o logo agora.')
    }
  }

  async function onSalvar() {
    try {
      await salvar.mutateAsync({
        nome_fantasia: estado.nome_fantasia.trim() || 'GRS Lab',
        endereco: estado.endereco.trim() || null,
        telefone: estado.telefone.trim() || null,
        email: estado.email.trim() || null,
        logo_url: estado.logo_url.trim() || null,
        mostrar_endereco: estado.mostrar_endereco,
        mostrar_telefone: estado.mostrar_telefone,
        mostrar_email: estado.mostrar_email,
        mostrar_logo: estado.mostrar_logo,
      })
      toast.success('Informações do negócio salvas.')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar agora.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Informações do negócio</DialogTitle>
          <DialogDescription>
            Usadas no cabeçalho dos documentos em PDF (Ordem de Serviço, Relatório de Fechamento).
          </DialogDescription>
        </DialogHeader>

        {!podeEditar && (
          <div className="flex items-center gap-2 rounded-xl bg-warning-100 px-3 py-2 text-sm text-warning-700">
            <Lock size={15} className="shrink-0" />
            Somente administradores podem editar. Você pode consultar os dados abaixo.
          </div>
        )}

        {carregando ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-brand-600" size={24} />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nome_fantasia">Nome do negócio</Label>
              <Input
                id="nome_fantasia"
                disabled={!podeEditar}
                value={estado.nome_fantasia}
                onChange={(e) => setEstado((prev) => ({ ...prev, nome_fantasia: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
              {estado.logo_url ? (
                <img
                  src={estado.logo_url}
                  alt="Logo"
                  className="h-14 w-14 rounded-lg border border-slate-100 object-contain"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                  Sem logo
                </div>
              )}
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label>Logo</Label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-500">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-slate-300"
                      disabled={!podeEditar}
                      checked={estado.mostrar_logo}
                      onChange={(e) => setEstado((prev) => ({ ...prev, mostrar_logo: e.target.checked }))}
                    />
                    Mostrar no cabeçalho
                  </label>
                </div>
                <input
                  ref={inputArquivoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={escolherLogo}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="self-start"
                  disabled={!podeEditar || enviarLogo.isPending}
                  onClick={() => inputArquivoRef.current?.click()}
                >
                  {enviarLogo.isPending ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                  {estado.logo_url ? 'Trocar imagem' : 'Enviar imagem'}
                </Button>
              </div>
            </div>

            {(
              [
                ['endereco', 'Endereço'],
                ['telefone', 'Telefone'],
                ['email', 'E-mail'],
              ] as const
            ).map(([campo, rotulo]) => (
              <div key={campo} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={campo}>{rotulo}</Label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-500">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-slate-300"
                      disabled={!podeEditar}
                      checked={estado[`mostrar_${campo}` as const]}
                      onChange={(e) =>
                        setEstado((prev) => ({ ...prev, [`mostrar_${campo}`]: e.target.checked }))
                      }
                    />
                    Mostrar no cabeçalho
                  </label>
                </div>
                <Input
                  id={campo}
                  disabled={!podeEditar}
                  value={estado[campo]}
                  onChange={(e) => setEstado((prev) => ({ ...prev, [campo]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            {podeEditar ? 'Cancelar' : 'Fechar'}
          </Button>
          {podeEditar && (
            <Button type="button" onClick={onSalvar} disabled={salvar.isPending || carregando}>
              {salvar.isPending && <Loader2 className="animate-spin" size={16} />}
              Salvar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
