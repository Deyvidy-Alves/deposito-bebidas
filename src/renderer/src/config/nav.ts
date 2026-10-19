import {
  LayoutDashboard,
  Beer,
  Users,
  Package,
  ClipboardList,
  Wallet,
  Settings,
  type LucideIcon
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Agrupamento visual na sidebar. */
  group: 'Operação' | 'Catálogo' | 'Gestão'
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Início', icon: LayoutDashboard, group: 'Operação' },
  { to: '/mesas', label: 'Comandas', icon: Beer, group: 'Operação' },
  { to: '/clientes', label: 'Clientes', icon: Users, group: 'Operação' },
  { to: '/estoque', label: 'Estoque', icon: Package, group: 'Catálogo' },
  { to: '/receitas', label: 'Receitas', icon: ClipboardList, group: 'Catálogo' },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet, group: 'Gestão' },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, group: 'Gestão' }
]

export const NAV_GROUPS: NavItem['group'][] = ['Operação', 'Catálogo', 'Gestão']
