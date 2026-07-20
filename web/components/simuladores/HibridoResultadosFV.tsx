'use client'
import type { ResultadoDimensionamento, ResultadoStrings } from '@/lib/simuladores/hibrido/types'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const CARD = 'rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4'

const n = (v: number, casas = 2) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
const pct = (v: number) => `${n(v * 100, 1)}%`

export type Linha = { id: string; label: string; valor: string }

export function BlocoValores({ titulo, linhas }: { titulo: string; linhas: Linha[] }) {
  return (
    <div className={CARD}>
      <h3 className="mb-2 text-sm font-semibold text-[var(--theme-text,#1a2340)]">{titulo}</h3>
      <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {linhas.map((l) => (
          <div key={l.id} className="flex justify-between border-b border-[var(--theme-border,#f1f2f7)] py-1 text-xs">
            <dt className="text-[var(--theme-text-muted,#7b8194)]">{l.label}</dt>
            <dd className="font-medium tabular-nums text-[var(--theme-text,#1a2340)]" data-testid={l.id}>{l.valor}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function HibridoResultadosFV({
  dim, strings,
}: { dim: ResultadoDimensionamento; strings: ResultadoStrings }) {
  const mesCritico = dim.mesCriticoIndice >= 0 ? MESES[dim.mesCriticoIndice] : '—'

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <BlocoValores titulo="Dimensionamento fotovoltaico" linhas={[
        { id: 'r-pr-base', label: 'PR base', valor: pct(dim.prBase) },
        { id: 'r-pr-efetivo', label: 'PR efetivo (sombra + orientação)', valor: pct(dim.prEfetivo) },
        { id: 'r-temp-celula', label: 'Temperatura de célula', valor: `${n(dim.tempCelulaC, 1)} °C` },
        { id: 'r-fator-temp', label: 'Fator de temperatura', valor: pct(dim.fatorTemperatura) },
        { id: 'r-pr-total', label: 'PR total', valor: pct(dim.prTotal) },
        { id: 'r-hsp-dim', label: 'HSP de dimensionamento', valor: n(dim.hspDimensionamento) },
        { id: 'r-mes-critico', label: 'Mês crítico', valor: mesCritico },
        { id: 'r-energia-modulo', label: 'Energia por módulo', valor: `${n(dim.energiaPorModuloKwhDia)} kWh/dia` },
        { id: 'r-num-recomendado', label: 'Nº de módulos recomendado', valor: n(dim.numModulosRecomendado, 0) },
        { id: 'r-num-modulos', label: 'Nº de módulos adotado', valor: n(dim.numModulos, 0) },
        { id: 'r-kwp', label: 'Potência instalada', valor: `${n(dim.potenciaInstaladaKwp)} kWp` },
        { id: 'r-area', label: 'Área necessária', valor: `${n(dim.areaTotalM2, 1)} m²` },
        { id: 'r-prod-diaria', label: 'Produção diária', valor: `${n(dim.producaoDiariaKwh)} kWh` },
        { id: 'r-prod-anual', label: 'Produção anual', valor: `${n(dim.producaoAnualKwh, 0)} kWh` },
        { id: 'r-oversizing', label: 'Oversizing DC/AC', valor: n(dim.oversizingDcAc) },
      ]} />

      <BlocoValores titulo="Arranjo e verificação elétrica" linhas={[
        { id: 'r-voc-tmin', label: 'Voc @ Tmin (por módulo)', valor: `${n(strings.vocTminV)} V` },
        { id: 'r-vmp-tmax', label: 'Vmp @ Tmax (por módulo)', valor: `${n(strings.vmpTmaxV)} V` },
        { id: 'r-max-mod-string', label: 'Máx. módulos por string', valor: n(strings.maxModulosPorString, 0) },
        { id: 'r-min-mod-string', label: 'Mín. módulos por string', valor: n(strings.minModulosPorString, 0) },
        { id: 'r-mod-string', label: 'Módulos por string (adotado)', valor: n(strings.modulosPorString, 0) },
        { id: 'r-num-strings', label: 'Nº de strings', valor: n(strings.numStrings, 0) },
        { id: 'r-tensao-voc', label: 'Tensão da string @ Tmin', valor: `${n(strings.tensaoStringVocTminV)} V` },
        { id: 'r-tensao-vmp', label: 'Tensão da string @ Tmax', valor: `${n(strings.tensaoStringVmpTmaxV)} V` },
        { id: 'r-corrente-projeto', label: 'Corrente de projeto (1,25×Isc)', valor: `${n(strings.correnteProjetoA)} A` },
        { id: 'r-corrente-mppt', label: 'Corrente por MPPT', valor: `${n(strings.correntePorMpptA)} A` },
        { id: 'r-mod-configurados', label: 'Módulos configurados', valor: n(strings.modulosConfigurados, 0) },
      ]} />
    </div>
  )
}
