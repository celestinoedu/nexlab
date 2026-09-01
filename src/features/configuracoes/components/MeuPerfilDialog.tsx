import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/AuthProvider'
import { useProfile } from '@/hooks/useProfile'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useProfileMutations } from '../hooks/useProfileMutations'

interface MeuPerfilDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MeuPerfilDialog({ open, onOpenChange }: MeuPerfilDialogProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: profile, isLoading } = useProfile()
  const { salvarNome } = useProfileMutations()
  const [nome, setNome] = React.useState('')

  React.useEffect(() => {
    if (open && profile) setNome(profile.nome ?? '')
  }, [open, profile])

  async function onSalvar() {
    if (nome.trim().length < 2) return toast.error('Informe seu nome completo.')
    try {
      await salvarNome.mutateAsync(nome)
      toast.success('Perfil atualizado.')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar agora.')
    }
  }

  function alterarSenha() {
    onOpenChange(false)
    navigate('/redefinir-senha')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Meu perfil</DialogTitle>
          <DialogDescription>Seus dados pessoais de acesso ao NexLab.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-600" size={24} /></div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="perfil_nome">Nome do responsável</Label>
              <Input id="perfil_nome" value={nome} onChange={(event) => setNome(event.target.value)} autoComplete="name" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="perfil_email">E-mail de acesso</Label>
              <Input id="perfil_email" value={user?.email ?? ''} disabled />
              <p className="text-xs text-slate-400">O e-mail identifica sua conta e não pode ser alterado aqui.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="perfil_role">Nível de acesso</Label>
              <Input id="perfil_role" value={profile?.role === 'admin' ? 'Administrador' : 'Operador'} disabled />
            </div>
            <Button type="button" variant="secondary" className="self-start" onClick={alterarSenha}>Alterar minha senha</Button>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" onClick={onSalvar} disabled={isLoading || salvarNome.isPending}>
            {salvarNome.isPending && <Loader2 className="animate-spin" size={16} />}
            Salvar perfil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
