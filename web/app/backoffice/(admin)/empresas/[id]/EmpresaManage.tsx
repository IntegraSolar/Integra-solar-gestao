'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Field, inputCls } from '@/components/backoffice/ui'
import {
  atualizarCadastro,
  redefinirSenhaResponsavel,
  adicionarUsuario,
  removerUsuario,
  impersonarEmpresa,
} from '@/lib/backoffice/empresas/manage-actions'
import type { OrgConfig } from '@/lib/backoffice/empresas/queries'

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-bold text-[#0E1B2A] mb-4">{title}</h3>
        {children}
      </div>
    </div>
  )
}

// ── Editar cadastro ─────────────────────────────────────────────────────────
export function EditarCadastroButton({ orgId, config }: { orgId: string; config: OrgConfig }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [f, setF] = useState<OrgConfig>(config)
  const set = (k: keyof OrgConfig, v: string) => setF((p) => ({ ...p, [k]: v }))

  function save() {
    setError(null)
    start(async () => {
      const r = await atualizarCadastro(orgId, f)
      if (r.error) { setError(r.error); return }
      setOpen(false); router.refresh()
    })
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>Editar cadastro</Button>
      {open && (
        <Modal title="Dados cadastrais" onClose={() => setOpen(false)}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Field label="Razão social"><input className={inputCls} value={f.razao_social ?? ''} onChange={(e) => set('razao_social', e.target.value)} /></Field></div>
            <div className="col-span-2"><Field label="Nome fantasia"><input className={inputCls} value={f.nome_fantasia ?? ''} onChange={(e) => set('nome_fantasia', e.target.value)} /></Field></div>
            <Field label="CNPJ"><input className={inputCls} value={f.cnpj ?? ''} onChange={(e) => set('cnpj', e.target.value)} /></Field>
            <Field label="Telefone"><input className={inputCls} value={f.telefone ?? ''} onChange={(e) => set('telefone', e.target.value)} /></Field>
            <div className="col-span-2"><Field label="E-mail"><input className={inputCls} value={f.email ?? ''} onChange={(e) => set('email', e.target.value)} /></Field></div>
            <Field label="CEP"><input className={inputCls} value={f.cep ?? ''} onChange={(e) => set('cep', e.target.value)} /></Field>
            <Field label="Cidade"><input className={inputCls} value={f.cidade ?? ''} onChange={(e) => set('cidade', e.target.value)} /></Field>
            <div className="col-span-2"><Field label="Endereço"><input className={inputCls} value={f.endereco ?? ''} onChange={(e) => set('endereco', e.target.value)} /></Field></div>
            <Field label="Número"><input className={inputCls} value={f.numero ?? ''} onChange={(e) => set('numero', e.target.value)} /></Field>
            <Field label="Bairro"><input className={inputCls} value={f.bairro ?? ''} onChange={(e) => set('bairro', e.target.value)} /></Field>
            <Field label="Estado (UF)"><input className={inputCls} maxLength={2} value={f.estado ?? ''} onChange={(e) => set('estado', e.target.value.toUpperCase())} /></Field>
          </div>
          {error && <p className="text-sm text-[#C11B1B] mt-3">{error}</p>}
          <div className="flex justify-end gap-3 mt-5">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={save} disabled={isPending}>{isPending ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </Modal>
      )}
    </>
  )
}

// ── Redefinir senha do responsável ──────────────────────────────────────────
export function ResetarSenhaButton({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, start] = useTransition()
  const [senha, setSenha] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ password: string; email: string } | null>(null)

  function run() {
    setError(null)
    start(async () => {
      const r = await redefinirSenhaResponsavel(orgId, senha || undefined)
      if (r.error) { setError(r.error); return }
      setResult({ password: r.password!, email: r.email! })
    })
  }

  return (
    <>
      <Button variant="secondary" onClick={() => { setOpen(true); setResult(null); setSenha('') }}>Redefinir senha</Button>
      {open && (
        <Modal title="Redefinir senha do responsável" onClose={() => setOpen(false)}>
          {result ? (
            <div className="space-y-3">
              <p className="text-sm text-[#45586E]">Senha redefinida para <strong>{result.email}</strong>. Copie e envie ao cliente — ela não será exibida novamente:</p>
              <div className="rounded-xl bg-[#F0F4F8] px-4 py-3 font-mono text-sm text-[#0E1B2A] select-all">{result.password}</div>
              <div className="flex justify-end"><Button variant="primary" onClick={() => setOpen(false)}>Concluir</Button></div>
            </div>
          ) : (
            <>
              <Field label="Nova senha" hint="(deixe vazio para gerar automaticamente)">
                <input className={inputCls} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mín. 8 caracteres" />
              </Field>
              {error && <p className="text-sm text-[#C11B1B] mt-3">{error}</p>}
              <div className="flex justify-end gap-3 mt-5">
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button variant="primary" onClick={run} disabled={isPending}>{isPending ? 'Redefinindo...' : 'Redefinir'}</Button>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  )
}

// ── Adicionar usuário ───────────────────────────────────────────────────────
export function AdicionarUsuarioButton({ orgId }: { orgId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'member' })
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }))

  function save() {
    setError(null)
    start(async () => {
      const r = await adicionarUsuario(orgId, f)
      if (r.error) { setError(r.error); return }
      setOpen(false); setF({ name: '', email: '', password: '', role: 'member' }); router.refresh()
    })
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>+ Usuário</Button>
      {open && (
        <Modal title="Adicionar usuário à empresa" onClose={() => setOpen(false)}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Field label="Nome completo"><input className={inputCls} value={f.name} onChange={(e) => set('name', e.target.value)} /></Field></div>
            <div className="col-span-2"><Field label="E-mail"><input type="email" className={inputCls} value={f.email} onChange={(e) => set('email', e.target.value)} /></Field></div>
            <Field label="Senha"><input className={inputCls} value={f.password} onChange={(e) => set('password', e.target.value)} placeholder="Mín. 8 caracteres" /></Field>
            <Field label="Perfil">
              <select className={inputCls} value={f.role} onChange={(e) => set('role', e.target.value)}>
                <option value="owner">Responsável (owner)</option>
                <option value="admin">Administrador</option>
                <option value="member">Membro</option>
              </select>
            </Field>
          </div>
          {error && <p className="text-sm text-[#C11B1B] mt-3">{error}</p>}
          <div className="flex justify-end gap-3 mt-5">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={save} disabled={isPending}>{isPending ? 'Adicionando...' : 'Adicionar'}</Button>
          </div>
        </Modal>
      )}
    </>
  )
}

