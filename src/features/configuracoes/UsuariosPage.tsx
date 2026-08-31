import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Plus, Pencil, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useProfile, type Profile } from '@/hooks/useProfile'
import { useUsuarios } from './hooks/useUsuarios'
import { VincularUsuarioDialog } from './components/VincularUsuarioDialog'
import { EditarUsuarioDialog } from './components/EditarUsuarioDialog'
import { ROLE_USUARIO_LABEL } from '@/types/domain'

export function UsuariosPage() {
  const navigate = useNavigate()
  const { data: usuarios, isLoading } = useUsuarios()
  const { data: profile } = useProfile()
  const podeGerenciar = profile?.role === 'admin'

  const [novoAberto, setNovoAberto] = React.useState(false)
  const [usuarioEditando, setUsuarioEditando] = React.useState<Profile | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => navigate('/configuracoes')}
        className="flex w-fit items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={15} />
        Configurações
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Usuários</h1>
          <p className="text-sm text-slate-500">Quem tem acesso ao NexLab e com qual papel.</p>
        </div>
        {podeGerenciar && (
          <Button onClick={() => setNovoAberto(true)}>
            <Plus size={18} />
            Novo usuário
          </Button>
        )}
      </div>

      {!podeGerenciar && (
        <div className="flex items-center gap-2 rounded-xl bg-warning-100 px-3 py-2 text-sm text-warning-700">
          <Lock size={15} className="shrink-0" />
          Somente administradores podem gerenciar usuários. Você vê aqui só o seu próprio cadastro.
        </div>
      )}

      {podeGerenciar && (
        <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-800">
          Ao cadastrar, o NexLab envia um kit de boas-vindas com 5 passos, instruções para instalar no
          celular e um link seguro para a pessoa criar a própria senha no primeiro acesso.
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-brand-600" size={28} />
        </div>
      ) : (usuarios ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">
          Nenhum usuário encontrado.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs font-medium text-slate-400">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {(usuarios ?? []).map((usuario) => (
                <tr key={usuario.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{usuario.nome || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={usuario.role === 'admin' ? 'brand' : 'neutral'}>
                      {ROLE_USUARIO_LABEL[usuario.role]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={usuario.ativo ? 'success' : 'danger'}>
                      {usuario.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {podeGerenciar && (
                      <button
                        type="button"
                        onClick={() => setUsuarioEditando(usuario)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Editar usuário"
                        title="Editar usuário"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <VincularUsuarioDialog open={novoAberto} onOpenChange={setNovoAberto} />
      <EditarUsuarioDialog
        open={Boolean(usuarioEditando)}
        onOpenChange={(open) => !open && setUsuarioEditando(null)}
        usuario={usuarioEditando}
        ehVoceMesmo={usuarioEditando?.id === profile?.id}
      />
    </div>
  )
}
