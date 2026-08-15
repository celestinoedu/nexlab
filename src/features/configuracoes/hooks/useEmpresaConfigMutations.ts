import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isDemoAtivo, ERRO_INDISPONIVEL_DEMO } from '@/lib/demoMode'

export interface EmpresaConfigFormInput {
  nome_fantasia: string
  endereco: string | null
  telefone: string | null
  email: string | null
  logo_url: string | null
  mostrar_endereco: boolean
  mostrar_telefone: boolean
  mostrar_email: boolean
  mostrar_logo: boolean
}

/** `empresaId` é o `id` da própria empresa (vem de `useEmpresaConfig`) — precisa pra filtrar o update e isolar o upload do logo por tenant no bucket. */
export function useEmpresaConfigMutations(empresaId: string | undefined) {
  const queryClient = useQueryClient()

  const salvar = useMutation({
    mutationFn: async (input: EmpresaConfigFormInput) => {
      if (isDemoAtivo(queryClient)) throw new Error(ERRO_INDISPONIVEL_DEMO)
      if (!empresaId) throw new Error('Empresa não carregada ainda. Tente novamente em instantes.')
      const { error } = await supabase.from('empresas').update(input).eq('id', empresaId)
      if (error) throw new Error('Não foi possível salvar as informações do negócio agora. Tente novamente.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa_config'] })
    },
  })

  /** Sobe o arquivo pro bucket público "logos" (numa pasta por empresa) e devolve a URL pública. */
  const enviarLogo = useMutation({
    mutationFn: async (arquivo: File) => {
      if (isDemoAtivo(queryClient)) throw new Error(ERRO_INDISPONIVEL_DEMO)
      if (!empresaId) throw new Error('Empresa não carregada ainda. Tente novamente em instantes.')
      const extensao = arquivo.name.split('.').pop() ?? 'png'
      const caminho = `${empresaId}/logo-${Date.now()}.${extensao}`
      const { error: uploadErr } = await supabase.storage
        .from('logos')
        .upload(caminho, arquivo, { upsert: true, cacheControl: '3600' })
      if (uploadErr) throw new Error('Não foi possível enviar o logo agora. Tente novamente.')

      const { data } = supabase.storage.from('logos').getPublicUrl(caminho)
      return data.publicUrl
    },
  })

  return { salvar, enviarLogo }
}