export function RemoverUsuarioButton({ orgId, memberId, userId, nome }: { orgId: string; memberId: string; userId: string; nome: string }) {
  const router = useRouter()
  const [isPending, start] = useTransition()
  function run() {
    if (!confirm(`Remover ${nome} desta empresa? A conta de acesso será excluída.`)) return
    start(async () => {
      const r = await removerUsuario(orgId, memberId, userId)
      if (r.error) { alert(r.error); return }
      router.refresh()
    })
  }
  return (
    <button onClick={run} disabled={isPending} className="text-xs font-semibold text-[#C11B1B] hover:text-[#8B1414] disabled:opacity-50 transition-colors">
      {isPending ? '...' : 'Remover'}
    </button>
  )
}

// ── Impersonar ──────────────────────────────────────────────────────────────
export function ImpersonarButton({ orgId }: { orgId: string }) {
  const [isPending, start] = useTransition()
  function run() {
    if (!confirm('Acessar a plataforma como esta empresa? Uma nova aba será aberta com a sessão do responsável.')) return
    start(async () => {
      const r = await impersonarEmpresa(orgId)
      if (r.error) { alert(r.error); return }
      if (r.url) window.open(r.url, '_blank', 'noopener')
    })
  }
  return <Button variant="accent" onClick={run} disabled={isPending}>{isPending ? 'Gerando...' : 'Acessar como empresa'}</Button>
}
