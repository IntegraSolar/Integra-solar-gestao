import { describe, it, expect } from 'vitest'
import { PREMISSAS_PADRAO, TECNOLOGIAS_BATERIA_PARAMS } from '@/lib/simuladores/hibrido/premissas'

describe('PREMISSAS_PADRAO', () => {
  it('traz os fatores de perda da planilha', () => {
    expect(PREMISSAS_PADRAO.soiling).toBe(0.03)
    expect(PREMISSAS_PADRAO.mismatch).toBe(0.02)
    expect(PREMISSAS_PADRAO.cabeamentoCC).toBe(0.015)
    expect(PREMISSAS_PADRAO.cabeamentoCA).toBe(0.01)
    expect(PREMISSAS_PADRAO.lid).toBe(0.015)
    expect(PREMISSAS_PADRAO.tolerancia).toBe(0.01)
    expect(PREMISSAS_PADRAO.indisponibilidade).toBe(0.02)
    expect(PREMISSAS_PADRAO.eficienciaInversor).toBe(0.975)
  })
  it('traz os parâmetros térmicos e operacionais', () => {
    expect(PREMISSAS_PADRAO.noctPadrao).toBe(45)
    expect(PREMISSAS_PADRAO.coefPmpPadrao).toBe(-0.0035)
    expect(PREMISSAS_PADRAO.coefVocPadrao).toBe(-0.003)
    expect(PREMISSAS_PADRAO.tempRef).toBe(25)
    expect(PREMISSAS_PADRAO.gNoct).toBe(800)
    expect(PREMISSAS_PADRAO.gProjeto).toBe(1000)
    expect(PREMISSAS_PADRAO.diasAutonomia).toBe(2)
    expect(PREMISSAS_PADRAO.socMin).toBe(0.2)
    expect(PREMISSAS_PADRAO.socMax).toBe(1)
    expect(PREMISSAS_PADRAO.eficienciaCarregador).toBe(0.98)
  })
  it('traz os parâmetros de arranjo e inversor', () => {
    expect(PREMISSAS_PADRAO.dcAcAlvo).toBe(1.15)
    expect(PREMISSAS_PADRAO.dcAcMax).toBe(1.35)
    expect(PREMISSAS_PADRAO.dcAcMin).toBe(1)
    expect(PREMISSAS_PADRAO.simultaneidade).toBe(0.7)
    expect(PREMISSAS_PADRAO.margemInversor).toBe(0.25)
    expect(PREMISSAS_PADRAO.fatorCorrenteIsc).toBe(1.25)
  })
})

describe('TECNOLOGIAS_BATERIA_PARAMS', () => {
  it('cobre as 5 tecnologias com DOD/eficiência/ciclos da planilha', () => {
    expect(TECNOLOGIAS_BATERIA_PARAMS['LiFePO4']).toEqual({ dod: 0.9, eficiencia: 0.95, ciclos: 6000, cRate: 1 })
    expect(TECNOLOGIAS_BATERIA_PARAMS['Lítio NMC']).toEqual({ dod: 0.85, eficiencia: 0.94, ciclos: 4000, cRate: 1 })
    expect(TECNOLOGIAS_BATERIA_PARAMS['Chumbo-ácido']).toEqual({ dod: 0.5, eficiencia: 0.8, ciclos: 800, cRate: 0.2 })
    expect(TECNOLOGIAS_BATERIA_PARAMS['Gel']).toEqual({ dod: 0.5, eficiencia: 0.8, ciclos: 1200, cRate: 0.2 })
    expect(TECNOLOGIAS_BATERIA_PARAMS['AGM']).toEqual({ dod: 0.5, eficiencia: 0.85, ciclos: 1000, cRate: 0.3 })
  })
})
