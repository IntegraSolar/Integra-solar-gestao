'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { signOutBackoffice } from '@/lib/backoffice/auth/actions'
import type { PlatformSession } from '@/lib/backoffice/auth/session'

const NAV = [
  { href: '/backoffice/dashboard', label: 'Dashboard', icon: '⬛' },
  { href: '/backoffice/empresas',  label: 'Empresas',  icon: '🏢' },
  { href: '/backoffice/assinaturas', label: 'Assinaturas', icon: '💳' },
  { href: '/backoffice/usuarios',  label: 'Usuários',  icon: '👥' },
  { href: '/backoffice/logs',      label: 'Auditoria', icon: '📋' },
  { href: '/backoffice/configuracoes', label: 'Configurações', icon: '⚙️' },
]

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  support: 'Suporte',
}

export function BackofficeShell({
  user,
  children,
}: {
  user: PlatformSession
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen bg-[#F0F4F8]">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col bg-[#0E2236] text-white">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-5 border-b border-white/10">
          <Image
            src="/Logo integra solar - sem nome.png"
            alt="Integra Solar"
            width={100}
            height={40}
            className="object-contain brightness-0 invert"
          />
        </div>

        <div className="px-4 py-2 border-b border-white/10">
          <span className="text-[10px] uppercase tracking-widest text-[#5A8AAA] font-semibold">
            Backoffice
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                style={
                  active
                    ? { background: 'rgba(255,255,255,0.12)', color: '#fff' }
                    : { color: 'rgba(255,255,255,0.55)' }
                }
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User info + logout */}
        <div className="border-t border-white/10 px-4 py-4">
          <div className="mb-3">
            <p className="text-xs font-semibold text-white truncate">{user.name}</p>
            <p className="text-[11px] text-[#5A8AAA] truncate">{ROLE_LABEL[user.role] ?? user.role}</p>
          </div>
          <form action={signOutBackoffice}>
            <button
              type="submit"
              className="w-full rounded-lg py-1.5 text-xs font-medium text-[#9BAEBF] hover:text-white hover:bg-white/10 transition-colors"
            >
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  )
}
