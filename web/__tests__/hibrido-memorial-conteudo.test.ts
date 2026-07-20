import { describe, it, expect } from 'vitest'
import { montarMemorial } from '@/lib/simuladores/hibrido/memorial-conteudo'
import { calcularHibrido } from '@/lib/simuladores/hibrido'
import { montarHibridoInput, CAMPOS_INICIAIS } from '@/lib/simuladores/hibrido/montar-input'
import { DADOS_PROJETO_INICIAL } from '@/components/simuladores/HibridoIdentificacao'
import { PROJETO, PAINEL, INVERSOR, BATERIA, CARGAS } from './fixtures/hibrido-fixture'

const EQUIP = { paineis: [PAINEL], inversores: [INVERSOR], baterias: [BATERIA] }

const CAMPOS = {
  ...CAMPOS_INICIAIS,
  tempMediaC: 27, tempMaxC: 38, tempMinC: 22,
  hspMensal: PROJETO.hspMensal,
  painelId: PAINEL.id, inversorId: INVERSOR.id, bateriaId: BATERIA.id,
  numModulos: '16', modulosPorString: '8',
}

const RESULTADO = calcularHibrido(montarHibridoInput(CAMPOS, EQUIP, CARGAS))

const DADOS = {
  ...DADOS_PROJETO_INICIAL,
  nome: 'Projeto Palmas', clienteNome: 'Iago Bonifácio',
  clienteCidade: 'Palmas', clienteUf: 'TO', concessionaria: 'ENERGISA',
  responsavelTecnico: 'Patrick Limberg',
  azimute: '0', inclinacao: '15', latitude: '-10.1836', longitude: '-48.3338',
  altitude: '240', tipoLigacao: 'Bifásico', tensaoNominal: '380',
  modoOperacao: 'Autoconsumo + Backup',
}

const BASE = {
  dados: DADOS, projeto: { ...PROJETO }, resultado: RESULTADO,
  painel: PAINEL, inversor: INVERSOR, bateria: BATERIA,
  tipoSistema: 'Híbrido',
}

const texto = (s: { paragrafos?: string[]; linhas?: { rotulo: string; valor: string }[] }) =>
  [...(s.paragrafos ?? []), ...(s.linhas ?? []).map((l) => `${l.rotulo}: ${l.valor}`)].join(' | ')

describe('montarMemorial — estrutura', () => {
  const secoes = montarMemorial(BASE)

  it('devolve as 11 seções', () => {
    expect(secoes).toHaveLength(11)
  })
  it('na ordem da planilha', () => {
    expect(secoes[0].titulo).toMatch(/Objetivo/i)
    expect(secoes[3].titulo).toMatch(/Gerador fotovoltaico/i)
    expect(secoes[5].titulo).toMatch(/Armazenamento/i)
    expect(secoes[9].titulo).toMatch(/Normas/i)
    expect(secoes[10].titulo).toMatch(/Conclusão/i)
  })
  it('as seções de texto normativo fixo não estão vazias', () => {
    for (const i of [7, 9, 10]) {
      expect(texto(secoes[i]).length, `seção ${i + 1}`).toBeGreaterThan(80)
    }
  })
})

describe('montarMemorial — cada valor na frase certa', () => {
  const secoes = montarMemorial(BASE)

  it('o gerador traz o nº de módulos e a potência instalada', () => {
    const t = texto(secoes[3])
    expect(t).toContain('16')
    expect(t).toContain('9,92')
    expect(t).toContain('MHDRZ')
  })
  it('o armazenamento traz o nº de baterias, não o de módulos', () => {
    const t = texto(secoes[5])
    expect(t).toContain(String(RESULTADO.baterias.numBaterias))
    expect(t).toContain('ZTS48150P')
  })
  it('a conversão traz o modelo do inversor', () => {
    expect(texto(secoes[4])).toContain('SUN 8K (EU)')
  })
  it('a localização traz coordenadas, altitude e temperaturas', () => {
    const t = texto(secoes[2])
    expect(t).toContain('-10.1836')
    expect(t).toContain('240')
    expect(t).toContain('27')
  })
  it('os dados gerais trazem cliente, concessionária e responsável', () => {
    const t = texto(secoes[1])
    expect(t).toContain('Iago Bonifácio')
    expect(t).toContain('ENERGISA')
    expect(t).toContain('Patrick Limberg')
  })
  it('o arranjo traz módulos por string e o oversizing', () => {
    const t = texto(secoes[6])
    expect(t).toContain('8')
    expect(t).toContain('1,24')
  })
})

describe('montarMemorial — sem bateria', () => {
  const semBateria = calcularHibrido(
    montarHibridoInput({ ...CAMPOS, bateriaId: '' }, EQUIP, CARGAS)
  )
  const secoes = montarMemorial({ ...BASE, resultado: semBateria, bateria: null })

  it('a seção de armazenamento usa a frase alternativa', () => {
    expect(texto(secoes[5])).toMatch(/não contempla armazenamento/i)
  })
  it('e não imprime números de banco', () => {
    expect(texto(secoes[5])).not.toMatch(/kWh/)
  })
})

describe('montarMemorial — campos não informados', () => {
  const secoes = montarMemorial({ ...BASE, dados: DADOS_PROJETO_INICIAL })
  const tudo = secoes.map(texto).join(' | ')

  it('saem como travessão', () => {
    expect(tudo).toContain('—')
  })
  it('nunca imprime undefined, null ou NaN', () => {
    expect(tudo).not.toMatch(/undefined/)
    expect(tudo).not.toMatch(/null/)
    expect(tudo).not.toMatch(/NaN/)
  })
})
