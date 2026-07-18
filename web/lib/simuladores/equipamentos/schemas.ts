// web/lib/simuladores/equipamentos/schemas.ts
// Tipos, schemas Zod e mapeadores row<->objeto do cadastro de equipamentos.
// Módulo puro (sem 'use server') para ser testável isoladamente.
import { z } from 'zod'

// ---------- PAINÉIS ----------
export const painelSchema = z.object({
  fabricante: z.string().min(1, 'Informe o fabricante.'),
  modelo: z.string().min(1, 'Informe o modelo.'),
  potenciaWp: z.coerce.number().positive('Potência deve ser > 0.'),
  voc: z.coerce.number().positive('Voc deve ser > 0.'),
  vmp: z.coerce.number().positive('Vmp deve ser > 0.'),
  isc: z.coerce.number().positive('Isc deve ser > 0.'),
  imp: z.coerce.number().positive('Imp deve ser > 0.'),
  areaM2: z.coerce.number().positive('Área deve ser > 0.'),
  coefPmp: z.coerce.number().nullish(),
  coefVoc: z.coerce.number().nullish(),
  noct: z.coerce.number().nullish(),
  eficiencia: z.coerce.number().nullish(),
  pesoKg: z.coerce.number().nullish(),
  garantiaAnos: z.coerce.number().int().nullish(),
})
export type PainelData = z.infer<typeof painelSchema>
export type EquipPainel = PainelData & { id: string }

// ---------- INVERSORES ----------
export const TIPOS_INVERSOR = ['Híbrido', 'Off-grid', 'On-grid'] as const
export const inversorSchema = z.object({
  fabricante: z.string().min(1, 'Informe o fabricante.'),
  modelo: z.string().min(1, 'Informe o modelo.'),
  tipo: z.enum(TIPOS_INVERSOR),
  potCaNomW: z.coerce.number().positive('Potência CA deve ser > 0.'),
  mpptMinV: z.coerce.number().positive('MPPT mín deve ser > 0.'),
  mpptMaxV: z.coerce.number().positive('MPPT máx deve ser > 0.'),
  tensaoCcMaxV: z.coerce.number().positive('Tensão CC máx deve ser > 0.'),
  numMppt: z.coerce.number().int().positive('Nº de MPPT deve ser > 0.'),
  corrMaxMpptA: z.coerce.number().positive('Corrente/MPPT deve ser > 0.'),
  potFvMaxWp: z.coerce.number().positive('Potência FV máx deve ser > 0.'),
  potSurgeW: z.coerce.number().nullish(),
  tensaoCcBatV: z.coerce.number().nullish(),
  eficiencia: z.coerce.number().nullish(),
  backup: z.coerce.boolean().default(false),
  paralelismo: z.coerce.number().int().nullish(),
})
export type InversorData = z.infer<typeof inversorSchema>
export type EquipInversor = InversorData & { id: string }

// ---------- BATERIAS ----------
export const TECNOLOGIAS_BATERIA = ['LiFePO4', 'Lítio NMC', 'Chumbo-ácido', 'Gel', 'AGM'] as const
export const bateriaSchema = z.object({
  fabricante: z.string().min(1, 'Informe o fabricante.'),
  modelo: z.string().min(1, 'Informe o modelo.'),
  tecnologia: z.enum(TECNOLOGIAS_BATERIA),
  tensaoV: z.coerce.number().positive('Tensão deve ser > 0.'),
  capacidadeAh: z.coerce.number().positive('Capacidade deve ser > 0.'),
  energiaKwh: z.coerce.number().nullish(),
  corrMaxA: z.coerce.number().nullish(),
  corrRecomA: z.coerce.number().nullish(),
  dod: z.coerce.number().nullish(),
  socMin: z.coerce.number().nullish(),
  ciclos: z.coerce.number().int().nullish(),
  eficiencia: z.coerce.number().nullish(),
  garantiaAnos: z.coerce.number().int().nullish(),
})
export type BateriaData = z.infer<typeof bateriaSchema>
export type EquipBateria = BateriaData & { id: string }

// ---------- Mapeadores row<->objeto ----------
const nOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v))
const sOrNull = (v: unknown): string | null => (v === null || v === undefined ? null : String(v))

