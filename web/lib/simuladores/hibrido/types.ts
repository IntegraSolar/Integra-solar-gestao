// web/lib/simuladores/hibrido/types.ts
// Tipos compartilhados do motor de cálculo do simulador Híbrido / Off-grid.
import type { EquipPainel, EquipInversor, EquipBateria } from '@/lib/simuladores/equipamentos/schemas'

export type { EquipPainel, EquipInversor, EquipBateria }

export type TecnologiaBateria = 'LiFePO4' | 'Lítio NMC' | 'Chumbo-ácido' | 'Gel' | 'AGM'

export type ParamsTecnologia = {
  dod: number          // fração (0.9 = 90%)
  eficiencia: number   // fração round-trip
  ciclos: number
  cRate: number
}

export type Premissas = {
  // Fatores de perda (frações)
  soiling: number
  mismatch: number
  cabeamentoCC: number
  cabeamentoCA: number
  lid: number
  tolerancia: number
  indisponibilidade: number
  eficienciaInversor: number
  // Parâmetros térmicos
  noctPadrao: number       // °C
  coefPmpPadrao: number    // fração por °C
  coefVocPadrao: number    // fração por °C
  tempRef: number          // °C (STC)
  gNoct: number            // W/m²
  gProjeto: number         // W/m²
  // Operacionais
  diasAutonomia: number
  socMin: number           // fração
  socMax: number           // fração
  eficienciaCarregador: number
  reservaTecnica: number
  // Arranjo / inversor
  dcAcAlvo: number
  dcAcMax: number
  dcAcMin: number
  simultaneidade: number
  margemInversor: number
  fatorCorrenteIsc: number
}

/** Horários em horas decimais: 19.5 = 19:30. */
export type Carga = {
  nome: string
  categoria?: string
  quantidade: number
  potenciaUnitW: number
  potenciaPartidaW: number
  tensaoV: number
  fatorPotencia: number
  horasDia: number
  diasSemana: number
  horaInicio: number
  horaFim: number
  prioridade?: string
  critica: boolean
}

export type ProjetoInput = {
  hspMensal: number[]   // 12 valores, kWh/m²·dia
  diasMes: number[]     // 12 valores
  tempMediaC: number
  tempMaxC: number
  tempMinC: number
  perdaSombreamento: number
  perdaOrientacao: number
  criterioGeracao: 'mes_critico' | 'media_anual'
}

export type HibridoInput = {
  projeto: ProjetoInput
  cargas: Carga[]
  painel: EquipPainel | null
  inversor: EquipInversor | null
  bateria: EquipBateria | null
  numModulos?: number
  modulosPorString?: number
  numStrings?: number
  tensaoBancoV?: number
  diasAutonomia?: number
  baseEnergia?: 'total' | 'criticas'
  tipoSistema?: 'Híbrido' | 'Off-grid' | 'On-grid'
}

export type SeveridadeAlerta = 'erro' | 'aviso' | 'ok'

export type CodigoAlerta =
  | 'SOBRETENSAO' | 'SUBTENSAO_MPPT' | 'CORRENTE_MPPT'
  | 'OVERSIZING_ALTO' | 'SUBDIMENSIONADO_FV' | 'POT_FV_EXCEDE'
  | 'CONFIG_DIVERGE' | 'GERACAO_INSUFICIENTE'
  | 'POTENCIA_CONTINUA' | 'SURGE_INSUFICIENTE'
  | 'TENSAO_BANCO' | 'CRATE_EXCEDIDO' | 'AUTONOMIA_ABAIXO'
  | 'TIPO_INVERSOR' | 'DADOS_INSUFICIENTES'

export type Alerta = {
  codigo: CodigoAlerta
  severidade: SeveridadeAlerta
  mensagem: string
  valor?: number
  limite?: number
}

export type ResultadoCargas = {
  consumoDiarioWh: number
  consumoDiarioKwh: number
  consumoMensalKwh: number
  consumoAnualKwh: number
  consumoDiarioCriticoWh: number
  consumoDiarioCriticoKwh: number
  potenciaConectadaW: number
  potenciaSimultaneaW: number
  potenciaPartidaW: number
  curva24h: number[]
  picoDemandaW: number
}

export type ResultadoDimensionamento = {
  prBase: number
  prEfetivo: number
  tempCelulaC: number
  fatorTemperatura: number
  prTotal: number
  hspMediaAnual: number
  hspMesCritico: number
  mesCriticoIndice: number
  hspDimensionamento: number
  energiaPorModuloKwhDia: number
  numModulosRecomendado: number
  numModulos: number
  potenciaInstaladaKwp: number
  areaTotalM2: number
  producaoDiariaKwh: number
  producaoMensalKwh: number[]
  producaoAnualKwh: number
  oversizingDcAc: number
}

