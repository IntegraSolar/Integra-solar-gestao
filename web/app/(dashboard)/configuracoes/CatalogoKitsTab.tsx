'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  getKits, createKit, updateKit, deleteKit, duplicateKit, toggleKitStatus,
  type Kit, type KitInput,
} from '@/lib/catalogo/kit-actions'
import { formatCurrency } from '@/lib/format'

const inputCls = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/60'
const labelCls = 'block text-xs text-white/50 mb-1'

function emptyInput(): KitInput {
  return {
    name: '', code: '', description: '', status: 'ativo',
    panel_brand: '', panel_model: '', panel_power_w: null, panel_qty: 0,
    inverter_brand: '', inverter_model: '', inverter_power_w: null, inverter_qty: 0,
    kit_value: 0, km_rodados: 0, supplier_name: '',
  }
}

type FormMode = 'create' | 'edit'

export default function CatalogoKitsTab() {
  const [kits, setKits] = useState<Kit[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<FormMode>('create')
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<KitInput>(emptyInput())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function reload() {
    setLoading(true)
    const data = await getKits()
    setKits(data)
    setLoading(false)
  }

  useEffect(() => { reload() }, [])

  function openCreate() {
    setForm(emptyInput())
    setFormMode('create')
    setEditId(null)
    setError(null)
    setShowForm(true)
  }

  function openEdit(kit: Kit) {
    setForm({
      name: kit.name,
      code: kit.code ?? '',
      description: kit.description ?? '',
      status: kit.status,
      panel_brand: kit.panel_brand ?? '',
      panel_model: kit.panel_model ?? '',
      panel_power_w: kit.panel_power_w,
      panel_qty: kit.panel_qty,
      inverter_brand: kit.inverter_brand ?? '',
      inverter_model: kit.inverter_model ?? '',
      inverter_power_w: kit.inverter_power_w,
      inverter_qty: kit.inverter_qty,
      kit_value: kit.kit_value,
      km_rodados: kit.km_rodados,
      supplier_name: kit.supplier_name ?? '',
    })
    setFormMode('edit')
    setEditId(kit.id)
    setError(null)
    setShowForm(true)
  }

  function setField<K extends keyof KitInput>(key: K, value: KitInput[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleSubmit() {
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return }
    setError(null)
    startTransition(async () => {
      const input: KitInput = {
        ...form,
        code: form.code || null,
        description: form.description || null,
        supplier_name: form.supplier_name || null,
        panel_brand: form.panel_brand || null,
        panel_model: form.panel_model || null,
        inverter_brand: form.inverter_brand || null,
        inverter_model: form.inverter_model || null,
      }
      const result = formMode === 'create'
        ? await createKit(input)
        : await updateKit(editId!, input)

      if (result.error) { setError(result.error); return }
      setShowForm(false)
      await reload()
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Excluir kit?')) return
    startTransition(async () => {
      await deleteKit(id)
      await reload()
    })
  }

  function handleDuplicate(id: string) {
    startTransition(async () => {
      await duplicateKit(id)
      await reload()
    })
  }

  function handleToggle(kit: Kit) {
    const next = kit.status === 'ativo' ? 'inativo' : 'ativo'
    startTransition(async () => {
      await toggleKitStatus(kit.id, next)
      await reload()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Catálogo de Kits</h2>
          <p className="text-xs text-white/50 mt-0.5">Kits pré-configurados para geração de propostas</p>
        </div>
        <button
          onClick={openCreate}
          className="text-xs px-4 py-2 rounded-lg font-semibold transition-all hover:opacity-90"
          style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}
        >
          + Novo Kit
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl border border-white/10 p-5 space-y-5" style={{ background: 'var(--theme-surface)' }}>
          <h3 className="text-sm font-semibold text-white">{formMode === 'create' ? 'Novo Kit' : 'Editar Kit'}</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Nome *</label>
              <input className={inputCls} value={form.name} onChange={e => setField('name', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Código</label>
              <input className={inputCls} value={form.code ?? ''} onChange={e => setField('code', e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Descrição</label>
            <textarea className={inputCls} rows={2} value={form.description ?? ''} onChange={e => setField('description', e.target.value)} />
          </div>

          {/* Painéis */}
          <div>
            <p className="text-xs font-medium text-white/70 mb-3">Módulos / Painéis</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className={labelCls}>Marca</label>
                <input className={inputCls} value={form.panel_brand ?? ''} onChange={e => setField('panel_brand', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Modelo</label>
                <input className={inputCls} value={form.panel_model ?? ''} onChange={e => setField('panel_model', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Potência (W)</label>
                <input type="number" className={inputCls} value={form.panel_power_w ?? ''} onChange={e => setField('panel_power_w', e.target.value ? Number(e.target.value) : null)} />
              </div>
              <div>
                <label className={labelCls}>Quantidade</label>
                <input type="number" className={inputCls} value={form.panel_qty ?? 0} onChange={e => setField('panel_qty', Number(e.target.value))} />
              </div>
            </div>
          </div>

          {/* Inversores */}
          <div>
            <p className="text-xs font-medium text-white/70 mb-3">Inversores</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className={labelCls}>Marca</label>
                <input className={inputCls} value={form.inverter_brand ?? ''} onChange={e => setField('inverter_brand', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Modelo</label>
                <input className={inputCls} value={form.inverter_model ?? ''} onChange={e => setField('inverter_model', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Potência (W)</label>
                <input type="number" className={inputCls} value={form.inverter_power_w ?? ''} onChange={e => setField('inverter_power_w', e.target.value ? Number(e.target.value) : null)} />
              </div>
              <div>
                <label className={labelCls}>Quantidade</label>
                <input type="number" className={inputCls} value={form.inverter_qty ?? 0} onChange={e => setField('inverter_qty', Number(e.target.value))} />
              </div>
            </div>
          </div>

          {/* Precificação */}
          <div>
            <p className="text-xs font-medium text-white/70 mb-3">Precificação</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Custo do Kit (R$)</label>
                <input type="number" className={inputCls} value={form.kit_value ?? 0} onChange={e => setField('kit_value', Number(e.target.value))} />
              </div>
              <div>
                <label className={labelCls}>KM Rodados</label>
                <input type="number" className={inputCls} value={form.km_rodados ?? 0} onChange={e => setField('km_rodados', Number(e.target.value))} />
              </div>
              <div>
                <label className={labelCls}>Fornecedor</label>
                <input className={inputCls} value={form.supplier_name ?? ''} onChange={e => setField('supplier_name', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className={labelCls + ' mb-0'}>Status</label>
            <select
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              value={form.status ?? 'ativo'}
              onChange={e => setField('status', e.target.value as 'ativo' | 'inativo')}
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="text-xs px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
              style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}
            >
              {isPending ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-xs px-4 py-2 rounded-lg text-white/50 hover:text-white">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-sm text-white/40 text-center py-8">Carregando...</p>
      ) : kits.length === 0 ? (
        <p className="text-sm text-white/40 text-center py-8">Nenhum kit cadastrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['Nome', 'Potência', 'Geração/mês', 'Preço Final', 'Fornecedor', 'Status', ''].map(h => (
                  <th key={h} className="text-left text-xs text-white/40 py-3 px-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {kits.map(kit => (
                <tr key={kit.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="py-3 px-2">
                    <p className="font-medium text-white">{kit.name}</p>
                    {kit.code && <p className="text-xs text-white/40">{kit.code}</p>}
                  </td>
                  <td className="py-3 px-2 text-white/70">
                    {kit.total_power_kwp ? `${kit.total_power_kwp.toFixed(2)} kWp` : '—'}
                  </td>
                  <td className="py-3 px-2 text-white/70">
                    {kit.monthly_generation_kwh ? `${kit.monthly_generation_kwh.toFixed(0)} kWh` : '—'}
                  </td>
                  <td className="py-3 px-2 font-semibold" style={{ color: 'var(--theme-accent)' }}>
                    {kit.sale_price ? formatCurrency(kit.sale_price) : '—'}
                  </td>
                  <td className="py-3 px-2 text-white/50 text-xs">{kit.supplier_name ?? '—'}</td>
                  <td className="py-3 px-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={kit.status === 'ativo'
                        ? { background: 'rgba(16,185,129,0.15)', color: '#10B981' }
                        : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.30)' }
                      }
                    >
                      {kit.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(kit)} className="text-xs text-white/50 hover:text-white px-2 py-1 rounded">Editar</button>
                      <button onClick={() => handleDuplicate(kit.id)} disabled={isPending} className="text-xs text-white/50 hover:text-white px-2 py-1 rounded disabled:opacity-40">Duplicar</button>
                      <button
                        onClick={() => handleToggle(kit)}
                        disabled={isPending}
                        className="text-xs px-2 py-1 rounded disabled:opacity-40"
                        style={{ color: kit.status === 'ativo' ? 'rgba(239,68,68,0.70)' : 'rgba(16,185,129,0.80)' }}
                      >
                        {kit.status === 'ativo' ? 'Desativar' : 'Ativar'}
                      </button>
                      <button onClick={() => handleDelete(kit.id)} disabled={isPending} className="text-xs text-red-400/50 hover:text-red-400 px-2 py-1 rounded disabled:opacity-40">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
