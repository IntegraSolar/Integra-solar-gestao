// web/app/api/proposta-usina/[token]/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { montarApresentacaoUsina } from '@/lib/apresentacoes-usina/dados'

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
  }
  const supabase = createAdminClient()
  const { data: apr } = await (supabase as any)
    .from('simulador_viabilidade_apresentacoes')
    .select('*')
    .eq('token', token)
    .eq('active', true)
    .maybeSingle()
  if (!apr) return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 404 })

  const { data: org } = await (supabase as any)
    .from('org_config')
    .select('nome_fantasia, razao_social, cnpj, telefone, email, logo_url, cor_principal, cor_secundaria')
    .eq('organization_id', apr.organization_id)
    .maybeSingle()

  const empresa = {
    nome: (org?.nome_fantasia?.trim() || org?.razao_social?.trim() || 'Empresa') as string,
    cnpj: org?.cnpj ?? null, telefone: org?.telefone ?? null, email: org?.email ?? null,
    endereco: null,
    logoBase64: org?.logo_url ?? null,
  }
  const dados = montarApresentacaoUsina({
    input: apr.input, resultado: apr.resultado, empresa,
    clienteNome: apr.cliente_nome, clienteCidade: apr.cliente_cidade,
    concessionariaNome: apr.concessionaria_nome,
    modeloPainel: apr.modelo_painel ?? '', modeloInversor: apr.modelo_inversor ?? '',
    config: { cor_principal: org?.cor_principal ?? '#0a0e1a', cor_secundaria: org?.cor_secundaria ?? '#0a0e1a' },
  })
  return NextResponse.json({ dados })
}
