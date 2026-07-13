'use client'

import { useState, useTransition } from 'react'
import type { Colaborador } from '@/lib/colaboradores/queries'
import { createColaborador, removeColaborador, resetColaboradorPassword } from '@/lib/colaboradores/actions'
import { Eye, EyeOff, Key } from 'lucide-react'

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/60'
const labelCls = 'block text-xs text-white/50 mb-1'
const cardCls = 'rounded-2xl border border-white/10 p-5 space-y-4'
const cardStyle = { background: 'var(--theme-surface)' }

const MODULES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'leads', label: 'CRM / Leads' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'contratos', label: 'Contratos' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'projetos', label: 'Projetos' },
  { key: 'compras', label: 'Compras' },
  { key: 'comissoes', label: 'Comissões' },
  { key: 'entrega_material', label: 'Entrega do Material' },
  { key: 'obra', label: 'Obra' },
  { key: 'entrega_obra', label: 'Entrega da Obra' },
  { key: 'pos_obra', label: 'Pós-Obra' },
  { key: 'relatorios', label: 'Relatórios' },
  { key: 'estoque', label: 'Estoque' },
  { key: 'treinamento', label: 'Treinamento' },
  { key: 'configuracoes', label: 'Configurações' },
  { key: 'catalogo_kits', label: 'Catálogo de Kits' },
  { key: 'ver_precificacao', label: 'Ver Precificação de Propostas' },
]

const PERM_COLS = [
  { key: 'access', label: 'Acessar' },
  { key: 'view_all', label: 'Ver todos' },
  { key: 'add', label: 'Adicionar' },
  { key: 'edit', label: 'Editar' },
  { key: 'delete', label: 'Excluir' },
  { key: 'export', label: 'Exportar' },
] as const

type PermKey = typeof PERM_COLS[number]['key']
type PermRow = Record<PermKey, boolean>
type Permissions = Record<string, PermRow>

const ROLE_LABELS: Record<string, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
  instalador: 'Instalador',
  projetista: 'Projetista',
  financeiro: 'Financeiro',
  compras: 'Compras / Logística',
}

const ALL: PermRow      = { access: true,  view_all: true,  add: true,  edit: true,  delete: true,  export: true  }
const VIEW: PermRow     = { access: true,  view_all: true,  add: false, edit: false, delete: false, export: false }
const VIEW_EXP: PermRow = { access: true,  view_all: true,  add: false, edit: false, delete: false, export: true  }
const VIEW_EDIT: PermRow= { access: true,  view_all: true,  add: false, edit: true,  delete: false, export: false }
const VIEW_ADD: PermRow = { access: true,  view_all: true,  add: true,  edit: false, delete: false, export: false }
const OWN_ALL: PermRow  = { access: true,  view_all: false, add: true,  edit: true,  delete: true,  export: false }
const ACCESS: PermRow   = { access: true,  view_all: false, add: false, edit: false, delete: false, export: false }
const NONE: PermRow     = { access: false, view_all: false, add: false, edit: false, delete: false, export: false }

