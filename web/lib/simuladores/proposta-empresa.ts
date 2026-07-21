// web/lib/simuladores/proposta-empresa.ts
// Dados cadastrais da empresa para os PDFs. Compartilhado entre os simuladores.
'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

export type EmpresaProposta = {
  nome: string
  cnpj: string | null
  endereco: string | null
  telefone: string | null
  email: string | null
  logoBase64: string | null
}

async function fetchLogoBase64(logoUrl: string | null): Promise<string | null> {
  if (!logoUrl) return null
  try {
    const res = await fetch(logoUrl)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    const b64 = Buffer.from(buf).toString('base64')
    const mime = res.headers.get('content-type') || 'image/png'
    return `data:${mime};base64,${b64}`
  } catch {
    return null
  }
}

/** Texto não vazio, ou null. Campo em branco no cadastro chega como '', não null. */
function texto(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null
}

export async function getEmpresaParaProposta(): Promise<EmpresaProposta> {
  const fallback: EmpresaProposta = { nome: 'Empresa', cnpj: null, endereco: null, telefone: null, email: null, logoBase64: null }
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return fallback
  const supabase = await createClient()
  const { data } = await supabase
    .from('org_config')
    .select('nome_fantasia, razao_social, cnpj, endereco, telefone, email, logo_url, numero, cidade, estado')
    .eq('organization_id', orgId)
    .maybeSingle()
  const cfg = data as Record<string, unknown> | null
  if (!cfg) return fallback
  const endereco = [cfg.endereco, cfg.numero, cfg.cidade, cfg.estado].filter(Boolean).join(', ') || null
  return {
    // Nome fantasia é como o cliente conhece a empresa; a razão social só entra
    // se o fantasia não estiver preenchido.
    nome: texto(cfg.nome_fantasia) ?? texto(cfg.razao_social) ?? 'Empresa',
    cnpj: texto(cfg.cnpj),
    endereco,
    telefone: texto(cfg.telefone),
    email: texto(cfg.email),
    logoBase64: await fetchLogoBase64((cfg.logo_url as string) ?? null),
  }
}
