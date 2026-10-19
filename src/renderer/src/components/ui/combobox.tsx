import { useState } from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './command'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  allowCreate?: boolean
  className?: string
}

/** Combobox buscável com opção de criar um novo valor na hora. */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  searchPlaceholder = 'Buscar...',
  emptyText = 'Nenhum resultado.',
  allowCreate = true,
  className
}: ComboboxProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const normalized = query.trim()
  const exists = options.some((o) => o.toLowerCase() === normalized.toLowerCase())

  function pick(v: string): void {
    onChange(v)
    setOpen(false)
    setQuery('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', !value && 'text-muted-foreground', className)}
        >
          {value || placeholder}
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} value={query} onValueChange={setQuery} />
          <CommandList>
            {!normalized && <CommandEmpty>{emptyText}</CommandEmpty>}
            {normalized && !exists && allowCreate && (
              <CommandItem value={`__create__${normalized}`} onSelect={() => pick(normalized)}>
                <Plus className="text-primary" />
                Criar “{normalized}”
              </CommandItem>
            )}
            <CommandGroup>
              {options.map((o) => (
                <CommandItem key={o} value={o} onSelect={() => pick(o)}>
                  <Check className={cn('h-4 w-4', value === o ? 'opacity-100' : 'opacity-0')} />
                  {o}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
