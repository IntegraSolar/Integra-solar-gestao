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

export async function getEmpresaParaProposta(): Promise<EmpresaProposta> {
  const fallback: EmpresaProposta = { nome: 'Empresa', cnpj: null, endereco: null, telefone: null, email: null, logoBase64: null }
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return fallback
  const supabase = await createClient()
  const { data } = await supabase
    .from('org_config')
    .select('razao_social, cnpj, endereco, telefone, email, logo_url, numero, cidade, estado')
    .eq('organization_id', orgId)
    .maybeSingle()
  const cfg = data as Record<string, unknown> | null
  if (!cfg) return fallback
  const endereco = [cfg.endereco, cfg.numero, cfg.cidade, cfg.estado].filter(Boolean).join(', ') || null
  return {
    nome: (cfg.razao_social as string) ?? 'Empresa',
    cnpj: (cfg.cnpj as string) ?? null,
    endereco,
    telefone: (cfg.telefone as string) ?? null,
    email: (cfg.email as string) ?? null,
    logoBase64: await fetchLogoBase64((cfg.logo_url as string) ?? null),
  }
}
