// Projeto de teste da planilha de referência (Palmas/TO).
// Fonte dos golden values dos testes do motor híbrido/off-grid.
import type {
  Carga, ProjetoInput, EquipPainel, EquipInversor, EquipBateria,
  FisicoParaFinanceiro, TarifasInput,
} from '@/lib/simuladores/hibrido/types'

export const PROJETO: ProjetoInput = {
  hspMensal: [4.75, 4.71, 4.70, 5.16, 5.56, 5.69, 5.82, 5.91, 5.71, 5.42, 4.96, 4.78],
  diasMes: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
  tempMediaC: 27,
  tempMaxC: 38,
  tempMinC: 22,
  perdaSombreamento: 0.03,
  perdaOrientacao: 0.02,
  criterioGeracao: 'mes_critico',
}

export const PAINEL: EquipPainel = {
  id: 'painel-teste',
  fabricante: 'OSDA',
  modelo: 'MHDRZ',
  potenciaWp: 620,
  voc: 49.08,
  vmp: 40.74,
  isc: 16.08,
  imp: 15.22,
  areaM2: 2.7,
  coefPmp: -0.0029,
  coefVoc: -0.0025,
  noct: 45,
  eficiencia: 23,
  pesoKg: 32.4,
  garantiaAnos: 15,
}

export const INVERSOR: EquipInversor = {
  id: 'inversor-teste',
  fabricante: 'DEYE',
  modelo: 'SUN 8K (EU)',
  tipo: 'Híbrido',
  potCaNomW: 8000,
  mpptMinV: 125,
  mpptMaxV: 425,
  tensaoCcMaxV: 500,
  numMppt: 2,
  corrMaxMpptA: 22,
  potFvMaxWp: 10400,
  potSurgeW: 16000,
  tensaoCcBatV: 48,
  eficiencia: 97,
  backup: true,
  paralelismo: 1,
}

export const BATERIA: EquipBateria = {
  id: 'bateria-teste',
  fabricante: 'ZTRON',
  modelo: 'ZTS48150P',
  tecnologia: 'Lítio NMC',
  tensaoV: 48,
  capacidadeAh: 150,
  energiaKwh: 7.2,
  corrMaxA: 100,
  corrRecomA: 75,
  dod: 90,
  socMin: 10,
  ciclos: 6000,
  eficiencia: 94,
  garantiaAnos: 5,
}

/** TV 18–22h, chuveiro 19:00–19:30, 20 lâmpadas 18h–06h (atravessa a meia-noite). */
export const CARGAS: Carga[] = [
  {
    nome: 'tv 42"', categoria: 'Eletrônico', quantidade: 1,
    potenciaUnitW: 55, potenciaPartidaW: 55, tensaoV: 220, fatorPotencia: 0.9,
    horasDia: 4, diasSemana: 7, horaInicio: 18, horaFim: 22,
    prioridade: 'Média', critica: false,
  },
  {
    nome: 'Chuveiro Elétrico', categoria: 'Aquecimento', quantidade: 1,
    potenciaUnitW: 5500, potenciaPartidaW: 5500, tensaoV: 220, fatorPotencia: 1,
    horasDia: 0.5, diasSemana: 7, horaInicio: 19, horaFim: 19.5,
    prioridade: 'Média', critica: false,
  },
  {
    nome: 'Lampada de LED', categoria: 'Iluminação', quantidade: 20,
    potenciaUnitW: 12, potenciaPartidaW: 12, tensaoV: 220, fatorPotencia: 0.92,
    horasDia: 12, diasSemana: 7, horaInicio: 18, horaFim: 6,
    prioridade: 'Alta', critica: true,
  },
]

/**
 * Saída do motor físico para o projeto de teste (16 módulos, 1 inversor,
 * 2 baterias), usada como entrada do motor financeiro.
 */
export const FISICO: FisicoParaFinanceiro = {
  numModulos: 16,
  numInversores: 1,
  numBaterias: 2,
  potenciaInstaladaKwp: 9.92,
  producaoAnualKwh: 14149.415366185884,
  consumoAnualKwh: 2135.25,
}

/** Tarifas do projeto de teste (aba Projeto da planilha). */
export const TARIFAS: TarifasInput = {
  tarifaKwh: 1.22,
  tusdFioBKwh: 0.36,
  disponibilidadeKwhMes: 100,
}
