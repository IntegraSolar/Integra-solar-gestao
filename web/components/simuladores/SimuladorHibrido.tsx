'use client'
import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { calcularHibrido } from '@/lib/simuladores/hibrido'
import {
  CAMPOS_INICIAIS, montarHibridoInput, montarPremissas,
  type CamposHibrido, type EquipamentosDisponiveis,
} from '@/lib/simuladores/hibrido/montar-input'
import type { Carga } from '@/lib/simuladores/hibrido/types'
import type { CargaBiblioteca } from '@/lib/simuladores/hibrido/cargas-biblioteca-schemas'
import { HibridoInputsProjeto } from './HibridoInputsProjeto'
import { HibridoSelecaoEquipamentos } from './HibridoSelecaoEquipamentos'
import { HibridoAvancado } from './HibridoAvancado'
import { HibridoResultadosFV } from './HibridoResultadosFV'
import { HibridoResultadosArmazenamento } from './HibridoResultadosArmazenamento'
import { HibridoProducaoMensal } from './HibridoProducaoMensal'
import { HibridoAlertas } from './HibridoAlertas'
import { CargasBuilder } from './CargasBuilder'
import {
  camposFinanceiroIniciais, fisicoParaFinanceiro, montarFinanceiroInput,
  type CamposFinanceiro,
} from '@/lib/simuladores/hibrido/montar-financeiro'
import { calcularFinanceiro } from '@/lib/simuladores/hibrido/financeiro'
import { calcularEconomiaAno } from '@/lib/simuladores/hibrido/economia'
import { PREMISSAS_FINANCEIRAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import { HibridoInputsFinanceiro } from './HibridoInputsFinanceiro'
import { HibridoResultadosCapex } from './HibridoResultadosCapex'
import { HibridoResultadosEconomia } from './HibridoResultadosEconomia'
import { HibridoIndicadores } from './HibridoIndicadores'
import { HibridoProjecao } from './HibridoProjecao'
import {
  salvarSimulacaoHibrido, getSimulacaoHibrido, deleteSimulacaoHibrido,
} from '@/lib/simuladores/hibrido/simulacoes-actions'
import type { SimulacaoResumo } from '@/lib/simuladores/hibrido/simulacoes-schemas'
import { montarSnapshot, lerSnapshot, mesclarEquipamentos } from '@/lib/simuladores/hibrido/snapshot'
import {
  HibridoIdentificacao, DADOS_PROJETO_INICIAL, type DadosProjeto,
} from './HibridoIdentificacao'
import { HibridoSimulacoesSalvas } from './HibridoSimulacoesSalvas'
import { gerarMemorialPdf } from '@/lib/simuladores/hibrido/memorial-pdf'
import { gerarRelatorioPdf } from '@/lib/simuladores/hibrido/relatorio-pdf'
import type { EmpresaProposta } from '@/lib/simuladores/proposta-empresa'

type Props = {
  equipamentos: EquipamentosDisponiveis
  biblioteca: CargaBiblioteca[]
  simulacoes: SimulacaoResumo[]
  empresa: EmpresaProposta
}

export function SimuladorHibrido({
  equipamentos: equipamentosIniciais, biblioteca: bibliotecaInicial, simulacoes, empresa,
}: Props) {
  const [campos, setCampos] = useState<CamposHibrido>(CAMPOS_INICIAIS)
  const [cargas, setCargas] = useState<Carga[]>([])
  const [biblioteca, setBiblioteca] = useState<CargaBiblioteca[]>(bibliotecaInicial)
  const [camposFin, setCamposFin] = useState<CamposFinanceiro>(() =>
    camposFinanceiroIniciais(new Date().getFullYear())
  )
  const [dadosProjeto, setDadosProjeto] = useState<DadosProjeto>(DADOS_PROJETO_INICIAL)
  // Catálogo pode crescer ao reabrir uma simulação cujo equipamento saiu do cadastro.
  const [equipamentos, setEquipamentos] = useState(equipamentosIniciais)
  const [msg, setMsg] = useState<{ text: string; erro: boolean } | null>(null)
  const [pending, start] = useTransition()

  // Uma única fonte: o input montado gera o resultado. Nenhum cálculo na UI.
  const premissas = useMemo(() => montarPremissas(campos), [campos])
  const input = useMemo(
    () => montarHibridoInput(campos, equipamentos, cargas),
    [campos, equipamentos, cargas]
  )
  const resultado = useMemo(() => calcularHibrido(input, premissas), [input, premissas])

  // Financeiro: deriva do resultado físico, sem recalcular nada na UI.
  const paramsFin = useMemo(
    () => montarFinanceiroInput(camposFin, fisicoParaFinanceiro(resultado)),
    [camposFin, resultado]
  )
  const financeiro = useMemo(() => calcularFinanceiro(paramsFin), [paramsFin])
  const economiaAno1 = useMemo(
    () => calcularEconomiaAno(1, {
      fisico: paramsFin.fisico,
      tarifas: paramsFin.tarifas,
      premissas: paramsFin.premissas ?? PREMISSAS_FINANCEIRAS_PADRAO,
    }),
    [paramsFin]
  )
  const temTarifa = paramsFin.tarifas.tarifaKwh > 0

  const baseDocumento = {
    dados: dadosProjeto,
    projeto: input.projeto,
    resultado,
    painel: input.painel,
    inversor: input.inversor,
    bateria: input.bateria,
    // Vem do painel avançado, não de DadosProjeto.
    tipoSistema: campos.tipoSistema,
  }

  async function memorialPdf() {
    await gerarMemorialPdf(baseDocumento, empresa)
  }

  async function relatorioPdf() {
    await gerarRelatorioPdf(
      {
        ...baseDocumento,
        financeiro,
        economiaAno1,
        camposFin,
        dataEmissao: new Date(),
      },
      empresa
    )
  }

  function salvar() {
    const snapshot = montarSnapshot(campos, camposFin, cargas, {
      painel: input.painel,
      inversor: input.inversor,
      bateria: input.bateria,
    })
    start(async () => {
      const num = (v: string) => (v.trim() === '' ? null : Number(v))
      const res = await salvarSimulacaoHibrido({
        nome: dadosProjeto.nome,
        snapshot,
        clienteNome: dadosProjeto.clienteNome || null,
        clienteCidade: dadosProjeto.clienteCidade || null,
        clienteUf: dadosProjeto.clienteUf || null,
        concessionaria: dadosProjeto.concessionaria || null,
        responsavelTecnico: dadosProjeto.responsavelTecnico || null,
        azimute: num(dadosProjeto.azimute),
        inclinacao: num(dadosProjeto.inclinacao),
        latitude: num(dadosProjeto.latitude),
        longitude: num(dadosProjeto.longitude),
        altitude: num(dadosProjeto.altitude),
        tipoLigacao: dadosProjeto.tipoLigacao || null,
        tensaoNominal: num(dadosProjeto.tensaoNominal),
        modoOperacao: dadosProjeto.modoOperacao || null,
        potenciaKwp: resultado.dimensionamento.potenciaInstaladaKwp,
        investimentoTotal: financeiro.capex.investimentoTotal,
        vpl: financeiro.indicadores.vpl,
        tir: financeiro.indicadores.tir,
        paybackAnos: financeiro.indicadores.paybackSimplesAnos,
      })
      if (res.error) { setMsg({ text: res.error, erro: true }); return }
      setMsg({ text: res.success ?? 'Simulação salva.', erro: false })
      window.location.reload()
    })
  }

  function reabrir(id: string) {
    if (!window.confirm('Reabrir esta simulação substitui o que está na tela. Continuar?')) return
    start(async () => {
      const sim = await getSimulacaoHibrido(id)
      const snap = sim ? lerSnapshot(sim.snapshot) : null
      if (!sim || !snap) {
        setMsg({ text: 'Não foi possível ler esta simulação salva.', erro: true })
        return
      }
      setEquipamentos((cat) => mesclarEquipamentos(cat, snap.equipamentos))
      setCampos(snap.campos)
      setCamposFin(snap.camposFin)
      setCargas(snap.cargas)
      const txt = (v: number | null) => (v === null ? '' : String(v))
      setDadosProjeto({
        nome: sim.nome,
        clienteNome: sim.clienteNome ?? '',
        clienteCidade: sim.clienteCidade ?? '',
        clienteUf: sim.clienteUf ?? '',
        concessionaria: sim.concessionaria ?? '',
        responsavelTecnico: sim.responsavelTecnico ?? '',
        azimute: txt(sim.azimute),
        inclinacao: txt(sim.inclinacao),
        latitude: txt(sim.latitude),
        longitude: txt(sim.longitude),
        altitude: txt(sim.altitude),
        tipoLigacao: sim.tipoLigacao ?? '',
        tensaoNominal: txt(sim.tensaoNominal),
        modoOperacao: sim.modoOperacao ?? '',
      })
      setMsg({ text: `Simulação "${sim.nome}" reaberta.`, erro: false })
    })
  }

  function excluir(id: string) {
    if (!window.confirm('Excluir esta simulação?')) return
    start(async () => {
      const res = await deleteSimulacaoHibrido(id)
      if (res.error) { setMsg({ text: res.error, erro: true }); return }
      window.location.reload()
    })
  }

  return (
    <div className="p-6">
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-xl font-bold text-[var(--theme-text,#1a2340)]">Simulador Híbrido / Off-grid</h1>
      </div>
      <p className="mb-4 text-sm text-[var(--theme-text-muted,#6b7280)]">
        Dimensionamento fotovoltaico, banco de baterias, inversor e análise financeira completa.
      </p>

      {msg && (
        <div
          className={`mb-3 text-sm ${msg.erro ? 'text-[#c0392b]' : 'text-[#1f9d55]'}`}
          data-testid={msg.erro ? 'erro-simulacao' : 'ok-simulacao'}
        >
          {msg.text}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3 text-xs">
        <Link href="/simuladores/hibrido-offgrid/equipamentos" className="text-[#3b6fd6] underline">
          Cadastro de equipamentos
        </Link>
        <Link href="/simuladores/hibrido-offgrid/cargas" className="text-[#3b6fd6] underline">
          Levantamento de cargas (tela dedicada)
        </Link>
      </div>

      <div className="space-y-4">
        <HibridoIdentificacao dados={dadosProjeto} onChange={setDadosProjeto} />
        <HibridoInputsProjeto campos={campos} onChange={setCampos} />
        <HibridoSelecaoEquipamentos campos={campos} equipamentos={equipamentos} onChange={setCampos} />

        <div className="rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4">
          <h2 className="mb-3 text-sm font-semibold text-[var(--theme-text,#1a2340)]">Cargas</h2>
          <CargasBuilder
            cargas={cargas}
            onCargasChange={setCargas}
            biblioteca={biblioteca}
            onBibliotecaChange={setBiblioteca}
            premissas={premissas}
          />
        </div>

        <HibridoAvancado campos={campos} onChange={setCampos} />

        <HibridoAlertas alertas={resultado.alertas} />
        <HibridoResultadosFV dim={resultado.dimensionamento} strings={resultado.strings} />
        <HibridoProducaoMensal producaoMensalKwh={resultado.dimensionamento.producaoMensalKwh} />
        <HibridoResultadosArmazenamento bat={resultado.baterias} inv={resultado.inversor} />

        <HibridoInputsFinanceiro campos={camposFin} onChange={setCamposFin} />
        <HibridoResultadosCapex capex={financeiro.capex} />

        {!temTarifa ? (
          <div
            className="rounded-lg border border-[#f0d9a8] bg-[#fff6e6] px-3 py-2 text-xs text-[#b26b00]"
            data-testid="aviso-sem-tarifa"
          >
            Informe a tarifa de energia acima para ver a economia, os indicadores de viabilidade
            e a projeção. Sem tarifa não há economia a calcular.
          </div>
        ) : (
          <>
            <HibridoResultadosEconomia economia={economiaAno1} />
            <HibridoIndicadores indicadores={financeiro.indicadores} />
            <HibridoProjecao projecao={financeiro.projecao} />
          </>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            data-testid="btn-memorial-pdf"
            disabled={!input.painel || !input.inversor}
            onClick={memorialPdf}
            className="rounded border px-4 py-2 text-sm font-semibold disabled:opacity-40"
          >
            Memorial descritivo (PDF)
          </button>
          <button
            type="button"
            data-testid="btn-relatorio-pdf"
            disabled={!input.painel || !input.inversor}
            onClick={relatorioPdf}
            className="rounded border px-4 py-2 text-sm font-semibold disabled:opacity-40"
          >
            Relatório executivo (PDF)
          </button>
          <button
            type="button"
            disabled={pending}
            data-testid="btn-salvar-simulacao"
            onClick={salvar}
            className="rounded bg-[#FF9F40] px-4 py-2 text-sm font-semibold text-[#1a1a1a] disabled:opacity-60"
          >
            Salvar simulação
          </button>
        </div>

        <HibridoSimulacoesSalvas simulacoes={simulacoes} onReabrir={reabrir} onExcluir={excluir} />
      </div>
    </div>
  )
}
