import type { Metadata } from 'next'
import Link from 'next/link'
import { NovaEmpresaForm } from './NovaEmpresaForm'

export const metadata: Metadata = { title: 'Nova Empresa — Backoffice Integra Solar' }

export default function NovaEmpresaPage() {
  return (
    <div className="max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#9BAEBF] mb-6">
        <Link href="/backoffice/empresas" className="hover:text-[#1A3A5C] transition-colors">
          Empresas
        </Link>
        <span>/</span>
        <span className="text-[#4A6580]">Nova Empresa</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0E2236]">Nova Empresa</h1>
        <p className="text-sm text-[#6B8CA4] mt-0.5">
          Crie uma nova empresa e envie o convite de acesso ao responsável.
        </p>
      </div>

      <NovaEmpresaForm />
    </div>
  )
}
