'use client'

import { useState, useTransition } from 'react'
import type { Colaborador } from '@/lib/colaboradores/queries'
import {
  createColaborador,
  removeColaborador,
  resetColaboradorPassword,
  updateColaboradorPermissions,
} from '@/lib/colaboradores/actions'
import { Eye, EyeOff, Key, ChevronDown, ChevronUp, RotateCcw, Save } from 'lucide-react'

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
  { key: 'ver_precificacao', label: 'Ver Precificação' },
]

const PERM_COLS = [
  {
    key: 'access',
    label: 'Acessar',
    tooltip: 'O módulo aparece no menu e a rota pode ser acessada.',
  },
  {
    key: 'view_all',
    label: 'Ver todos',
    tooltip: 'Vê registros de todos os colaboradores, não só os próprios.',
  },
  {
    key: 'add',
    label: 'Criar',
    tooltip: 'Pode criar novos registros neste módulo.',
  },
  {
    key: 'edit',
    label: 'Editar',
    tooltip: 'Pode editar registros existentes neste módulo.',
  },
  {
    key: 'delete',
    label: 'Excluir',
    tooltip: 'Pode excluir registros permanentemente. Operação irreversível.',
  },
  {
    key: 'export',
    label: 'Exportar',
    tooltip: 'Pode exportar dados (CSV, PDF, ZIP). Controle importante para LGPD.',
  },
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
  Object.fromEntries(MODULES.map((m) => [m.key, { ...NONE }]))

function getProfilePermissions(role: string): Permissions {
  const profile = ROLE_PROFILES[role]
  if (!profile) return defaultPermissions()
  return Object.fromEntries(MODULES.map((m) => [m.key, { ...(profile[m.key] ?? NONE) }]))
}

function normalizePermissions(raw: Record<string, Partial<PermRow>>): Permissions {
  return Object.fromEntries(
    MODULES.map((m) => [m.key, { ...NONE, ...(raw[m.key] ?? {}) }])
  )
}

function countActiveModules(perms: Permissions): number {
  return MODULES.filter((m) => perms[m.key]?.access).length
}

// ── Permissions grid (shared between add form and edit panel) ──────
function PermissionsGrid({
  permissions,
  onToggle,
  onToggleCol,
}: {
  permissions: Permissions
  onToggle: (moduleKey: string, permKey: PermKey, value: boolean) => void
  onToggleCol: (permKey: PermKey, value: boolean) => void
}) {
  function isColChecked(permKey: PermKey) {
    return MODULES.every((m) => permissions[m.key]?.[permKey])
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-2 pr-4 text-white/50 font-medium w-40">Módulo</th>
            {PERM_COLS.map((col) => (
              <th key={col.key} className="py-2 px-2 text-white/50 font-medium text-center min-w-[64px]">
                <div className="flex flex-col items-center gap-1">
                  <span
                    title={col.tooltip}
                    className="cursor-help border-b border-dashed border-white/20"
                    style={{ textUnderlineOffset: 3 }}
                  >
                    {col.label}
                  </span>
                  <input
                    type="checkbox"
                    checked={isColChecked(col.key)}
                    onChange={(e) => onToggleCol(col.key, e.target.checked)}
                    className="accent-yellow-400"
                    title={`Marcar todos: ${col.label}`}
                  />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MODULES.map((m) => (
            <tr key={m.key} className="border-b border-white/5 hover:bg-white/[0.02]">
              <td className="py-2 pr-4 text-white/70">{m.label}</td>
              {PERM_COLS.map((col) => (
                <td
                  key={col.key}
                  className="py-2 px-2 text-center"
                  style={col.key === 'delete' ? { background: 'rgba(239,68,68,0.04)' } : undefined}
                >
                  <input
                    type="checkbox"
                    checked={permissions[m.key]?.[col.key] ?? false}
                    onChange={(e) => onToggle(m.key, col.key, e.target.checked)}
                    className={col.key === 'delete' ? 'accent-red-500' : 'accent-yellow-400'}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Edit panel for existing collaborator ──────────────────────────
function EditPermissionsPanel({
  colaborador,
  onSaved,
  onClose,
}: {
  colaborador: Colaborador
  onSaved: (id: string, perms: Permissions) => void
  onClose: () => void
}) {
  const [permissions, setPermissions] = useState<Permissions>(
    normalizePermissions(colaborador.permissions as Record<string, Partial<PermRow>>)
  )
  const [pending, startSave] = useTransition()
  const [result, setResult] = useState<{ error?: string; success?: string } | null>(null)

  function handleToggle(moduleKey: string, permKey: PermKey, value: boolean) {
    setPermissions((prev) => ({ ...prev, [moduleKey]: { ...prev[moduleKey], [permKey]: value } }))
    setResult(null)
  }

  function handleToggleCol(permKey: PermKey, value: boolean) {
    setPermissions((prev) => {
      const next = { ...prev }
      MODULES.forEach((m) => { next[m.key] = { ...next[m.key], [permKey]: value } })
      return next
    })
    setResult(null)
  }

  function handleResetToProfile() {
    setPermissions(getProfilePermissions(colaborador.role))
    setResult(null)
  }

  function handleSave() {
    setResult(null)
    startSave(async () => {
      const res = await updateColaboradorPermissions(colaborador.id, permissions)
      setResult(res)
      if (res.success) onSaved(colaborador.id, permissions)
    })
  }

  return (
    <div className="mt-3 pt-4 border-t border-white/10 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/50">
          Editando permissões de <span className="text-white font-semibold">{colaborador.full_name || colaborador.email}</span>
        </p>
        <button
          onClick={handleResetToProfile}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors"
          title={`Redefinir para o padrão de ${ROLE_LABELS[colaborador.role] ?? colaborador.role}`}
        >
          <RotateCcw size={12} />
          Redefinir para padrão
        </button>
      </div>

      <PermissionsGrid
        permissions={permissions}
        onToggle={handleToggle}
        onToggleCol={handleToggleCol}
      />

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={pending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-opacity disabled:opacity-50"
          style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}
        >
          <Save size={14} />
          {pending ? 'Salvando...' : 'Salvar permissões'}
        </button>
        <button
          onClick={onClose}
          className="text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          Cancelar
        </button>
        {result?.error && <p className="text-red-400 text-xs">{result.error}</p>}
        {result?.success && <p className="text-green-400 text-xs">{result.success}</p>}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────
export default function AcessoTab({ colaboradores: initial }: { colaboradores: Colaborador[] }) {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>(initial)
  const [removePending, startRemove] = useTransition()
  const [resetResult, setResetResult] = useState<{ userId: string; password: string } | null>(null)
  const [resetPending, startReset] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)

  // Add form state
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'vendedor' })
  const [showPassword, setShowPassword] = useState(false)
  const [permissions, setPermissions] = useState<Permissions>(getProfilePermissions('vendedor'))
  const [addPending, startAdd] = useTransition()
  const [addResult, setAddResult] = useState<{ error?: string; success?: string } | null>(null)

  function handleRoleChange(role: string) {
    setForm((p) => ({ ...p, role }))
    setPermissions(getProfilePermissions(role))
  }

  function handleRemove(id: string, user_id: string) {
    if (!window.confirm('Remover colaborador? Esta ação não pode ser desfeita.')) return
    startRemove(async () => {
      const res = await removeColaborador(id, user_id)
      if (res.success) {
        setColaboradores((prev) => prev.filter((c) => c.id !== id))
        if (editingId === id) setEditingId(null)
      }
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

  function handlePermsSaved(id: string, perms: Permissions) {
    setColaboradores((prev) =>
      prev.map((c) => (c.id === id ? { ...c, permissions: perms } : c))
    )
  }

  function handleAdd() {
    setAddResult(null)
    startAdd(async () => {
      const res = await createColaborador({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        role: form.role,
        permissions,
      })
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
      {/* ── Lista de Colaboradores ────────────────────────────── */}
      <div className={cardCls} style={cardStyle}>
        <h2 className="text-base font-semibold text-white">Colaboradores</h2>

        {colaboradores.length === 0 ? (
          <p className="text-white/40 text-sm">Nenhum colaborador cadastrado.</p>
        ) : (
          <div className="space-y-0">
            {colaboradores.map((c) => {
              const normalizedPerms = normalizePermissions(
                c.permissions as Record<string, Partial<PermRow>>
              )
              const activeCount = countActiveModules(normalizedPerms)
              const isEditing = editingId === c.id

              return (
                <div key={c.id} className="border-b border-white/5 last:border-0">
                  {/* Row */}
                  <div className="flex items-center gap-3 py-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{c.full_name || '—'}</p>
                      <p className="text-xs text-white/50 truncate">{c.email}</p>
                    </div>
                    <div className="text-xs px-2 py-0.5 rounded-full border border-white/10 text-white/60 whitespace-nowrap">
                      {ROLE_LABELS[c.role] ?? c.role}
                    </div>
                    <div
                      className="text-xs text-white/40 whitespace-nowrap"
                      title={`${activeCount} de ${MODULES.length} módulos com acesso`}
                    >
                      {activeCount}/{MODULES.length} módulos
                    </div>

                    {c.role !== 'owner' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingId(isEditing ? null : c.id)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors"
                        >
                          {isEditing ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          {isEditing ? 'Fechar' : 'Permissões'}
                        </button>
                        <button
                          onClick={() => handleResetPassword(c.user_id)}
                          disabled={resetPending}
                          className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors disabled:opacity-40"
                          title="Redefinir senha"
                        >
                          <Key size={12} />
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
                  </div>

                  {/* Reset password result */}
                  {resetResult?.userId === c.user_id && (
                    <div className="mb-3 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <span className="text-white/50">Nova senha: </span>
                      <span className="font-mono font-semibold text-green-400 select-all">{resetResult.password}</span>
                      <p className="text-white/30 mt-0.5">Copie e envie ao colaborador. Não será exibida novamente.</p>
                    </div>
                  )}

                  {/* Edit panel */}
                  {isEditing && (
                    <EditPermissionsPanel
                      colaborador={{ ...c, permissions: normalizedPerms }}
                      onSaved={handlePermsSaved}
                      onClose={() => setEditingId(null)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Adicionar Colaborador ─────────────────────────────── */}
      <div className={cardCls} style={cardStyle}>
        <h2 className="text-base font-semibold text-white">Adicionar Colaborador</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nome completo</label>
            <input
              className={inputCls}
              value={form.full_name}
              onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelCls}>E-mail</label>
            <input
              className={inputCls}
              type="email"
              autoComplete="new-password"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />
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
                {showPassword
                  ? <EyeOff size={14} style={{ color: 'var(--theme-text-subtle)' }} />
                  : <Eye size={14} style={{ color: 'var(--theme-text-subtle)' }} />}
              </button>
            </div>
          </div>
          <div>
            <label className={labelCls}>Função</label>
            <div className="flex gap-2">
              <select
                className={inputCls}
                value={form.role}
                onChange={(e) => handleRoleChange(e.target.value)}
              >
                <option value="admin">Administrador</option>
                <option value="gerente">Gerente</option>
                <option value="vendedor">Vendedor</option>
                <option value="projetista">Projetista</option>
                <option value="instalador">Instalador</option>
                <option value="financeiro">Financeiro</option>
                <option value="compras">Compras / Logística</option>
              </select>
              <button
                type="button"
                onClick={() => setPermissions(getProfilePermissions(form.role))}
                title="Redefinir permissões para o padrão desta função"
                className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors text-xs whitespace-nowrap"
              >
                <RotateCcw size={12} />
                Padrão
              </button>
            </div>
            <p className="text-[10px] mt-1" style={{ color: 'var(--theme-text-subtle)' }}>
              Permissões preenchidas automaticamente. Ajuste abaixo se necessário.
            </p>
          </div>
        </div>

        <PermissionsGrid
          permissions={permissions}
          onToggle={(moduleKey, permKey, value) =>
            setPermissions((prev) => ({ ...prev, [moduleKey]: { ...prev[moduleKey], [permKey]: value } }))
          }
          onToggleCol={(permKey, value) =>
            setPermissions((prev) => {
              const next = { ...prev }
              MODULES.forEach((m) => { next[m.key] = { ...next[m.key], [permKey]: value } })
              return next
            })
          }
        />

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
