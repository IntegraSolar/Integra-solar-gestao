// web/lib/simuladores/hibrido/premissas.ts
// Constantes de engenharia da aba "Premissas" da planilha de referência.
// Refs.: ABNT NBR 16690 / 16274 / 5410, PRODIST Mód.3, IEC 61724, NREL PVWatts.
import type { Premissas, TecnologiaBateria, ParamsTecnologia } from './types'

export const PREMISSAS_PADRAO: Premissas = {
  // Fatores de perda do sistema (Performance Ratio)
  soiling: 0.03,             // poeira/acúmulo; típico 2–5% (IEC 61724)
  mismatch: 0.02,            // descasamento entre módulos de uma string
  cabeamentoCC: 0.015,       // queda ôhmica no lado CC (dimensionar ≤1,5%)
  cabeamentoCA: 0.01,        // queda ôhmica no lado CA (NBR 5410)
  lid: 0.015,                // Light Induced Degradation (1º ano)
  tolerancia: 0.01,          // tolerância de fabricação do módulo
  indisponibilidade: 0.02,   // manutenção/falhas do sistema
  eficienciaInversor: 0.975, // sobrescrito pelo inversor selecionado, se houver

  // Parâmetros térmicos (modelo NOCT)
  noctPadrao: 45,            // °C, usado se o modelo não informar NOCT (40–48 °C)
  coefPmpPadrao: -0.0035,    // fração/°C; monocristalino ≈ -0,30 a -0,40 %/°C
  coefVocPadrao: -0.003,     // fração/°C
  tempRef: 25,               // °C — Standard Test Conditions
  gNoct: 800,                // W/m² — condição de ensaio NOCT
  gProjeto: 1000,            // W/m² — irradiância de referência

  // Operacionais (bateria/sistema)
  diasAutonomia: 2,          // off-grid típico 2–3 dias
  socMin: 0.2,
  socMax: 1,
  eficienciaCarregador: 0.98, // controlador de carga solar / MPPT
  reservaTecnica: 0.1,

  // Dimensionamento do inversor / oversizing
  dcAcAlvo: 1.15,            // típico 1,10–1,30 (clima BR)
  dcAcMax: 1.35,
  dcAcMin: 1,
  simultaneidade: 0.7,       // fração das cargas ligadas ao mesmo tempo
  margemInversor: 0.25,      // folga sobre potência contínua
  fatorCorrenteIsc: 1.25,    // 1,25×Isc p/ proteções (NBR 16690 / NEC 690.8)
}

/** Fallbacks por tecnologia quando a bateria cadastrada não informa o campo. */
export const TECNOLOGIAS_BATERIA_PARAMS: Record<TecnologiaBateria, ParamsTecnologia> = {
  'LiFePO4':      { dod: 0.9,  eficiencia: 0.95, ciclos: 6000, cRate: 1 },
  'Lítio NMC':    { dod: 0.85, eficiencia: 0.94, ciclos: 4000, cRate: 1 },
  'Chumbo-ácido': { dod: 0.5,  eficiencia: 0.8,  ciclos: 800,  cRate: 0.2 },
  'Gel':          { dod: 0.5,  eficiencia: 0.8,  ciclos: 1200, cRate: 0.2 },
  'AGM':          { dod: 0.5,  eficiencia: 0.85, ciclos: 1000, cRate: 0.3 },
}