export function rowToPainel(r: Record<string, unknown>): EquipPainel {
  return {
    id: String(r.id),
    fabricante: String(r.fabricante),
    modelo: String(r.modelo),
    potenciaWp: Number(r.potencia_wp),
    voc: Number(r.voc),
    vmp: Number(r.vmp),
    isc: Number(r.isc),
    imp: Number(r.imp),
    areaM2: Number(r.area_m2),
    coefPmp: nOrNull(r.coef_pmp),
    coefVoc: nOrNull(r.coef_voc),
    noct: nOrNull(r.noct),
    eficiencia: nOrNull(r.eficiencia),
    pesoKg: nOrNull(r.peso_kg),
    garantiaAnos: nOrNull(r.garantia_anos),
  }
}
export function painelToRow(d: PainelData) {
  return {
    fabricante: d.fabricante, modelo: d.modelo, potencia_wp: d.potenciaWp,
    voc: d.voc, vmp: d.vmp, isc: d.isc, imp: d.imp, area_m2: d.areaM2,
    coef_pmp: d.coefPmp ?? null, coef_voc: d.coefVoc ?? null, noct: d.noct ?? null,
    eficiencia: d.eficiencia ?? null, peso_kg: d.pesoKg ?? null, garantia_anos: d.garantiaAnos ?? null,
  }
}

export function rowToInversor(r: Record<string, unknown>): EquipInversor {
  return {
    id: String(r.id),
    fabricante: String(r.fabricante),
    modelo: String(r.modelo),
    tipo: String(r.tipo) as EquipInversor['tipo'],
    potCaNomW: Number(r.pot_ca_nom_w),
    mpptMinV: Number(r.mppt_min_v),
    mpptMaxV: Number(r.mppt_max_v),
    tensaoCcMaxV: Number(r.tensao_cc_max_v),
    numMppt: Number(r.num_mppt),
    corrMaxMpptA: Number(r.corr_max_mppt_a),
    potFvMaxWp: Number(r.pot_fv_max_wp),
    potSurgeW: nOrNull(r.pot_surge_w),
    tensaoCcBatV: nOrNull(r.tensao_cc_bat_v),
    eficiencia: nOrNull(r.eficiencia),
    backup: Boolean(r.backup),
    paralelismo: nOrNull(r.paralelismo),
  }
}
export function inversorToRow(d: InversorData) {
  return {
    fabricante: d.fabricante, modelo: d.modelo, tipo: d.tipo, pot_ca_nom_w: d.potCaNomW,
    mppt_min_v: d.mpptMinV, mppt_max_v: d.mpptMaxV, tensao_cc_max_v: d.tensaoCcMaxV,
    num_mppt: d.numMppt, corr_max_mppt_a: d.corrMaxMpptA, pot_fv_max_wp: d.potFvMaxWp,
    pot_surge_w: d.potSurgeW ?? null, tensao_cc_bat_v: d.tensaoCcBatV ?? null,
    eficiencia: d.eficiencia ?? null, backup: d.backup, paralelismo: d.paralelismo ?? null,
  }
}

export function rowToBateria(r: Record<string, unknown>): EquipBateria {
  return {
    id: String(r.id),
    fabricante: String(r.fabricante),
    modelo: String(r.modelo),
    tecnologia: String(r.tecnologia) as EquipBateria['tecnologia'],
    tensaoV: Number(r.tensao_v),
    capacidadeAh: Number(r.capacidade_ah),
    energiaKwh: nOrNull(r.energia_kwh),
    corrMaxA: nOrNull(r.corr_max_a),
    corrRecomA: nOrNull(r.corr_recom_a),
    dod: nOrNull(r.dod),
    socMin: nOrNull(r.soc_min),
    ciclos: nOrNull(r.ciclos),
    eficiencia: nOrNull(r.eficiencia),
    garantiaAnos: nOrNull(r.garantia_anos),
  }
}
export function bateriaToRow(d: BateriaData) {
  return {
    fabricante: d.fabricante, modelo: d.modelo, tecnologia: d.tecnologia,
    tensao_v: d.tensaoV, capacidade_ah: d.capacidadeAh, energia_kwh: d.energiaKwh ?? null,
    corr_max_a: d.corrMaxA ?? null, corr_recom_a: d.corrRecomA ?? null, dod: d.dod ?? null,
    soc_min: d.socMin ?? null, ciclos: d.ciclos ?? null, eficiencia: d.eficiencia ?? null,
    garantia_anos: d.garantiaAnos ?? null,
  }
}

// evita "unused" caso algum mapeador não use sOrNull no futuro
void sOrNull
