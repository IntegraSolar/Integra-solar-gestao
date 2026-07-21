// web/lib/apresentacoes/config-actions.ts
//
// Configuração PADRÃO da apresentação comercial de cada organização: template,
// tema, blocos ativos, textos personalizáveis e identidade visual (cores + logo).
// É o ponto de partida de toda proposta nova — o vendedor ainda pode trocar
// tudo isso numa proposta específica via ApresentacaoConfigurador.
//
// A tabela `org_apresentacao_config` (migration 20260721000004) ainda não foi
// aplicada em produção. Todas as funções aqui toleram a tabela ausente: leitura
// cai nos padrões, escrita retorna uma mensagem de erro clara em vez de um erro
// genérico do Postgres.
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'
import { requirePermission } from '@/lib/org/permissions'
import { normalizarConfig } from './templates'
import { mesclarTextos, type TextosApresentacao } from './textos'
import type { ApresentacaoConfig } from './tipos'
import type { ActionResult } from '@/lib/crm/types'

const TABELA_AUSENTE_MSG =
  'Recurso indisponível: a migration da configuração da apresentação ainda não foi aplicada.'

/** Postgres "relation does not exist" — código padrão para tabela ausente. */
function tabelaAusente(error: any): boolean {
  return error?.code === '42P01' || /relation .* does not exist/i.test(error?.message ?? '')
}

export type ConfigApresentacaoCompleta = ApresentacaoConfig & {
  textos: TextosApresentacao
  cor_principal: string
  cor_secundaria: string
  logo_url: string | null
}

async function getOrgId(): Promise<string | null> {
  const user = await getCurrentUserData()
  return user?.membership?.organization.id ?? null
}

const CORES_PADRAO = { cor_principal: '#FFD080', cor_secundaria: '#0a0e1a' }

export async function getConfigApresentacao(): Promise<ConfigApresentacaoCompleta> {
  try {
    const orgId = await getOrgId()
    const base = normalizarConfig(null)
    if (!orgId) {
      return { ...base, textos: mesclarTextos(null), ...CORES_PADRAO, logo_url: null }
    }

    const supabase = await createClient()

    const [apresentacaoRes, orgConfigRes] = await Promise.all([
      // `org_apresentacao_config` ainda não está nos tipos gerados (migration
      // não aplicada em produção) — cast para any evita quebrar o build.
      (supabase as any)
        .from('org_apresentacao_config')
        .select('template, tema, blocos, textos')
        .eq('organization_id', orgId)
        .maybeSingle(),
      supabase
        .from('org_config')
        .select('cor_principal, cor_secundaria, logo_url')
        .eq('organization_id', orgId)
        .maybeSingle(),
    ])

    const apresentacaoData = tabelaAusente(apresentacaoRes.error) ? null : apresentacaoRes.data
    const config = normalizarConfig(apresentacaoData)
    const textos = mesclarTextos(apresentacaoData?.textos)

    const orgConfig = orgConfigRes.data
    return {
      ...config,
      textos,
      cor_principal: orgConfig?.cor_principal ?? CORES_PADRAO.cor_principal,
      cor_secundaria: orgConfig?.cor_secundaria ?? CORES_PADRAO.cor_secundaria,
      logo_url: orgConfig?.logo_url ?? null,
    }
  } catch {
    return { ...normalizarConfig(null), textos: mesclarTextos(null), ...CORES_PADRAO, logo_url: null }
  }
}

