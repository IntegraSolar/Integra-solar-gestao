// web/lib/simuladores/hibrido/cargas-biblioteca-schemas.ts
// Biblioteca de cargas típicas: schema, mapeadores row<->objeto e a ponte para
// o tipo Carga do motor. Módulo puro (sem 'use server') para ser testável.
import { z } from 'zod'
import type { Carga } from './types'

export const CATEGORIAS_CARGA = [
  'Iluminação', 'Refrigeração', 'Aquecimento', 'Eletrônico', 'Motor', 'Outro',
] as const

export const PRIORIDADES_CARGA = ['Alta', 'Média', 'Baixa'] as const

export const cargaBibliotecaSchema = z
  .object({
    nome: z.string().min(1, 'Informe o nome da carga.'),
    categoria: z.enum(CATEGORIAS_CARGA).nullish(),
    potenciaUnitW: z.coerce.number().positive('Potência deve ser > 0.'),
    potenciaPartidaW: z.coerce.number().positive('Potência de partida deve ser > 0.'),
    tensaoV: z.coerce.number().positive('Tensão deve ser > 0.'),
    fatorPotencia: z.coerce.number().gt(0, 'FP deve ser > 0.').max(1, 'FP não pode passar de 1.'),
    horasDia: z.coerce.number().min(0).max(24, 'Horas/dia entre 0 e 24.'),
    diasSemana: z.coerce.number().int().min(1).max(7, 'Dias/semana entre 1 e 7.'),
    horaInicio: z.coerce.number().min(0).max(24, 'Hora entre 0 e 24.'),
    horaFim: z.coerce.number().min(0).max(24, 'Hora entre 0 e 24.'),
    prioridade: z.enum(PRIORIDADES_CARGA).nullish(),
    critica: z.coerce.boolean().default(false),
  })
  .refine((d) => d.potenciaPartidaW >= d.potenciaUnitW, {
    message: 'Potência de partida não pode ser menor que a nominal.',
    path: ['potenciaPartidaW'],
  })

export type CargaBibliotecaData = z.infer<typeof cargaBibliotecaSchema>
export type CargaBiblioteca = CargaBibliotecaData & { id: string }

export function rowToCargaBiblioteca(r: Record<string, unknown>): CargaBiblioteca {
  return {
    id: String(r.id),
    nome: String(r.nome),
    categoria: (r.categoria ?? null) as CargaBiblioteca['categoria'],
    potenciaUnitW: Number(r.potencia_unit_w),
    potenciaPartidaW: Number(r.potencia_partida_w),
    tensaoV: Number(r.tensao_v),
    fatorPotencia: Number(r.fator_potencia),
    horasDia: Number(r.horas_dia),
    diasSemana: Number(r.dias_semana),
    horaInicio: Number(r.hora_inicio),
    horaFim: Number(r.hora_fim),
    prioridade: (r.prioridade ?? null) as CargaBiblioteca['prioridade'],
    critica: Boolean(r.critica),
  }
}

export function cargaBibliotecaToRow(d: CargaBibliotecaData) {
  return {
    nome: d.nome,
    categoria: d.categoria ?? null,
    potencia_unit_w: d.potenciaUnitW,
    potencia_partida_w: d.potenciaPartidaW,
    tensao_v: d.tensaoV,
    fator_potencia: d.fatorPotencia,
    horas_dia: d.horasDia,
    dias_semana: d.diasSemana,
    hora_inicio: d.horaInicio,
    hora_fim: d.horaFim,
    prioridade: d.prioridade ?? null,
    critica: d.critica,
  }
}

/** Modelo da biblioteca → carga do levantamento, com quantidade 1. */
export function bibliotecaParaCarga(m: CargaBiblioteca): Carga {
  return {
    nome: m.nome,
    categoria: m.categoria ?? undefined,
    quantidade: 1,
    potenciaUnitW: m.potenciaUnitW,
    potenciaPartidaW: m.potenciaPartidaW,
    tensaoV: m.tensaoV,
    fatorPotencia: m.fatorPotencia,
    horasDia: m.horasDia,
    diasSemana: m.diasSemana,
    horaInicio: m.horaInicio,
    horaFim: m.horaFim,
    prioridade: m.prioridade ?? undefined,
    critica: m.critica,
  }
}

/** Duração da janela de uso em horas, tratando a volta da meia-noite. */
export function duracaoJanelaHoras(horaInicio: number, horaFim: number): number {
  if (horaFim === horaInicio) return 0
  return horaFim > horaInicio ? horaFim - horaInicio : 24 - horaInicio + horaFim
}
