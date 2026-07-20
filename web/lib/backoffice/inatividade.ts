// web/lib/backoffice/inatividade.ts

/**
 * Alerta de inatividade da empresa.
 *
 * Atividade = criação de propostas. Movimentação de pipeline ficou de fora
 * porque o sistema não registra histórico de mudança de etapa — `leads.updated_at`
 * também muda em qualquer edição do lead, o que tornaria a medida imprecisa.
 */

export type Inatividade = {
  tipo: 'ativa' | 'inativa' | 'nunca_usou'
  dias_uteis: number
  /** 0 = sem alerta; 1 a 5 conforme os dias úteis parados (satura em 5). */
  nivel: 0 | 1 | 2 | 3 | 4 | 5
}

const UM_DIA_MS = 24 * 60 * 60 * 1000

function paraDataUTC(iso: string): Date {
  // Normaliza para meia-noite UTC: a comparação é por dia, não por hora.
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`)
}

/**
 * Dias úteis decorridos entre duas datas (YYYY-MM-DD), excluindo a data inicial
 * e incluindo a final. Sábado e domingo não contam — sem eles, toda segunda-feira
 * as empresas apareceriam com 2 dias de inatividade só pelo fim de semana.
 */
export function diasUteisEntre(de: string, ate: string): number {
  const inicio = paraDataUTC(de)
  const fim = paraDataUTC(ate)
  if (fim <= inicio) return 0

  let dias = 0
  for (let t = inicio.getTime() + UM_DIA_MS; t <= fim.getTime(); t += UM_DIA_MS) {
    const diaDaSemana = new Date(t).getUTCDay()
    if (diaDaSemana !== 0 && diaDaSemana !== 6) dias++
  }
  return dias
}

export function classificarInatividade(
  ultimaPropostaISO: string | null,
  hoje: string
): Inatividade {
  if (!ultimaPropostaISO) return { tipo: 'nunca_usou', dias_uteis: 0, nivel: 0 }

  const dias = diasUteisEntre(ultimaPropostaISO, hoje)
  if (dias <= 0) return { tipo: 'ativa', dias_uteis: 0, nivel: 0 }

  const nivel = Math.min(dias, 5) as 1 | 2 | 3 | 4 | 5
  return { tipo: 'inativa', dias_uteis: dias, nivel }
}

/** Cor e rótulo do alerta, compartilhados entre o dashboard e a lista. */
export const NIVEL_ESTILO: Record<number, { cor: string; rotulo: string }> = {
  0: { cor: '#12805C', rotulo: 'Ativa' },
  1: { cor: '#B45309', rotulo: '1 dia útil' },
  2: { cor: '#B45309', rotulo: '2 dias úteis' },
  3: { cor: '#C2410C', rotulo: '3 dias úteis' },
  4: { cor: '#C2410C', rotulo: '4 dias úteis' },
  5: { cor: '#C11B1B', rotulo: '5+ dias úteis' },
}
