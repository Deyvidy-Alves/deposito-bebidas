import {
  LayoutDashboard,
  Beer,
  Users,
  Package,
  GlassWater,
  Wallet,
  Settings,
  type LucideIcon
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Início', icon: LayoutDashboard },
  { to: '/mesas', label: 'Mesas', icon: Beer },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/estoque', label: 'Estoque', icon: Package },
  { to: '/copoes', label: 'Copões', icon: GlassWater },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet },
  { to: '/configuracoes', label: 'Configurações', icon: Settings }
]
