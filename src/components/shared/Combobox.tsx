import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
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
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function filtrarPorNome(nome: string, busca: string) {
  return normalizarBusca(nome).includes(normalizarBusca(busca.trim())) ? 1 : 0
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
}

/** Combobox pesquisável (Entidade, Serviço), com seleção estável em telas de toque. */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Nada encontrado.',
  disabled,
  id,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const selected = options.find((o) => o.value === value)
  const isTouchDevice = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0

  const trigger = (
    <button
      id={id}
      type="button"
      role="combobox"
      aria-expanded={open}
      aria-label={id ? undefined : placeholder}
      disabled={disabled}
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
    <Command className="min-h-0" filter={filtrarPorNome}>
      <CommandInput placeholder={searchPlaceholder} />
      <CommandList className="min-h-0 overscroll-contain">
        <CommandEmpty>{emptyMessage}</CommandEmpty>
        <CommandGroup>
          {options.map((option) => (
            <CommandItem
              key={option.value}
              value={option.label}
              onSelect={() => {
                onChange(option.value)
                setOpen(false)
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent
          className="top-4 flex max-h-[calc(100dvh-2rem)] max-w-md translate-y-0 flex-col overflow-hidden p-0"
          onOpenAutoFocus={(event) => event.preventDefault()}
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        collisionPadding={12}
        sticky="always"
        hideWhenDetached
        className="flex max-h-[var(--radix-popover-content-available-height)] w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden p-0"
      >
        {choices}
      </PopoverContent>
    </Popover>
  )
}
