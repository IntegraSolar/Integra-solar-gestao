'use client'

import { useState, useTransition } from 'react'
import type { StockItem } from '@/lib/estoque/queries'
import { createStockItem, updateStockItem, deleteStockItem } from '@/lib/estoque/actions'
import { formatCurrency } from '@/lib/format'
import { CurrencyInput } from '@/components/ui/inputs'

type FormData = {
  name: string
  quantity: string
  unit_value: string
  description: string
}

const EMPTY_FORM: FormData = { name: '', quantity: '', unit_value: '', description: '' }

export default function EstoqueClient({ initialItems }: { initialItems: StockItem[] }) {
  const [items, setItems] = useState(initialItems)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<StockItem | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError(null)
    setShowModal(true)
  }

  function openEdit(item: StockItem) {
    setEditing(item)
    setForm({
      name: item.name,
      quantity: String(item.quantity),
      unit_value: String(item.unit_value),
      description: item.description ?? '',
    })
    setError(null)
    setShowModal(true)
  }

  function handleSave() {
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return }
    const quantity = parseFloat(form.quantity)
    const unit_value = parseFloat(form.unit_value)
    if (isNaN(quantity) || quantity < 0) { setError('Quantidade inválida.'); return }
    if (isNaN(unit_value) || unit_value < 0) { setError('Valor unitário inválido.'); return }

    startTransition(async () => {
      const data = {
        name: form.name.trim(),
        quantity,
        unit_value,
        description: form.description.trim() || null,
      }
      const result = editing
        ? await updateStockItem(editing.id, data)
        : await createStockItem(data)

      if (result.error) { setError(result.error); return }

      if (editing) {
        setItems((prev) => prev.map((i) =>
          i.id === editing.id
            ? { ...i, ...data, total_value: quantity * unit_value }
            : i
        ))
        setShowModal(false)
      } else {
        window.location.reload()
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteStockItem(id)
      if (result.error) { setError(result.error); return }
      setItems((prev) => prev.filter((i) => i.id !== id))
      setConfirmDelete(null)
    })
  }

  const totalEstoque = items.reduce((s, i) => s + i.total_value, 0)

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Estoque</h1>
          <p className="text-sm text-white/40 mt-0.5">
            {items.length} {items.length === 1 ? 'item' : 'itens'} · Total: {formatCurrency(totalEstoque)}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}
        >
          + Adicionar Item
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'var(--theme-surface)' }}>
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[580px]">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--theme-border)' }}>
              {['Nome', 'Descrição', 'Quantidade', 'Valor Unit.', 'Valor Total', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-white/40">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-white/30">Nenhum item cadastrado.</td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--theme-border)' }}>
                <td className="px-4 py-3 text-white font-medium">{item.name}</td>
                <td className="px-4 py-3 text-white/50 max-w-xs truncate">{item.description ?? '—'}</td>
                <td className="px-4 py-3 text-white/80">{item.quantity}</td>
                <td className="px-4 py-3 text-white/80">{formatCurrency(item.unit_value)}</td>
                <td className="px-4 py-3 font-semibold" style={{ color: 'var(--theme-accent)' }}>{formatCurrency(item.total_value)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => openEdit(item)}
                      className="text-xs px-3 py-1.5 rounded-lg text-white/60 hover:text-white transition-colors"
                      style={{ background: 'var(--theme-input-bg)' }}
                    >
                      Editar
                    </button>
                    {confirmDelete === item.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={isPending}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white"
                          style={{ background: '#ef4444' }}
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-xs px-3 py-1.5 rounded-lg text-white/40"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(item.id)}
                        className="text-xs px-3 py-1.5 rounded-lg text-red-400/70 hover:text-red-400 transition-colors"
                        style={{ background: 'var(--theme-input-bg)' }}
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 border border-white/10" style={{ background: 'var(--theme-drawer-bg)' }}>
            <h2 className="text-lg font-bold text-white mb-5">
              {editing ? 'Editar Item' : 'Novo Item'}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Nome *</label>
                <input
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none border border-white/10 focus:border-white/30"
                  style={{ background: 'var(--theme-input-bg)' }}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Painel Solar 550W"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Quantidade</label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none border border-white/10 focus:border-white/30"
                    style={{ background: 'var(--theme-input-bg)' }}
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <CurrencyInput
                    label="Valor Unitário (R$)"
                    value={form.unit_value ? parseFloat(form.unit_value) : null}
                    onChange={(v) => setForm({ ...form, unit_value: v.toFixed(2) })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Descrição</label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none border border-white/10 focus:border-white/30 resize-none"
                  style={{ background: 'var(--theme-input-bg)' }}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descrição opcional..."
                />
              </div>
            </div>

            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm text-white/50 border border-white/10 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}
              >
                {isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
