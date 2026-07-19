import { describe, it, expect } from 'vitest'
import { CARGAS_BIBLIOTECA_SEED } from '@/lib/simuladores/hibrido/cargas-biblioteca-seed'
import { cargaBibliotecaSchema, duracaoJanelaHoras } from '@/lib/simuladores/hibrido/cargas-biblioteca-schemas'

describe('CARGAS_BIBLIOTECA_SEED', () => {
  it('tem pelo menos 20 cargas', () => {
    expect(CARGAS_BIBLIOTECA_SEED.length).toBeGreaterThanOrEqual(20)
  })

  it('todos os itens passam no schema', () => {
    for (const c of CARGAS_BIBLIOTECA_SEED) {
      const r = cargaBibliotecaSchema.safeParse(c)
      expect(r.success, `${c.nome}: ${r.success ? '' : r.error.issues[0].message}`).toBe(true)
    }
  })

  it('nomes são únicos (a constraint do banco depende disso)', () => {
    const nomes = CARGAS_BIBLIOTECA_SEED.map((c) => c.nome)
    expect(new Set(nomes).size).toBe(nomes.length)
  })

  it('potência de partida nunca é menor que a nominal', () => {
    for (const c of CARGAS_BIBLIOTECA_SEED) {
      expect(c.potenciaPartidaW, c.nome).toBeGreaterThanOrEqual(c.potenciaUnitW)
    }
  })

  it('há cargas com partida ESTRITAMENTE maior que a nominal', () => {
    // Sem isso, a verificação de surge do inversor (motor da Fase 2a) nunca é
    // exercitada por nenhum levantamento montado a partir da biblioteca.
    const comSurge = CARGAS_BIBLIOTECA_SEED.filter((c) => c.potenciaPartidaW > c.potenciaUnitW)
    expect(comSurge.length).toBeGreaterThanOrEqual(5)
  })

  it('horas/dia nunca excedem a duração da janela de uso', () => {
    // Não se exige igualdade: cargas com ciclo de trabalho (geladeira) rodam
    // menos horas do que a janela em que estão disponíveis.
    for (const c of CARGAS_BIBLIOTECA_SEED) {
      const janela = duracaoJanelaHoras(c.horaInicio, c.horaFim)
      expect(c.horasDia, `${c.nome} (janela ${janela}h)`).toBeLessThanOrEqual(janela)
    }
  })

  it('toda carga tem categoria', () => {
    for (const c of CARGAS_BIBLIOTECA_SEED) {
      expect(c.categoria, c.nome).toBeTruthy()
    }
  })
})
