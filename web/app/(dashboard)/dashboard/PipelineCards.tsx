'use client'

import Link from 'next/link'
import type { PipelineCard } from '@/lib/dashboard/queries'

export default function PipelineCards({ cards }: { cards: PipelineCard[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className="rounded-2xl border border-white/10 p-4 flex flex-col gap-2 hover:border-white/20 transition-all cursor-pointer"
          style={{ background: 'var(--theme-surface)' }}
        >
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: card.color }}>
            {card.label}
          </span>
          <span className="text-3xl font-bold text-white">{card.total}</span>
          <div className="flex items-center gap-1.5">
            {card.pending > 0 ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">
                {card.pending} pendente{card.pending !== 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-300">
                Em dia
              </span>
            )}
            <span className="text-xs text-white/30">total</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
