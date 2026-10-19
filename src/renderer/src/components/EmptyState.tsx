import type { LucideIcon } from 'lucide-react'

/** Estado vazio padronizado — ícone em cápsula, mensagem e ação opcional. */
export function EmptyState({
  icon: Icon,
  title,
  message,
  action
}: {
  icon: LucideIcon
  title?: string
  message: string
  action?: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-card/30 p-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-7 w-7" />
      </div>
      {title && <p className="text-base font-semibold">{title}</p>}
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
