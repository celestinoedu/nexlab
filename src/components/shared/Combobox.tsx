import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { focarCampoVizinho } from '@/lib/foco'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'

export interface ComboboxOption {
  value: string
  label: string
  /** Texto pequeno opcional à direita (ex.: badge de tipo) */
  hint?: React.ReactNode
}

function normalizarBusca(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function filtrarPorNome(value: string, busca: string, keywords?: string[]) {
  const nome = keywords?.length ? keywords.join(' ') : value
  return normalizarBusca(nome).includes(normalizarBusca(busca.trim())) ? 1 : 0
}

/** Foca a busca com o cursor no fim, sem selecionar a letra que abriu a lista. */
function focarBusca(input: HTMLInputElement | null) {
  if (!input) return
  input.focus()
  input.setSelectionRange(input.value.length, input.value.length)
}

/**
 * Telas só de toque (celular/tablet) usam um diálogo em vez do popover. Um
 * notebook com tela sensível ao toque continua com o popover, que é o que
 * funciona com teclado e mouse.
 */
function ehTelaSoDeToque() {
  return typeof window !== 'undefined' && window.matchMedia?.('(hover: none) and (pointer: coarse)').matches
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string | null
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  id?: string
  /** Ref do botão — permite ao formulário focar o campo (ex.: linha nova, erro de validação). */
  ref?: React.Ref<HTMLButtonElement>
}

/**
 * Combobox pesquisável (Entidade, Serviço), com seleção estável em telas de
 * toque. No teclado se comporta como um campo comum: digitar com ele focado
 * já abre a busca, e Tab escolhe a opção destacada e segue para o próximo campo.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Nada encontrado.',
  disabled,
  id,
  ref,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [busca, setBusca] = React.useState('')
  const [destacado, setDestacado] = React.useState('')
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const abertoPeloTeclado = React.useRef(false)
  const direcaoTab = React.useRef<0 | 1 | -1>(0)
  const selected = options.find((o) => o.value === value)
  const isTouchDevice = ehTelaSoDeToque()

  const setTriggerRef = React.useCallback(
    (el: HTMLButtonElement | null) => {
      triggerRef.current = el
      if (typeof ref === 'function') ref(el)
      else if (ref) ref.current = el
    },
    [ref],
  )

  function alterarAberto(proximo: boolean) {
    if (proximo) {
      setDestacado(value ?? '')
    } else {
      setBusca('')
      abertoPeloTeclado.current = false
    }
    setOpen(proximo)
  }

  function onTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled || event.ctrlKey || event.metaKey || event.altKey) return
    const ehLetra = event.key.length === 1 && event.key !== ' '
    if (ehLetra || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      abertoPeloTeclado.current = true
      setBusca(ehLetra ? event.key : '')
      setDestacado(value ?? '')
      setOpen(true)
    } else if (event.key === 'Enter' || event.key === ' ') {
      abertoPeloTeclado.current = true
    }
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Tab') return
    event.preventDefault()
    // Tab depois de digitar confirma a opção destacada, como num campo de autocompletar.
    if (busca.trim() && destacado) {
      const opcao = options.find((o) => o.value === destacado)
      if (opcao) onChange(opcao.value)
    }
    direcaoTab.current = event.shiftKey ? -1 : 1
    alterarAberto(false)
  }

  function onCloseAutoFocus(event: Event) {
    const direcao = direcaoTab.current
    direcaoTab.current = 0
    if (direcao === 0 || !triggerRef.current) return
    event.preventDefault()
    focarCampoVizinho(triggerRef.current, direcao)
  }

  const trigger = (
    <button
      ref={setTriggerRef}
      id={id}
      type="button"
      role="combobox"
      aria-expanded={open}
      aria-label={id ? undefined : placeholder}
      disabled={disabled}
      onKeyDown={onTriggerKeyDown}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-sm',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500',
        'disabled:cursor-not-allowed disabled:opacity-50',
        !selected && 'text-slate-400',
      )}
    >
      <span className="truncate">{selected ? selected.label : placeholder}</span>
      <ChevronDown size={16} className="ml-2 shrink-0 text-slate-400" />
    </button>
  )

  const choices = (
    <Command className="min-h-0" filter={filtrarPorNome} value={destacado} onValueChange={setDestacado}>
      <CommandInput
        ref={inputRef}
        placeholder={searchPlaceholder}
        value={busca}
        onValueChange={setBusca}
        onKeyDown={onInputKeyDown}
      />
      <CommandList className="min-h-0 overscroll-contain">
        <CommandEmpty>{emptyMessage}</CommandEmpty>
        <CommandGroup>
          {options.map((option) => (
            <CommandItem
              key={option.value}
              value={option.value}
              keywords={[option.label]}
              onSelect={() => {
                onChange(option.value)
                alterarAberto(false)
              }}
            >
              <Check
                size={16}
                className={cn(
                  'shrink-0 text-brand-600',
                  option.value === value ? 'opacity-100' : 'opacity-0',
                )}
              />
              <span className="flex-1 truncate">{option.label}</span>
              {option.hint}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  )

  if (isTouchDevice) {
    return (
      <Dialog open={open} onOpenChange={alterarAberto}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent
          className="top-4 flex max-h-[calc(100dvh-2rem)] max-w-md translate-y-0 flex-col overflow-hidden p-0"
          onOpenAutoFocus={(event) => {
            // No toque, não abre o teclado virtual sozinho; com teclado físico, vai direto pra busca.
            event.preventDefault()
            if (abertoPeloTeclado.current) focarBusca(inputRef.current)
          }}
          onCloseAutoFocus={onCloseAutoFocus}
        >
          <DialogHeader className="mb-0 shrink-0 border-b border-slate-100 px-4 py-3 pr-12">
            <DialogTitle className="text-base">{placeholder}</DialogTitle>
            <DialogDescription className="sr-only">Busque ou escolha uma opção na lista.</DialogDescription>
          </DialogHeader>
          {choices}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Popover open={open} onOpenChange={alterarAberto}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        collisionPadding={12}
        sticky="always"
        hideWhenDetached
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          focarBusca(inputRef.current)
        }}
        onCloseAutoFocus={onCloseAutoFocus}
        className="flex max-h-[var(--radix-popover-content-available-height)] w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden p-0"
      >
        {choices}
      </PopoverContent>
    </Popover>
  )
}
