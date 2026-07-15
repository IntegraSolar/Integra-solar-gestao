'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/auth/actions'
import type { CurrentUserData } from '@/lib/org/queries'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import {
  LayoutDashboard, Users, UserCheck, FileText, DollarSign,
  Ruler, ShoppingCart, Banknote, Package, Wrench,
  CheckSquare, Star, Settings, BarChart2, GraduationCap,
  Archive, LogOut, MessageCircle, Calculator,
} from 'lucide-react'

type NavItem = {
  label: string
  href: string
  icon: React.ElementType
  moduleKey?: string
  pro?: boolean
}

const PIPELINE_ITEMS: NavItem[] = [
  { label: 'Dashboard',           href: '/dashboard',        icon: LayoutDashboard, moduleKey: 'dashboard' },
  { label: 'CRM / Leads',         href: '/leads',            icon: Users,           moduleKey: 'leads' },
  { label: 'Clientes',            href: '/clientes',         icon: UserCheck,       moduleKey: 'clientes' },
  { label: 'Contratos',           href: '/contratos',        icon: FileText,        moduleKey: 'contratos' },
  { label: 'Financeiro',          href: '/financeiro',       icon: DollarSign,      moduleKey: 'financeiro' },
  { label: 'Projetos',            href: '/projetos',         icon: Ruler,           moduleKey: 'projetos' },
  { label: 'Compras',             href: '/compras',          icon: ShoppingCart,    moduleKey: 'compras' },
  { label: 'Comissões',           href: '/comissoes',        icon: Banknote,        moduleKey: 'comissoes' },
  { label: 'Entrega do Material', href: '/entrega-material', icon: Package,         moduleKey: 'entrega_material' },
  { label: 'Obra',                href: '/obra',             icon: Wrench,          moduleKey: 'obra' },
  { label: 'Entrega da Obra',     href: '/entrega-obra',     icon: CheckSquare,     moduleKey: 'entrega_obra' },
  { label: 'Pós Obra',            href: '/pos-obra',         icon: Star,            moduleKey: 'pos_obra' },
]

// Sempre visível a todos; o acesso é controlado no servidor (flag da empresa).
const SIMULADORES_ITEM: NavItem = {
  label: 'Simuladores', href: '/simuladores', icon: Calculator, pro: true,
}

const SUPPORT_ITEMS: NavItem[] = [
  { label: 'Estoque',       href: '/estoque',       icon: Archive,       moduleKey: 'estoque' },
  { label: 'Relatórios',    href: '/relatorios',    icon: BarChart2,     moduleKey: 'relatorios' },
  { label: 'Treinamento',   href: '/treinamento',   icon: GraduationCap, moduleKey: 'treinamento' },
  { label: 'Configurações', href: '/configuracoes', icon: Settings,      moduleKey: 'configuracoes' },
  { label: 'Suporte',       href: '/contato',       icon: MessageCircle },
]

interface SidebarProps {
  user: CurrentUserData
  notificationCount?: number
  onNotificationClick?: () => void
}

