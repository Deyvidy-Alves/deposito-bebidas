import { HashRouter, Routes, Route } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/Dashboard'
import { ComingSoon } from '@/components/ComingSoon'

function App(): React.JSX.Element {
  return (
    <TooltipProvider delayDuration={300}>
      <HashRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route
              path="/mesas"
              element={<ComingSoon title="Mesas" description="Sessões de consumo e pedidos" />}
            />
            <Route
              path="/clientes"
              element={<ComingSoon title="Clientes" description="Cadastro e saldo devedor" />}
            />
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
