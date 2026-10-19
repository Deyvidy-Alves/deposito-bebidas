import { Hammer } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'

export function ComingSoon({
  title,
  description
}: {
  title: string
  description?: string
}): React.JSX.Element {
  return (
    <div className="flex h-full flex-col">
      <PageHeader title={title} description={description} />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Hammer className="h-8 w-8" />
        </div>
        <p className="text-base text-muted-foreground">Módulo em construção.</p>
      </div>
    </div>
  )
}
