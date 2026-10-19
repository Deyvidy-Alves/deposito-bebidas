import { HashRouter, Routes, Route } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/Dashboard'
import { MesasPage } from '@/pages/Mesas'
import { ClientesPage } from '@/pages/Clientes'
import { ComingSoon } from '@/components/ComingSoon'

function App(): React.JSX.Element {
  return (
    <TooltipProvider delayDuration={300}>
      <HashRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/mesas" element={<MesasPage />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route
              path="/estoque"
              element={<ComingSoon title="Estoque" description="Produtos e movimentações" />}
            />
            <Route
              path="/copoes"
              element={<ComingSoon title="Copões" description="Receitas de bebidas" />}
            />
            <Route
              path="/financeiro"
              element={<ComingSoon title="Financeiro" description="Faturamento, custos e lucro" />}
            />
            <Route
              path="/configuracoes"
              element={<ComingSoon title="Configurações" description="Preferências do sistema" />}
            />
          </Route>
        </Routes>
      </HashRouter>
      <Toaster />
    </TooltipProvider>
  )
}

export default App
