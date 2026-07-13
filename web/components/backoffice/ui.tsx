import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

/* ============================================================================
   Sistema de design do Backoffice — Integra Solar
   Paleta (contraste AA garantido):
     ink        #0E1B2A  títulos
     body       #45586E  texto padrão
     muted      #7C8D9E  texto secundário
     line       #E4EBF1  bordas
     surface    #FFFFFF  cards
     ground     #F5F8FB  fundo de página
     brand      #1A3A5C  navy primário
     brand-dk   #0E2236  navy escuro (hover/sidebar)
     accent     #F59E0B  âmbar solar (destaques)
   ========================================================================== */

// ── Botão ────────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'danger' | 'success' | 'ghost'

const BTN_BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1'

const BTN_VARIANTS: Record<ButtonVariant, string> = {
  // texto branco sobre fundo escuro sólido — alto contraste
  primary:   'bg-[#1A3A5C] text-white hover:bg-[#0E2236] focus-visible:ring-[#1A3A5C]',
  // âmbar solar com texto navy escuro — contraste AA
  accent:    'bg-[#F59E0B] text-[#0E2236] hover:bg-[#D97706] hover:text-white focus-visible:ring-[#F59E0B]',
  // contorno com texto navy forte
  secondary: 'bg-white text-[#1A3A5C] border border-[#D0DCE8] hover:bg-[#F0F4F8] focus-visible:ring-[#1A3A5C]',
  danger:    'bg-[#DC2626] text-white hover:bg-[#B91C1C] focus-visible:ring-[#DC2626]',
  success:   'bg-[#12805C] text-white hover:bg-[#0B6446] focus-visible:ring-[#12805C]',
  ghost:     'bg-transparent text-[#45586E] hover:bg-[#F0F4F8] hover:text-[#0E1B2A] focus-visible:ring-[#1A3A5C]',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: { variant?: ButtonVariant } & ComponentProps<'button'>) {
  return <button className={`${BTN_BASE} ${BTN_VARIANTS[variant]} ${className}`} {...props} />
}

export function ButtonLink({
  variant = 'primary',
  className = '',
  ...props
}: { variant?: ButtonVariant } & ComponentProps<typeof Link>) {
  return <Link className={`${BTN_BASE} ${BTN_VARIANTS[variant]} ${className}`} {...props} />
}

// ── Card ─────────────────────────────────────────────────────────────────
export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-2xl bg-white border border-[#E4EBF1] shadow-[0_1px_2px_rgba(14,27,42,0.04),0_8px_24px_-16px_rgba(14,27,42,0.12)] ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[#EEF3F7]">
      <div>
        <h2 className="text-sm font-bold text-[#0E1B2A]">{title}</h2>
        {subtitle && <p className="text-xs text-[#7C8D9E] mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ── Cabeçalho de página ──────────────────────────────────────────────────
export function PageHeader({
  title,
  subtitle,
  action,
  back,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  back?: { href: string; label: string }
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="inline-flex items-center gap-1 text-xs font-semibold text-[#5A7590] hover:text-[#1A3A5C] mb-2 transition-colors">
          ← {back.label}
        </Link>
      )}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#0E1B2A] tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-[#7C8D9E] mt-1">{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  )
}

// ── Badge de status ──────────────────────────────────────────────────────
type Tone = 'green' | 'amber' | 'red' | 'gray' | 'blue' | 'purple'

const TONE: Record<Tone, { bg: string; fg: string }> = {
  green:  { bg: '#DCFCE7', fg: '#12805C' },
  amber:  { bg: '#FEF3C7', fg: '#B45309' },
  red:    { bg: '#FEE2E2', fg: '#C11B1B' },
  gray:   { bg: '#EEF2F6', fg: '#556579' },
  blue:   { bg: '#DBEAFE', fg: '#1E4E8C' },
  purple: { bg: '#EDE9FE', fg: '#6D28D9' },
}

export function Badge({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) {
  const t = TONE[tone]
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ background: t.bg, color: t.fg }}
    >
      {children}
    </span>
  )
}

// ── Tabela ───────────────────────────────────────────────────────────────
export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#E4EBF1] bg-[#F7FAFC]">
            {head.map((h) => (
              <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#7C8D9E] whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-12 text-center text-sm text-[#7C8D9E]">
        {children}
      </td>
    </tr>
  )
}

// ── Input / Label ────────────────────────────────────────────────────────
export const inputCls =
  'w-full rounded-xl border border-[#D0DCE8] px-4 py-2.5 text-sm text-[#0E1B2A] bg-white outline-none transition focus:border-[#1A3A5C] focus:ring-2 focus:ring-[#1A3A5C]/10 placeholder:text-[#9BAEBF]'

export const labelCls = 'block text-xs font-semibold text-[#45586E] mb-1.5'

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {hint && <span className="text-[#9BAEBF] font-normal"> {hint}</span>}
      </label>
      {children}
    </div>
  )
}