export async function salvarConfigApresentacao(input: {
  template: string
  tema: string
  blocos: string[]
  textos: unknown
  cor_principal: string
  cor_secundaria: string
}): Promise<ActionResult> {
  try { await requirePermission('configuracoes', 'edit') } catch { return { error: 'Sem permissão para editar configurações.' } }

  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }

  // Valida ANTES de gravar — nunca persiste blocos/tema/template inválidos nem
  // textos fora do formato esperado.
  const configValida = normalizarConfig({
    template: input.template,
    tema: input.tema,
    blocos: input.blocos,
  })
  const textosValidos = mesclarTextos(input.textos)

  const corPrincipal = /^#[0-9a-fA-F]{6}$/.test(input.cor_principal) ? input.cor_principal : CORES_PADRAO.cor_principal
  const corSecundaria = /^#[0-9a-fA-F]{6}$/.test(input.cor_secundaria) ? input.cor_secundaria : CORES_PADRAO.cor_secundaria

  try {
    const supabase = await createClient()

    const { error: upsertError } = await (supabase as any)
      .from('org_apresentacao_config')
      .upsert(
        {
          organization_id: orgId,
          template: configValida.template,
          tema: configValida.tema,
          blocos: configValida.blocos,
          textos: textosValidos,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id' }
      )

    if (upsertError) {
      if (tabelaAusente(upsertError)) return { error: TABELA_AUSENTE_MSG }
      return { error: 'Erro ao salvar configuração da apresentação: ' + upsertError.message }
    }

    const { data: existingOrgConfig } = await supabase
      .from('org_config')
      .select('id')
      .eq('organization_id', orgId)
      .maybeSingle()

    const corPayload = { cor_principal: corPrincipal, cor_secundaria: corSecundaria }
    let corError: any
    if (existingOrgConfig) {
      ;({ error: corError } = await supabase.from('org_config').update(corPayload).eq('id', existingOrgConfig.id))
    } else {
      ;({ error: corError } = await supabase.from('org_config').insert({ ...corPayload, organization_id: orgId }))
    }

    if (corError) return { error: 'Erro ao salvar cores: ' + corError.message }

    revalidatePath('/configuracoes')
    return { success: 'Configuração da apresentação salva.' }
  } catch (e: any) {
    return { error: e?.message ?? 'Erro inesperado ao salvar configuração da apresentação.' }
  }
}

const TIPOS_ACEITOS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
}
const TAMANHO_MAXIMO = 2 * 1024 * 1024 // 2 MB

export async function uploadLogo(formData: FormData): Promise<ActionResult & { url?: string }> {
  try { await requirePermission('configuracoes', 'edit') } catch { return { error: 'Sem permissão para editar configurações.' } }

  const orgId = await getOrgId()
  if (!orgId) return { error: 'Sem organização ativa.' }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'Selecione um arquivo.' }

  const ext = TIPOS_ACEITOS[file.type]
  if (!ext) return { error: 'Formato inválido. Envie um arquivo PNG, JPEG, WEBP ou SVG.' }
  if (file.size > TAMANHO_MAXIMO) return { error: 'Arquivo muito grande. O limite para a logomarca é 2 MB.' }

  try {
    const supabase = await createClient()
    const filePath = `${orgId}/logo.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('org-branding')
      .upload(filePath, file, { contentType: file.type, upsert: true })

    if (uploadError) {
      if (tabelaAusente(uploadError)) return { error: TABELA_AUSENTE_MSG }
      return { error: 'Erro ao enviar logomarca: ' + uploadError.message }
    }

    const { data: publicUrlData } = supabase.storage.from('org-branding').getPublicUrl(filePath)
    // Evita cache de CDN/navegador ao trocar a logo mantendo o mesmo nome de arquivo.
    const url = `${publicUrlData.publicUrl}?v=${Date.now()}`

    const { data: existingOrgConfig } = await supabase
      .from('org_config')
      .select('id')
      .eq('organization_id', orgId)
      .maybeSingle()

    let error: any
    if (existingOrgConfig) {
      ;({ error } = await supabase.from('org_config').update({ logo_url: url }).eq('id', existingOrgConfig.id))
    } else {
      ;({ error } = await supabase.from('org_config').insert({ logo_url: url, organization_id: orgId }))
    }

    if (error) return { error: 'Erro ao salvar URL da logomarca: ' + error.message }

    revalidatePath('/configuracoes')
    return { success: 'Logomarca enviada.', url }
  } catch (e: any) {
    return { error: e?.message ?? 'Erro inesperado ao enviar logomarca.' }
  }
}
