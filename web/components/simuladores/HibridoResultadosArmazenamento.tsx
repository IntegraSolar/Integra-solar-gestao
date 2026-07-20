'use client'
import type { ResultadoBaterias, ResultadoInversor } from '@/lib/simuladores/hibrido/types'
import { BlocoValores } from './HibridoResultadosFV'

const n = (v: number, casas = 2) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
const pct = (v: number) => `${n(v * 100, 1)}%`

export function HibridoResultadosArmazenamento({
  bat, inv,
}: { bat: ResultadoBaterias; inv: ResultadoInversor }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <BlocoValores titulo="Banco de baterias" linhas={[
        { id: 'r-bat-tensao', label: 'Tensão do banco', valor: `${n(bat.tensaoBancoV, 0)} V` },
        { id: 'r-bat-dod-util', label: 'DOD útil', valor: pct(bat.dodUtil) },
        { id: 'r-bat-eta', label: 'η do sistema', valor: pct(bat.etaSistema) },
        { id: 'r-bat-energia-necessaria', label: 'Energia útil necessária', valor: `${n(bat.energiaUtilNecessariaKwh)} kWh` },
        { id: 'r-bat-energia-nominal', label: 'Energia nominal do banco', valor: `${n(bat.energiaNominalBancoKwh)} kWh` },
        { id: 'r-bat-serie-paralelo', label: 'Série × paralelo', valor: `${n(bat.bateriasSerie, 0)} × ${n(bat.stringsParalelo, 0)}` },
        { id: 'r-bat-num', label: 'Nº de baterias', valor: n(bat.numBaterias, 0) },
        { id: 'r-bat-energia-instalada', label: 'Energia instalada', valor: `${n(bat.energiaInstaladaKwh)} kWh` },
        { id: 'r-bat-capacidade', label: 'Capacidade do banco', valor: `${n(bat.capacidadeBancoAh, 0)} Ah` },
        { id: 'r-bat-energia-util', label: 'Energia útil real', valor: `${n(bat.energiaUtilRealKwh)} kWh` },
        { id: 'r-bat-autonomia', label: 'Autonomia real', valor: `${n(bat.autonomiaRealDias)} dias` },
        { id: 'r-bat-crate', label: 'C-rate de descarga', valor: n(bat.cRateDescarga) },
        { id: 'r-bat-recarga', label: 'Tempo de recarga', valor: `${n(bat.tempoRecargaH)} h` },
        { id: 'r-bat-vida', label: 'Vida útil estimada', valor: `${n(bat.vidaUtilAnos, 1)} anos` },
      ]} />

      <BlocoValores titulo="Inversor" linhas={[
        { id: 'r-inv-pot-minima', label: 'Potência CA mínima', valor: `${n(inv.potenciaCaMinimaW, 0)} W` },
        { id: 'r-inv-folga', label: 'Folga de potência', valor: `${n(inv.folgaPotenciaW, 0)} W` },
        { id: 'r-inv-utilizacao', label: 'Utilização contínua', valor: pct(inv.utilizacaoContinua) },
        { id: 'r-inv-surge', label: 'Relação surge / partida', valor: n(inv.relacaoSurgePartida) },
        { id: 'r-inv-uso-fv', label: 'Uso da entrada FV', valor: pct(inv.usoEntradaFv) },
        { id: 'r-inv-paralelo', label: 'Inversores em paralelo', valor: n(inv.numInversoresParalelo, 0) },
        { id: 'r-inv-pot-total', label: 'Potência CA total', valor: `${n(inv.potenciaCaTotalW, 0)} W` },
      ]} />
    </div>
  )
}