const ROLE_PROFILES: Record<string, Permissions> = {
  admin: Object.fromEntries(MODULES.map((m) => [m.key, ALL])),
  gerente: {
    dashboard: ALL,
    leads: ALL,
    clientes: ALL,
    contratos: ALL,
    financeiro: VIEW_EXP,
    projetos: ALL,
    compras: ALL,
    comissoes: VIEW_EDIT,
    entrega_material: ALL,
    obra: ALL,
    entrega_obra: ALL,
    pos_obra: ALL,
    relatorios: VIEW_EXP,
    estoque: VIEW,
    treinamento: VIEW,
    configuracoes: NONE,
    catalogo_kits: VIEW,
    ver_precificacao: ALL,
  },
  vendedor: {
    dashboard: ACCESS,
    leads: OWN_ALL,
    clientes: VIEW_EDIT,
    contratos: VIEW_EDIT,
    financeiro: NONE,
    projetos: VIEW,
    compras: NONE,
    comissoes: { ...VIEW, view_all: false },
    entrega_material: VIEW,
    obra: VIEW,
    entrega_obra: VIEW,
    pos_obra: VIEW,
    relatorios: NONE,
    estoque: NONE,
    treinamento: VIEW,
    configuracoes: NONE,
    catalogo_kits: VIEW,
    ver_precificacao: ACCESS,
  },
  projetista: {
    dashboard: ACCESS,
    leads: NONE,
    clientes: VIEW_EDIT,
    contratos: VIEW,
    financeiro: NONE,
    projetos: ALL,
    compras: VIEW_ADD,
    comissoes: NONE,
    entrega_material: VIEW,
    obra: VIEW,
    entrega_obra: VIEW,
    pos_obra: VIEW,
    relatorios: NONE,
    estoque: VIEW,
    treinamento: VIEW,
    configuracoes: NONE,
    catalogo_kits: VIEW_EDIT,
    ver_precificacao: NONE,
  },
  instalador: {
    dashboard: ACCESS,
    leads: NONE,
    clientes: { ...VIEW, view_all: false },
    contratos: VIEW,
    financeiro: NONE,
    projetos: VIEW,
    compras: VIEW,
    comissoes: NONE,
    entrega_material: VIEW,
    obra: ALL,
    entrega_obra: VIEW_ADD,
    pos_obra: VIEW_ADD,
    relatorios: NONE,
    estoque: NONE,
    treinamento: VIEW,
    configuracoes: NONE,
    catalogo_kits: NONE,
    ver_precificacao: NONE,
  },
  financeiro: {
    dashboard: ACCESS,
    leads: NONE,
    clientes: VIEW,
    contratos: VIEW,
    financeiro: ALL,
    projetos: VIEW,
    compras: VIEW,
    comissoes: ALL,
    entrega_material: VIEW,
    obra: VIEW,
    entrega_obra: VIEW,
    pos_obra: VIEW,
    relatorios: VIEW_EXP,
    estoque: NONE,
    treinamento: VIEW,
    configuracoes: NONE,
    catalogo_kits: NONE,
    ver_precificacao: NONE,
  },
  compras: {
    dashboard: ACCESS,
    leads: NONE,
    clientes: VIEW,
    contratos: VIEW,
    financeiro: VIEW,
    projetos: VIEW,
    compras: ALL,
    comissoes: NONE,
    entrega_material: ALL,
    obra: VIEW,
    entrega_obra: VIEW,
    pos_obra: NONE,
    relatorios: NONE,
    estoque: ALL,
    treinamento: VIEW,
    configuracoes: NONE,
    catalogo_kits: VIEW,
    ver_precificacao: NONE,
  },
}

const defaultPermissions = (): Permissions =>
  Object.fromEntries(
    MODULES.map((m) => [m.key, { ...NONE }])
  )

function getProfilePermissions(role: string): Permissions {
  const profile = ROLE_PROFILES[role]
  if (!profile) return defaultPermissions()
  return Object.fromEntries(MODULES.map((m) => [m.key, { ...(profile[m.key] ?? NONE) }]))
}

