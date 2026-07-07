'use client'

import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, Percent, DollarSign, Equal } from 'lucide-react'
import { formatCurrency } from '@/lib/format'

interface AjusteAtual {
  valor: number
  percentual: number
  motivo: string
  tipo: string
}

interface ApplyData {
  ajuste_tipo: string
  ajuste_valor: number
  ajuste_percentual: number
  preco_final: number
  ajuste_motivo: string
}

interface CommercialAdjustmentModalProps {
  precoCalculado: number
  ajusteAtual: AjusteAtual | null
  onApply: (data: ApplyData) => void
  onRemove: () => void
  onClose: () => void
}

type Mode = 'percentual' | 'valor' | 'valor_final'

function formatSignedCurrency(value: number): string {
  const abs = Math.abs(value)
  const sign = value >= 0 ? '+' : '−'
  return `${sign}${formatCurrency(abs)}`
}

function formatSignedPct(value: number): string {
  const abs = Math.abs(value * 100)
  const sign = value >= 0 ? '+' : '−'
  return `${sign}${abs.toFixed(2)}%`
}

export function CommercialAdjustmentModal({
  precoCalculado,
  ajusteAtual,
  onApply,
  onRemove,
  onClose,
}: CommercialAdjustmentModalProps) {
  const initialMode: Mode = (ajusteAtual?.tipo as Mode) ?? 'percentual'
  const initialValue = (): string => {
    if (!ajusteAtual) return ''
    if (ajusteAtual.tipo === 'percentual') return (ajusteAtual.percentual * 100).toFixed(2)
    if (ajusteAtual.tipo === 'valor') return ajusteAtual.valor.toFixed(2)
    if (ajusteAtual.tipo === 'valor_final') return (precoCalculado + ajusteAtual.valor).toFixed(2)
    return ''
  }

  const [mode, setMode] = useState<Mode>(initialMode)
  const [inputValue, setInputValue] = useState(initialValue())
  const [motivo, setMotivo] = useState(ajusteAtual?.motivo ?? '')
  const [validationError, setValidationError] = useState<string | null>(null)

  const preview = useMemo(() => {
    const numInput = parseFloat(inputValue.replace(',', '.')) || 0

    let ajuste_valor = 0
    let ajuste_percentual = 0
    let preco_final = precoCalculado

    if (mode === 'percentual') {
      ajuste_percentual = numInput / 100
      ajuste_valor = precoCalculado * ajuste_percentual
      preco_final = precoCalculado + ajuste_valor
    } else if (mode === 'valor') {
      ajuste_valor = numInput
      ajuste_percentual = precoCalculado !== 0 ? ajuste_valor / precoCalculado : 0
      preco_final = precoCalculado + ajuste_valor
    } else {
      // valor_final: o usuário digita o preço final desejado
      preco_final = numInput
      ajuste_valor = preco_final - precoCalculado
      ajuste_percentual = precoCalculado !== 0 ? ajuste_valor / precoCalculado : 0
    }

    return { ajuste_valor, ajuste_percentual, preco_final }
  }, [mode, inputValue, precoCalculado])

  function handleApply() {
    setValidationError(null)

    if (!inputValue.trim()) {
      setValidationError('Informe o valor do ajuste.')
      return
    }
    if (preview.preco_final <= 0) {
      setValidationError('O valor final deve ser maior que zero.')
      return
    }
    if (preview.ajuste_valor === 0) {
      setValidationError('O ajuste não pode ser zero.')
      return
    }
    if (!motivo.trim()) {
      setValidationError('A justificativa é obrigatória.')
      return
    }

    onApply({
      ajuste_tipo: mode,
      ajuste_valor: preview.ajuste_valor,
      ajuste_percentual: preview.ajuste_percentual,
      preco_final: preview.preco_final,
      ajuste_motivo: motivo.trim(),
    })
    onClose()
  }

  const tabCls = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
      active
        ? 'text-white'
        : 'text-white/40 hover:text-white/70'
    }`

  const inputCls =
    'w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none border focus:border-white/30 bg-white/5'

  const hasAjuste = ajusteAtual != null

  return createPortal(
    <>
      {/* Backdrop — z-index acima do ProposalPricingReview (71) */}
      <div
        className="fixed inset-0 z-[80]"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed z-[81] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-2xl flex flex-col"
        style={{
          background: 'var(--theme-drawer-bg)',
          border: '1px solid var(--theme-card-border)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--theme-border)' }}
        >
          <h2 className="text-sm font-bold text-white">Ajuste Comercial</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X size={15} style={{ color: 'var(--theme-text-muted)' }} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Abas de modo */}
          <div
            className="flex gap-1 p-1 rounded-xl"
            style={{ background: 'var(--theme-surface)' }}
          >
            <button
              className={tabCls(mode === 'percentual')}
              style={mode === 'percentual' ? { background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' } : {}}
              onClick={() => { setMode('percentual'); setInputValue('') }}
            >
              <Percent size={12} />
              Percentual
            </button>
            <button
              className={tabCls(mode === 'valor')}
              style={mode === 'valor' ? { background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' } : {}}
              onClick={() => { setMode('valor'); setInputValue('') }}
            >
              <DollarSign size={12} />
              Valor
            </button>
            <button
              className={tabCls(mode === 'valor_final')}
              style={mode === 'valor_final' ? { background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' } : {}}
              onClick={() => { setMode('valor_final'); setInputValue('') }}
            >
              <Equal size={12} />
              Valor Final
            </button>
          </div>

          {/* Input de entrada */}
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">
              {mode === 'percentual' && 'Percentual (positivo = aumento, negativo = desconto)'}
              {mode === 'valor' && 'Valor do ajuste em R$ (negativo = desconto)'}
              {mode === 'valor_final' && 'Valor final negociado em R$'}
            </label>
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                {mode === 'percentual' ? '%' : 'R$'}
              </span>
              <input
                type="number"
                step={mode === 'percentual' ? '0.01' : '1'}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={mode === 'percentual' ? '-5,00' : mode === 'valor' ? '-3.125,00' : formatCurrency(precoCalculado).replace('R$ ', '')}
                className={inputCls}
                style={{
                  paddingLeft: '2.25rem',
                  borderColor: 'var(--theme-input-border)',
                }}
                autoFocus
              />
            </div>
          </div>

          {/* Preview */}
          <div
            className="rounded-xl p-4 space-y-2"
            style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-card-border)' }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35 mb-3">Preview</p>

            <div className="flex justify-between items-center">
              <span className="text-xs text-white/50">Valor Calculado</span>
              <span className="text-xs text-white/70 font-medium">{formatCurrency(precoCalculado)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs text-white/50">Ajuste</span>
              <span
                className="text-xs font-medium"
                style={{
                  color: preview.ajuste_valor < 0
                    ? 'rgba(248,113,113,0.9)'
                    : preview.ajuste_valor > 0
                    ? 'rgba(52,211,153,0.9)'
                    : 'var(--theme-text-muted)',
                }}
              >
                {inputValue
                  ? `${formatSignedCurrency(preview.ajuste_valor)} (${formatSignedPct(preview.ajuste_percentual)})`
                  : '—'}
              </span>
            </div>

            <div
              className="flex justify-between items-center pt-2"
              style={{ borderTop: '1px solid var(--theme-border)' }}
            >
              <span className="text-xs font-semibold text-white">Valor Final</span>
              <span
                className="text-sm font-bold"
                style={{ color: 'var(--theme-accent)' }}
              >
                {inputValue ? formatCurrency(preview.preco_final) : formatCurrency(precoCalculado)}
              </span>
            </div>
          </div>

          {/* Justificativa */}
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">
              Justificativa <span className="text-red-400">*</span>
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Negociação comercial — cliente parceiro estratégico"
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none border focus:border-white/30 bg-white/5 resize-none"
              style={{ borderColor: 'var(--theme-input-border)' }}
            />
          </div>

          {validationError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {validationError}
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid var(--theme-border)' }}
        >
          {hasAjuste && (
            <button
              onClick={() => { onRemove(); onClose() }}
              className="text-xs text-red-400/70 hover:text-red-400 transition-colors mr-auto"
            >
              Remover ajuste
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs text-white/50 border border-white/10 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
            style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}
          >
            Aplicar Ajuste
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}
