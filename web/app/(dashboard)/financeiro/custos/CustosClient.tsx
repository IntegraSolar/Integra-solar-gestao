'use client'

import { useState, useMemo, useTransition } from 'react'
import { createCost, updateCost, deleteCost, COST_CATEGORIES } from '@/lib/financeiro/costs-actions'
import type { ProjectCost, UpsertCostData } from '@/lib/financeiro/costs-actions'
import { formatCurrency, formatDate } from '@/lib/format'
import { Plus, Pencil, Trash2, X, BarChart2 } from 'lucide-react'
import Link from 'next/link'

const inputCls = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/60'
const labelCls = 'block text-xs text-white/50 mb-1'

type ClientOption = { id: string; name: string; city: string | null }

function CostForm({
  clients,
  initial,
  onSave,
  onCancel,
  saving,
}: {
  clients: ClientOption[]
  initial?: Partial<UpsertCostData>
  onSave: (data: UpsertCostData) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<UpsertCostData>({
    client_id: initial?.client_id ?? '',
    description: initial?.description ?? '',
    category: initial?.category ?? 'Equipamentos',
    amount: initial?.amount ?? 0,
    cost_date: initial?.cost_date ?? new Date().toISOString().slice(0, 10),
    notes: initial?.notes ?? '',
  })

  return (
    <div className="rounded-2xl border border-white/10 p-5 space-y-4" style={{ background: 'var(--theme-surface)' }}>
      <h3 className="text-sm font-semibold text-white/70">{initial?.description ? 'Editar custo' : 'Novo custo'}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelCls}>Projeto / Cliente *</label>
          <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} className={inputCls}>
            <option value="">Selecionar projeto...</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}{c.city ? ` — ${c.city}` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Categoria *</label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
            {COST_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Data *</label>
          <input type="date" value={form.cost_date} onChange={e => setForm(f => ({ ...f, cost_date: e.target.value }))} className={inputCls} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Descrição *</label>
          <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls} placeholder="Ex: Inversores Growatt 10kW" />
        </div>
        <div>
          <label className={labelCls}>Valor (R$) *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount || ''}
            onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))}
            className={inputCls}
            placeholder="0,00"
          />
        </div>
        <div>
          <label className={labelCls}>Observações</label>
          <input type="text" value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} placeholder="Opcional" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white/80 transition-colors">
          Cancelar
        </button>
        <button
          type="button"
          disabled={saving || !form.client_id || !form.description || !form.amount}
          onClick={() => onSave(form)}
          className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-opacity"
          style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

export default function CustosClient({ costs: initial, clients }: { costs: ProjectCost[]; clients: ClientOption[] }) {
  const [costs, setCosts] = useState<ProjectCost[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ProjectCost | null>(null)
  const [search, setSearch] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return costs.filter(c => {
      if (filterClient && c.client_id !== filterClient) return false
      if (filterCategory && c.category !== filterCategory) return false
      if (filterFrom && c.cost_date < filterFrom) return false
      if (filterTo && c.cost_date > filterTo) return false
      if (search) {
        const q = search.toLowerCase()
        if (!c.description.toLowerCase().includes(q) && !c.client_name.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [costs, search, filterClient, filterCategory, filterFrom, filterTo])

  const totalFiltered = filtered.reduce((s, c) => s + c.amount, 0)

  async function handleCreate(data: UpsertCostData) {
    setError(null)
    startTransition(async () => {
      const result = await createCost(data)
      if (result.error) { setError(result.error); return }
      const clientName = clients.find(c => c.id === data.client_id)?.name ?? '—'
      const newCost: ProjectCost = { id: crypto.randomUUID(), client_name: clientName, created_at: new Date().toISOString(), ...data, amount: Number(data.amount) }
      setCosts(prev => [newCost, ...prev])
      setShowForm(false)
    })
  }

  async function handleUpdate(data: UpsertCostData) {
    if (!editing) return
    setError(null)
    startTransition(async () => {
      const result = await updateCost(editing.id, data)
      if (result.error) { setError(result.error); return }
      setCosts(prev => prev.map(c => c.id === editing.id ? { ...c, ...data, amount: Number(data.amount) } : c))
      setEditing(null)
    })
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Remover este custo?')) return
    setDeletingId(id)
    const result = await deleteCost(id)
    if (result.error) setError(result.error)
    else setCosts(prev => prev.filter(c => c.id !== id))
    setDeletingId(null)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 flex-shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid var(--theme-border)' }}>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>Custos do Projeto</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-subtle)' }}>{costs.length} lançamentos</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/financeiro/dre"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
            style={{ color: 'var(--theme-accent)', border: '1px solid var(--theme-border)' }}
          >
            <BarChart2 size={13} /> Ver DRE Geral
          </Link>
          <button
            type="button"
            onClick={() => { setShowForm(true); setEditing(null) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
            style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}
          >
            <Plus size={13} /> Novo custo
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
        {/* Form */}
        {showForm && !editing && (
          <CostForm clients={clients} onSave={handleCreate} onCancel={() => setShowForm(false)} saving={isPending} />
        )}

        {error && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">{error}</p>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-yellow-400/60 w-48"
          />
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none w-48">
            <option value="">Todos os projetos</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none">
            <option value="">Todas as categorias</option>
            {COST_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none" />
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none" />
          {(search || filterClient || filterCategory || filterFrom || filterTo) && (
            <button type="button" onClick={() => { setSearch(''); setFilterClient(''); setFilterCategory(''); setFilterFrom(''); setFilterTo('') }} className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1">
              <X size={12} /> Limpar
            </button>
          )}
          <span className="ml-auto text-sm font-semibold" style={{ color: 'var(--theme-accent)' }}>
            Total: {formatCurrency(totalFiltered)}
          </span>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--theme-surface)', borderBottom: '1px solid var(--theme-border)' }}>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40">Data</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40">Projeto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40">Categoria</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40">Descrição</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-white/40">Valor</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-sm" style={{ color: 'var(--theme-text-subtle)' }}>
                    Nenhum custo encontrado.
                  </td>
                </tr>
              )}
              {filtered.map(cost => (
                editing?.id === cost.id ? (
                  <tr key={cost.id}>
                    <td colSpan={6} className="p-3">
                      <CostForm
                        clients={clients}
                        initial={{ client_id: cost.client_id, description: cost.description, category: cost.category, amount: cost.amount, cost_date: cost.cost_date, notes: cost.notes }}
                        onSave={handleUpdate}
                        onCancel={() => setEditing(null)}
                        saving={isPending}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={cost.id} style={{ borderBottom: '1px solid var(--theme-border)' }}>
                    <td className="px-4 py-3 text-white/60 whitespace-nowrap">{formatDate(cost.cost_date)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/financeiro/dre/${cost.client_id}`} className="text-sm font-medium hover:underline" style={{ color: 'var(--theme-text)' }}>
                        {cost.client_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--theme-input-bg)', color: 'var(--theme-text-muted)' }}>
                        {cost.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/80">{cost.description}{cost.notes && <span className="text-white/30 ml-2 text-xs">({cost.notes})</span>}</td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ color: 'var(--theme-accent)' }}>{formatCurrency(cost.amount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button type="button" onClick={() => setEditing(cost)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors">
                          <Pencil size={12} />
                        </button>
                        <button type="button" onClick={() => handleDelete(cost.id)} disabled={deletingId === cost.id} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors disabled:opacity-50">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
