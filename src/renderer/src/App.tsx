import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/Dashboard'
import { MesasPage } from '@/pages/Mesas'
import { ClientesPage } from '@/pages/Clientes'
import { EstoquePage } from '@/pages/Estoque'
import { ReceitasPage } from '@/pages/Receitas'
import { FinanceiroPage } from '@/pages/Financeiro'
import { ConfiguracoesPage } from '@/pages/Configuracoes'

function App(): React.JSX.Element {
  return (
    <TooltipProvider delayDuration={300}>
      <HashRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/mesas" element={<MesasPage />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/estoque" element={<EstoquePage />} />
            <Route path="/receitas" element={<ReceitasPage />} />
            {/* Rota legada — redireciona para o novo módulo de receitas */}
            <Route path="/copoes" element={<Navigate to="/receitas" replace />} />
            <Route path="/financeiro" element={<FinanceiroPage />} />
            <Route path="/configuracoes" element={<ConfiguracoesPage />} />
          </Route>
        </Routes>
      </HashRouter>
      <Toaster />
    </TooltipProvider>
  )
}

export default App
