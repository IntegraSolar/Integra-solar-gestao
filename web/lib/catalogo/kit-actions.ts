'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import { getOrgConfig } from '@/lib/configuracoes/queries'
import { calcularPreco } from '@/lib/proposals/pricing'

export type Kit = {
  id: string
  name: string
  code: string | null
  description: string | null
  status: 'ativo' | 'inativo'
  panel_brand: string | null
  panel_model: string | null
  panel_power_w: number | null
  panel_qty: number
  inverter_brand: string | null
  inverter_model: string | null
  inverter_power_w: number | null
  inverter_qty: number
  total_power_kwp: number | null
  monthly_generation_kwh: number | null
  annual_generation_kwh: number | null
  kit_value: number
  km_rodados: number
  supplier_name: string | null
  sale_price: number | null
  created_at: string
  updated_at: string
}

// Public view — sem dados de custo/margem
export type KitPublic = Omit<Kit, 'kit_value' | 'km_rodados' | 'supplier_name'>

export type KitInput = {
  name: string
  code?: string | null
  description?: string | null
  status?: 'ativo' | 'inativo'
  panel_brand?: string | null
  panel_model?: string | null
  panel_power_w?: number | null
  panel_qty?: number
  inverter_brand?: string | null
  inverter_model?: string | null
  inverter_power_w?: number | null
  inverter_qty?: number
  kit_value?: number
  km_rodados?: number
  supplier_name?: string | null
}

type ActionResult = { error?: string; success?: string }

function computeKit(input: KitInput, kwh_por_kwp: number | null) {
  const panel_qty = input.panel_qty ?? 0
  const panel_power_w = input.panel_power_w ?? 0
  const total_power_kwp = (panel_qty * panel_power_w) / 1000
  const kwhFactor = kwh_por_kwp ?? 1.0
  const monthly_generation_kwh = total_power_kwp * kwhFactor
  const annual_generation_kwh = monthly_generation_kwh * 12
  return { total_power_kwp, monthly_generation_kwh, annual_generation_kwh }
}

export async function getKits(): Promise<Kit[]> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return []

  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('kit_catalog')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  return (data ?? []).map(mapKit)
}

export async function getKitsPublic(): Promise<KitPublic[]> {
  const kits = await getKits()
  return kits
    .filter(k => k.status === 'ativo')
    .map(({ kit_value: _kv, km_rodados: _km, supplier_name: _sn, ...rest }) => rest)
}

export async function createKit(input: KitInput): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const config = await getOrgConfig()
  const computed = computeKit(input, config?.kwh_por_kwp ?? null)

  let sale_price: number | null = null
  if ((input.kit_value ?? 0) > 0) {
    const pricing = calcularPreco(
      { kit_value: input.kit_value ?? 0, total_power_kwp: computed.total_power_kwp, panel_qty: input.panel_qty ?? 0, km_rodados: input.km_rodados ?? 0 },
      config as any
    )
    sale_price = pricing.preco_total
  }

  const supabase = await createClient()
  const { error } = await (supabase as any).from('kit_catalog').insert({
    organization_id: orgId,
    created_by_user_id: user?.profile.id ?? null,
    name: input.name,
    code: input.code ?? null,
    description: input.description ?? null,
    status: input.status ?? 'ativo',
    panel_brand: input.panel_brand ?? null,
    panel_model: input.panel_model ?? null,
    panel_power_w: input.panel_power_w ?? null,
    panel_qty: input.panel_qty ?? 0,
    inverter_brand: input.inverter_brand ?? null,
    inverter_model: input.inverter_model ?? null,
    inverter_power_w: input.inverter_power_w ?? null,
    inverter_qty: input.inverter_qty ?? 0,
    kit_value: input.kit_value ?? 0,
    km_rodados: input.km_rodados ?? 0,
    supplier_name: input.supplier_name ?? null,
    sale_price,
    ...computed,
  })

  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return { success: 'Kit criado.' }
}

export async function updateKit(id: string, input: KitInput): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const config = await getOrgConfig()
  const computed = computeKit(input, config?.kwh_por_kwp ?? null)

  let sale_price: number | null = null
  if ((input.kit_value ?? 0) > 0) {
    const pricing = calcularPreco(
      { kit_value: input.kit_value ?? 0, total_power_kwp: computed.total_power_kwp, panel_qty: input.panel_qty ?? 0, km_rodados: input.km_rodados ?? 0 },
      config as any
    )
    sale_price = pricing.preco_total
  }

  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('kit_catalog')
    .update({
      name: input.name,
      code: input.code ?? null,
      description: input.description ?? null,
      status: input.status ?? 'ativo',
      panel_brand: input.panel_brand ?? null,
      panel_model: input.panel_model ?? null,
      panel_power_w: input.panel_power_w ?? null,
      panel_qty: input.panel_qty ?? 0,
      inverter_brand: input.inverter_brand ?? null,
      inverter_model: input.inverter_model ?? null,
      inverter_power_w: input.inverter_power_w ?? null,
      inverter_qty: input.inverter_qty ?? 0,
      kit_value: input.kit_value ?? 0,
      km_rodados: input.km_rodados ?? 0,
      supplier_name: input.supplier_name ?? null,
      sale_price,
      updated_at: new Date().toISOString(),
      ...computed,
    })
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return { success: 'Kit atualizado.' }
}

export async function duplicateKit(id: string): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()
  const { data: original } = await (supabase as any)
    .from('kit_catalog')
    .select('*')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single()

  if (!original) return { error: 'Kit não encontrado.' }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at: _ca, updated_at: _ua, created_by_user_id: _cbu, ...rest } = original
  const { error } = await (supabase as any).from('kit_catalog').insert({
    ...rest,
    name: original.name,
    status: 'inativo',
    created_by_user_id: user?.profile.id ?? null,
  })

  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return { success: 'Kit duplicado.' }
}

export async function toggleKitStatus(id: string, status: 'ativo' | 'inativo'): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('kit_catalog')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return { success: status === 'ativo' ? 'Kit ativado.' : 'Kit desativado.' }
}

export async function deleteKit(id: string): Promise<ActionResult> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id ?? null
  if (!orgId) return { error: 'Sem organização ativa.' }

  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('kit_catalog')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return { success: 'Kit excluído.' }
}

function mapKit(r: any): Kit {
  return {
    id: r.id,
    name: r.name,
    code: r.code,
    description: r.description,
    status: r.status,
    panel_brand: r.panel_brand,
    panel_model: r.panel_model,
    panel_power_w: r.panel_power_w ? Number(r.panel_power_w) : null,
    panel_qty: r.panel_qty ?? 0,
    inverter_brand: r.inverter_brand,
    inverter_model: r.inverter_model,
    inverter_power_w: r.inverter_power_w ? Number(r.inverter_power_w) : null,
    inverter_qty: r.inverter_qty ?? 0,
    total_power_kwp: r.total_power_kwp ? Number(r.total_power_kwp) : null,
    monthly_generation_kwh: r.monthly_generation_kwh ? Number(r.monthly_generation_kwh) : null,
    annual_generation_kwh: r.annual_generation_kwh ? Number(r.annual_generation_kwh) : null,
    kit_value: Number(r.kit_value ?? 0),
    km_rodados: Number(r.km_rodados ?? 0),
    supplier_name: r.supplier_name,
    sale_price: r.sale_price ? Number(r.sale_price) : null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }
}