export default function AcessoTab({ colaboradores: initial }: { colaboradores: Colaborador[] }) {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>(initial)
  const [removePending, startRemove] = useTransition()
  const [resetResult, setResetResult] = useState<{ userId: string; password: string } | null>(null)
  const [resetPending, startReset] = useTransition()

  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'vendedor' })
  const [showPassword, setShowPassword] = useState(false)
  const [permissions, setPermissions] = useState<Permissions>(getProfilePermissions('vendedor'))

  function handleRoleChange(role: string) {
    setForm((p) => ({ ...p, role }))
    setPermissions(getProfilePermissions(role))
  }
  const [addPending, startAdd] = useTransition()
  const [addResult, setAddResult] = useState<{ error?: string; success?: string } | null>(null)

  function handleRemove(id: string, user_id: string) {
    if (!window.confirm('Remover colaborador?')) return
    startRemove(async () => {
      const res = await removeColaborador(id, user_id)
      if (res.success) setColaboradores((prev) => prev.filter((c) => c.id !== id))
    })
  }

  function handleResetPassword(userId: string) {
    if (!window.confirm('Redefinir a senha deste colaborador? Uma nova senha temporária será gerada.')) return
    setResetResult(null)
    startReset(async () => {
      const res = await resetColaboradorPassword(userId)
      if (res.newPassword) setResetResult({ userId, password: res.newPassword })
    })
  }

  function togglePerm(moduleKey: string, permKey: PermKey, value: boolean) {
    setPermissions((prev) => ({ ...prev, [moduleKey]: { ...prev[moduleKey], [permKey]: value } }))
  }

  function toggleAllInCol(permKey: PermKey, value: boolean) {
    setPermissions((prev) => {
      const next = { ...prev }
      MODULES.forEach((m) => { next[m.key] = { ...next[m.key], [permKey]: value } })
      return next
    })
  }

  function isColChecked(permKey: PermKey) {
    return MODULES.every((m) => permissions[m.key][permKey])
  }

  function handleAdd() {
    setAddResult(null)
    startAdd(async () => {
      const res = await createColaborador({ full_name: form.full_name, email: form.email, password: form.password, role: form.role, permissions })
      setAddResult(res)
      if (res.success) {
        setForm({ full_name: '', email: '', password: '', role: 'vendedor' })
        setPermissions(getProfilePermissions('vendedor'))
        window.location.reload()
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Lista de Colaboradores */}
      <div className={cardCls} style={cardStyle}>
        <h2 className="text-base font-semibold text-white">Colaboradores</h2>

        {colaboradores.length === 0 ? (
          <p className="text-white/40 text-sm">Nenhum colaborador cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 pr-4 text-white/50 font-medium">Nome</th>
                  <th className="text-left py-2 pr-4 text-white/50 font-medium">E-mail</th>
                  <th className="text-left py-2 pr-4 text-white/50 font-medium">Função</th>
                  <th className="text-left py-2 text-white/50 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {colaboradores.map((c) => (
                  <tr key={c.id} className="border-b border-white/5">
                    <td className="py-2.5 pr-4 text-white">{c.full_name || '—'}</td>
                    <td className="py-2.5 pr-4 text-white/70">{c.email || '—'}</td>
                    <td className="py-2.5 pr-4 text-white/70">{ROLE_LABELS[c.role] ?? c.role}</td>
                    <td className="py-2.5">
                      {c.role !== 'owner' && (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleResetPassword(c.user_id)}
                            disabled={resetPending}
                            className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors disabled:opacity-40"
                            title="Redefinir senha"
                          >
                            <Key size={12} /> Senha
                          </button>
                          <button
                            className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
                            disabled={removePending}
                            onClick={() => handleRemove(c.id, c.user_id)}
                          >
                            Remover
                          </button>
                        </div>
                      )}
                      {resetResult?.userId === c.user_id && (
                        <div className="mt-1.5 px-2 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                          <span className="text-white/50">Nova senha: </span>
                          <span className="font-mono font-semibold text-green-400 select-all">{resetResult.password}</span>
                          <p className="text-white/30 mt-0.5">Copie e envie ao colaborador. Esta senha não será exibida novamente.</p>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adicionar Colaborador */}
      <div className={cardCls} style={cardStyle}>
        <h2 className="text-base font-semibold text-white">Adicionar Colaborador</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nome completo</label>
            <input className={inputCls} value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>E-mail</label>
            <input className={inputCls} type="email" autoComplete="new-password" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Senha</label>
            <div className="relative">
              <input
                className={inputCls}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                style={{ paddingRight: 36 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10 transition-colors"
              >
                {showPassword ? <EyeOff size={14} style={{ color: 'var(--theme-text-subtle)' }} /> : <Eye size={14} style={{ color: 'var(--theme-text-subtle)' }} />}
              </button>
            </div>
          </div>
          <div>
            <label className={labelCls}>Função</label>
            <select className={inputCls} value={form.role} onChange={(e) => handleRoleChange(e.target.value)}>
              <option value="admin">Administrador</option>
              <option value="gerente">Gerente</option>
              <option value="vendedor">Vendedor</option>
              <option value="projetista">Projetista</option>
              <option value="instalador">Instalador</option>
              <option value="financeiro">Financeiro</option>
              <option value="compras">Compras / Logística</option>
            </select>
            <p className="text-[10px] mt-1" style={{ color: 'var(--theme-text-subtle)' }}>
              As permissões são preenchidas automaticamente ao selecionar a função. Você pode ajustá-las manualmente abaixo.
            </p>
          </div>
        </div>

        {/* Permissions grid */}
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 pr-4 text-white/50 font-medium w-40">Módulo</th>
                {PERM_COLS.map((col) => (
                  <th key={col.key} className="py-2 px-3 text-white/50 font-medium text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span>{col.label}</span>
                      <input type="checkbox" checked={isColChecked(col.key)} onChange={(e) => toggleAllInCol(col.key, e.target.checked)} className="accent-yellow-400" title="Marcar todos" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((m) => (
                <tr key={m.key} className="border-b border-white/5">
                  <td className="py-2 pr-4 text-white/70">{m.label}</td>
                  {PERM_COLS.map((col) => (
                    <td key={col.key} className="py-2 px-3 text-center">
                      <input type="checkbox" checked={permissions[m.key][col.key]} onChange={(e) => togglePerm(m.key, col.key, e.target.checked)} className="accent-yellow-400" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            className="px-5 py-2 rounded-lg font-semibold text-sm transition-opacity disabled:opacity-50"
            style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}
            disabled={addPending}
            onClick={handleAdd}
          >
            {addPending ? 'Criando...' : 'Criar Colaborador'}
          </button>
          {addResult?.error && <p className="text-red-400 text-xs">{addResult.error}</p>}
          {addResult?.success && <p className="text-green-400 text-xs">{addResult.success}</p>}
        </div>
      </div>
    </div>
  )
}