export function Sidebar({ user, notificationCount = 0, onNotificationClick }: SidebarProps) {
  const pathname = usePathname()

  const initials = (user.profile.full_name ?? user.profile.email)
    .substring(0, 2)
    .toUpperCase()

  const roleLabel: Record<string, string> = {
    owner: 'Proprietário',
    admin: 'Administrador',
    gerente: 'Gerente',
    vendedor: 'Vendedor',
    instalador: 'Instalador',
    projetista: 'Projetista',
    manager: 'Gerente',
    user: 'Usuário',
  }

  const isAdmin = ['owner', 'admin'].includes(user.membership?.role ?? '')

  function filterItems(items: NavItem[]) {
    if (isAdmin) return items
    return items.filter((item) => {
      if (!item.moduleKey) return true
      return user.membership?.permissions?.[item.moduleKey]?.access === true
    })
  }

  const FINANCEIRO_SUB = [
    { label: 'Painel', href: '/financeiro' },
    { label: 'Recibos', href: '/financeiro/recibos' },
    { label: 'Custos', href: '/financeiro/custos' },
    { label: 'DRE', href: '/financeiro/dre' },
  ]

  function renderItem(item: NavItem) {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
    const Icon = item.icon
    const color = isActive ? 'var(--theme-accent)' : 'rgba(255,255,255,0.4)'
    const isFinanceiro = item.href === '/financeiro'
    return (
      <div key={item.href}>
        <Link
          href={item.href}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-medium my-0.5 transition-all"
          style={isActive ? { color: 'var(--theme-accent)', background: 'rgba(255,200,100,0.08)', fontWeight: 600 } : undefined}
        >
          <Icon size={15} style={{ color, flexShrink: 0 }} />
          <span style={{ color }}>{item.label}</span>
          {item.pro && (
            <span
              className="ml-auto text-[8px] font-extrabold tracking-wide rounded px-1 py-0.5"
              style={{ background: '#FF9F40', color: '#1A1A1A' }}
            >
              PRO
            </span>
          )}
        </Link>
        {isFinanceiro && isActive && (
          <div className="ml-6 mb-1 flex flex-col gap-0.5">
            {FINANCEIRO_SUB.map(sub => {
              const subActive = sub.href === '/financeiro' ? pathname === '/financeiro' : pathname.startsWith(sub.href)
              return (
                <Link
                  key={sub.href}
                  href={sub.href}
                  className="px-3 py-1.5 rounded-lg text-[12px] transition-all"
                  style={subActive
                    ? { color: 'var(--theme-accent)', fontWeight: 600, background: 'rgba(255,200,100,0.06)' }
                    : { color: 'rgba(255,255,255,0.35)' }}
                >
                  {sub.label}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const pipelineVisible = filterItems(PIPELINE_ITEMS)
  const supportVisible = filterItems(SUPPORT_ITEMS)

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 w-56 flex flex-col z-50"
      style={{
        background: 'var(--theme-sidebar-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--theme-sidebar-border)',
      }}
    >
      {/* Logo */}
      <div
        className="sidebar-logo-area h-14 flex items-center justify-between px-4"
        style={{ borderBottom: '1px solid var(--theme-sidebar-border)' }}
      >
        <Image
          src="/Logo integra solar - Com nome.png"
          alt="Integra Solar"
          width={120}
          height={48}
          className="object-contain"
        />
        {onNotificationClick && (
          <NotificationBell count={notificationCount} onClick={onNotificationClick} />
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav flex-1 overflow-y-auto py-2 px-2">
        {pipelineVisible.map(renderItem)}

        {renderItem(SIMULADORES_ITEM)}

        {/* Separador */}
        <div className="mx-3 my-2 flex items-center gap-2">
          <div className="flex-1 h-px" style={{ background: 'var(--theme-sidebar-border)' }} />
          <span className="text-[9px] font-semibold tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>
            OUTROS
          </span>
          <div className="flex-1 h-px" style={{ background: 'var(--theme-sidebar-border)' }} />
        </div>

        {supportVisible.map(renderItem)}
      </nav>

      {/* User area */}
      <div className="p-3" style={{ borderTop: '1px solid var(--theme-sidebar-border)' }}>
        <div
          className="flex items-center gap-2 p-2 rounded-xl"
          style={{ background: 'var(--theme-sidebar-bg)' }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black text-[#1A1A1A] flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #FFD080, #FF9F40)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-white truncate">
              {user.profile.full_name ?? user.profile.email.split('@')[0]}
            </p>
            <p className="text-[10px] text-white/30">
              {user.membership ? roleLabel[user.membership.role] : ''}
            </p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              title="Sair"
              className="transition-colors p-1 rounded text-white/25 hover:text-red-400"
            >
              <LogOut size={14} />
            </button>
          </form>
        </div>

        {user.membership && (
          <p className="mt-1.5 text-[10px] text-white/20 text-center truncate px-1">
            {user.membership.organization.name}
          </p>
        )}
      </div>
    </aside>
  )
}
