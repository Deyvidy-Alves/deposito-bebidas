import { Beer } from 'lucide-react'

function App(): React.JSX.Element {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Beer className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Depósito — Sistema de Gestão</h1>
        <p className="max-w-md text-base text-muted-foreground">
          Ambiente Electron + React + TypeScript configurado. Banco de dados e módulos
          serão habilitados nos próximos passos.
        </p>
      </div>
    </div>
  )
}

export default App
