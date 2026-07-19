export const metadata = { title: 'Híbrido / Off-grid' }
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isSimuladoresEnabled } from '@/lib/simuladores/access'

export default async function HibridoOffgridPage() {
  if (!(await isSimuladoresEnabled())) redirect('/simuladores')
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-xl font-bold text-[var(--theme-text,#1a2340)]">Híbrido / Off-grid</h1>
        <span className="text-[10px] font-extrabold tracking-wide bg-[#fff6e6] text-[#b26b00] border border-[#f0d9a8] rounded px-1.5 py-0.5">EM CONSTRUÇÃO</span>
      </div>
      <p className="text-sm text-[var(--theme-text-muted,#6b7280)] mb-5">
        O dimensionamento e a análise ainda estão em desenvolvimento. Por enquanto, mantenha seu catálogo de equipamentos atualizado.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/simuladores/hibrido-offgrid/equipamentos" className="block h-full">
          <div className="h-full rounded-xl border p-4 transition-colors hover:border-[#FF9F40] bg-[var(--theme-card,#fff)]">
            <div className="text-2xl">🧰</div>
            <h3 className="mt-2 text-sm font-semibold text-[var(--theme-text,#1a2340)]">Cadastro de equipamentos</h3>
            <p className="mt-0.5 text-xs text-[var(--theme-text-muted,#7b8194)]">Painéis, inversores e baterias que alimentarão o simulador.</p>
          </div>
        </Link>
        <Link href="/simuladores/hibrido-offgrid/cargas" className="block h-full">
          <div className="h-full rounded-xl border p-4 transition-colors hover:border-[#FF9F40] bg-[var(--theme-card,#fff)]">
            <div className="text-2xl">🔌</div>
            <h3 className="mt-2 text-sm font-semibold text-[var(--theme-text,#1a2340)]">Levantamento de cargas</h3>
            <p className="mt-0.5 text-xs text-[var(--theme-text-muted,#7b8194)]">Consumo, potências e curva de demanda de 24 h.</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
