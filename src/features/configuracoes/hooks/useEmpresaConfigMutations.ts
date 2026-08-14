import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

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

export function useEmpresaConfigMutations() {
  const queryClient = useQueryClient()

  const salvar = useMutation({
    mutationFn: async (input: EmpresaConfigFormInput) => {
      const { error } = await supabase.from('empresa_config').update(input).eq('id', 1)
      if (error) throw new Error('Não foi possível salvar as informações do negócio agora. Tente novamente.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa_config'] })
    },
  })

  /** Sobe o arquivo pro bucket público "logos" e devolve a URL pública. */
  const enviarLogo = useMutation({
    mutationFn: async (arquivo: File) => {
      const extensao = arquivo.name.split('.').pop() ?? 'png'
      const caminho = `logo-${Date.now()}.${extensao}`
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
