import { describe, it, expect } from 'vitest'
import {
  VERSAO_SNAPSHOT, montarSnapshot, lerSnapshot, mesclarEquipamentos,
} from '@/lib/simuladores/hibrido/snapshot'
import { CAMPOS_INICIAIS, type EquipamentosDisponiveis } from '@/lib/simuladores/hibrido/montar-input'
import { camposFinanceiroIniciais } from '@/lib/simuladores/hibrido/montar-financeiro'
import { PAINEL, INVERSOR, BATERIA, CARGAS } from './fixtures/hibrido-fixture'

const CAMPOS = { ...CAMPOS_INICIAIS, painelId: PAINEL.id, numModulos: '16' }
const CAMPOS_FIN = { ...camposFinanceiroIniciais(2026), tarifaKwh: '1.22' }
const EQUIP_USADOS = { painel: PAINEL, inversor: INVERSOR, bateria: BATERIA }

describe('montarSnapshot / lerSnapshot', () => {
  const snap = montarSnapshot(CAMPOS, CAMPOS_FIN, CARGAS, EQUIP_USADOS)

  it('carimba a versão atual', () => {
    expect(snap.versao).toBe(VERSAO_SNAPSHOT)
  })
  it('ida e volta preserva campos, financeiro, cargas e equipamentos', () => {
    const lido = lerSnapshot(JSON.parse(JSON.stringify(snap)))
    expect(lido).not.toBeNull()
    expect(lido!.campos).toEqual(CAMPOS)
    expect(lido!.camposFin).toEqual(CAMPOS_FIN)
    expect(lido!.cargas).toEqual(CARGAS)
    expect(lido!.equipamentos.painel?.modelo).toBe('MHDRZ')
    expect(lido!.equipamentos.bateria?.modelo).toBe('ZTS48150P')
  })
  it('aceita equipamentos nulos (nada selecionado)', () => {
    const s = montarSnapshot(CAMPOS_INICIAIS, CAMPOS_FIN, [], { painel: null, inversor: null, bateria: null })
    const lido = lerSnapshot(JSON.parse(JSON.stringify(s)))
    expect(lido!.equipamentos.painel).toBeNull()
    expect(lido!.cargas).toEqual([])
  })
})

describe('lerSnapshot — recusa em vez de restaurar pela metade', () => {
  const snap = montarSnapshot(CAMPOS, CAMPOS_FIN, CARGAS, EQUIP_USADOS)

  it('recusa versão desconhecida', () => {
    expect(lerSnapshot({ ...snap, versao: 99 })).toBeNull()
  })
  it('recusa objeto sem campos', () => {
    const { campos, ...semCampos } = snap
    void campos
    expect(lerSnapshot(semCampos)).toBeNull()
  })
  it('recusa campos truncados (faltando hspMensal)', () => {
    const { hspMensal, ...camposTruncados } = snap.campos
    void hspMensal
    expect(lerSnapshot({ ...snap, campos: camposTruncados })).toBeNull()
  })
  it('recusa hspMensal com tamanho errado', () => {
    expect(lerSnapshot({ ...snap, campos: { ...snap.campos, hspMensal: [1, 2, 3] } })).toBeNull()
  })
  it('recusa null, undefined e tipos errados', () => {
    expect(lerSnapshot(null)).toBeNull()
    expect(lerSnapshot(undefined)).toBeNull()
    expect(lerSnapshot('texto')).toBeNull()
    expect(lerSnapshot(42)).toBeNull()
  })
})

describe('mesclarEquipamentos', () => {
  const vazio: EquipamentosDisponiveis = { paineis: [], inversores: [], baterias: [] }
  const catalogo: EquipamentosDisponiveis = { paineis: [PAINEL], inversores: [INVERSOR], baterias: [BATERIA] }

  it('acrescenta equipamento que só existe no snapshot', () => {
    const r = mesclarEquipamentos(vazio, EQUIP_USADOS)
    expect(r.paineis.map((p) => p.id)).toEqual([PAINEL.id])
    expect(r.inversores.map((i) => i.id)).toEqual([INVERSOR.id])
    expect(r.baterias.map((b) => b.id)).toEqual([BATERIA.id])
  })
  it('não duplica o que já está no catálogo', () => {
    const r = mesclarEquipamentos(catalogo, EQUIP_USADOS)
    expect(r.paineis).toHaveLength(1)
    expect(r.inversores).toHaveLength(1)
    expect(r.baterias).toHaveLength(1)
  })
  it('preserva o catálogo quando o snapshot não tem equipamentos', () => {
    const r = mesclarEquipamentos(catalogo, { painel: null, inversor: null, bateria: null })
    expect(r).toEqual(catalogo)
  })
  it('mantém a ordem do catálogo e põe o do snapshot ao fim', () => {
    const outro = { ...PAINEL, id: 'outro-painel', modelo: 'OUTRO' }
    const r = mesclarEquipamentos({ ...catalogo, paineis: [outro] }, EQUIP_USADOS)
    expect(r.paineis.map((p) => p.id)).toEqual(['outro-painel', PAINEL.id])
  })
})