export type ResultadoStrings = {
  vocTminV: number
  vmpTmaxV: number
  maxModulosPorString: number
  minModulosPorString: number
  modulosPorString: number
  numStrings: number
  tensaoStringVocTminV: number
  tensaoStringVmpTmaxV: number
  correnteStringIscA: number
  correnteProjetoA: number
  correntePorMpptA: number
  modulosConfigurados: number
}

export type ResultadoBaterias = {
  tensaoBancoV: number
  dodNominal: number
  socMin: number
  eficienciaRoundTrip: number
  energiaBateriaKwh: number
  dodUtil: number
  etaSistema: number
  energiaDiariaConsideradaKwh: number
  energiaUtilNecessariaKwh: number
  energiaNominalBancoKwh: number
  capacidadeNominalAh: number
  bateriasSerie: number
  stringsParalelo: number
  numBaterias: number
  energiaInstaladaKwh: number
  capacidadeBancoAh: number
  energiaUtilRealKwh: number
  autonomiaRealDias: number
  correnteMaxDescargaA: number
  correnteContinuaA: number
  potenciaMaxDescargaKw: number
  cRateDescarga: number
  tempoRecargaH: number
  vidaUtilAnos: number
}

export type ResultadoInversor = {
  potenciaCaMinimaW: number
  folgaPotenciaW: number
  utilizacaoContinua: number
  relacaoSurgePartida: number
  usoEntradaFv: number
  numInversoresParalelo: number
  potenciaCaTotalW: number
}

export type ResultadoHibrido = {
  cargas: ResultadoCargas
  dimensionamento: ResultadoDimensionamento
  strings: ResultadoStrings
  baterias: ResultadoBaterias
  inversor: ResultadoInversor
  alertas: Alerta[]
}

// ---------- FINANCEIRO (Fase 2b) ----------

export type PrecosCapex = {
  moduloUnitario: number       // R$ por módulo
  inversorUnitario: number     // R$ por inversor
  bateriaUnitaria: number      // R$ por bateria
  estruturaPorModulo: number   // R$ por módulo
  cabeamentoPorKwp: number     // R$ por kWp
  projetoArt: number           // R$ valor único
  maoDeObraPorKwp: number      // R$ por kWp
  freteImprevistos: number     // R$ valor único
}

export type PremissasFinanceiras = {
  bdi: number                  // fração sobre o custo direto
  margemLucro: number          // fração sobre o PREÇO DE VENDA
  impostos: number             // fração sobre o PREÇO DE VENDA
  tma: number                  // taxa mínima de atratividade a.a.
  inflacaoTarifa: number       // reajuste anual da tarifa
  degradacaoAnual: number      // degradação dos módulos
  omAnual: number              // O&M como fração do investimento
  horizonteAnos: number
  fioBSchedule: number[]       // fração do TUSD Fio B cobrada por ano (Lei 14.300)
}

export type TarifasInput = {
  tarifaKwh: number
  tusdFioBKwh: number
  disponibilidadeKwhMes: number
}

/** Números do motor físico de que o financeiro precisa. */
export type FisicoParaFinanceiro = {
  numModulos: number
  numInversores: number
  numBaterias: number
  potenciaInstaladaKwp: number
  producaoAnualKwh: number
  consumoAnualKwh: number
}

export type ItemCapex = {
  descricao: string
  quantidade: number
  custoUnitario: number
  subtotal: number
}

export type ResultadoCapex = {
  itens: ItemCapex[]
  custoDireto: number
  valorBdi: number
  custoComBdi: number
  valorMargem: number
  valorImpostos: number
  investimentoTotal: number
  investimentoPorKwp: number
}

export type ResultadoEconomiaAno = {
  ano: number
  geracaoKwh: number
  autoconsumoKwh: number
  excedenteKwh: number
  tarifaAno: number
  tusdAno: number
  economiaAutoconsumo: number
  creditoExcedente: number
  custoDisponibilidade: number
  economiaLiquida: number
}

export type LinhaProjecaoFinanceira = {
  ano: number
  geracaoKwh: number
  economiaLiquida: number
  custoOm: number
  fluxoLiquido: number
  fluxoAcumulado: number
  fluxoDescontado: number
  vplAcumulado: number
}

export type IndicadoresFinanceiros = {
  vpl: number
  tir: number
  paybackSimplesAnos: number | null
  paybackDescontadoAnos: number | null
  lcoe: number
  economiaAcumulada: number
  roi: number
  indiceVplInvestimento: number
}

export type ResultadoFinanceiro = {
  capex: ResultadoCapex
  projecao: LinhaProjecaoFinanceira[]
  indicadores: IndicadoresFinanceiros
}
