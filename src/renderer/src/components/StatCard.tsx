import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Accent = 'primary' | 'success' | 'warning' | 'neutral'

const ACCENTS: Record<Accent, { icon: string; value: string }> = {
  primary: { icon: 'bg-primary/10 text-primary', value: 'text-foreground' },
  success: { icon: 'bg-success/10 text-success', value: 'text-success' },
  warning: { icon: 'bg-warning/15 text-warning', value: 'text-warning' },
  neutral: { icon: 'bg-muted text-muted-foreground', value: 'text-foreground' }
}

/** Card de métrica do dashboard: rótulo, valor em destaque e ícone em cápsula. */
export function StatCard({
  title,
  value,
  icon: Icon,
  accent = 'neutral',
  hint
}: {
  title: string
  value: string
  icon: LucideIcon
  accent?: Accent
  hint?: string
}): React.JSX.Element {
  const a = ACCENTS[accent]
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/30">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', a.icon)}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className={cn('mt-3 text-2xl font-bold tabular-nums', a.value)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
