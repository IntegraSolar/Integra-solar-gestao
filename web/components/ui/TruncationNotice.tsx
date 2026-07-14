import { OPERACIONAL_MAX } from '@/lib/constants/limits'

/**
 * Aviso exibido quando uma tela operacional atinge o teto de itens carregados
 * (OPERACIONAL_MAX). Evita que a lista seja truncada em silêncio — o usuário
 * é avisado de que há mais registros do que os exibidos.
 */
export function TruncationNotice({ count }: { count: number }) {
  if (count < OPERACIONAL_MAX) return null
  return (
    <div
      className="rounded-xl border px-4 py-2.5 text-xs"
      style={{
        borderColor: 'rgba(251,191,36,0.35)',
        background: 'rgba(251,191,36,0.10)',
        color: '#FBBF24',
      }}
    >
      Exibindo os {OPERACIONAL_MAX} registros mais recentes. Há mais itens que não
      aparecem nesta lista — conclua etapas em andamento para reduzir a fila.
    </div>
  )
}
