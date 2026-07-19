// web/lib/simuladores/hibrido/alertas.ts
// Verificações normativas do dimensionamento (NBR 16690 / 16274 / 5410).
// Emite um alerta por verificação: severidade da tabela quando a condição de
// erro ocorre, 'ok' quando não ocorre, e nada quando faltam dados para avaliar.
import type { Alerta, CodigoAlerta, SeveridadeAlerta } from './types'

export type ParamsAlertas = {
  temPainel: boolean
  temInversor: boolean
  temBateria: boolean
  tensaoStringVocTminV: number
  tensaoCcMaxV: number
  tensaoStringVmpTmaxV: number
  mpptMinV: number
  correntePorMpptA: number
  corrMaxMpptA: number
  oversizingDcAc: number
  dcAcMax: number
  dcAcMin: number
  potenciaInstaladaW: number
  potFvMaxWp: number
  modulosConfigurados: number
  numModulos: number
  producaoDiariaKwh: number
  consumoDiarioKwh: number
  potenciaSimultaneaW: number
  potCaNomW: number
  potSurgeW: number | null
  potenciaPartidaW: number
  tensaoBancoV: number
  tensaoCcBatV: number | null
  correnteDescargaA: number
  correnteContinuaA: number
  autonomiaRealDias: number
  diasAutonomia: number
  tipoInversor: 'Híbrido' | 'Off-grid' | 'On-grid' | null
  tipoSistema: 'Híbrido' | 'Off-grid' | 'On-grid' | null
}

function alerta(
  codigo: CodigoAlerta,
  condicaoErro: boolean,
  severidadeErro: SeveridadeAlerta,
  mensagemErro: string,
  mensagemOk: string,
  valor?: number,
  limite?: number
): Alerta {
  return condicaoErro
    ? { codigo, severidade: severidadeErro, mensagem: mensagemErro, valor, limite }
    : { codigo, severidade: 'ok', mensagem: mensagemOk, valor, limite }
}

export function calcularAlertas(p: ParamsAlertas): Alerta[] {
  const alertas: Alerta[] = []

  const faltaDado =
    !p.temPainel || !p.temInversor || p.consumoDiarioKwh <= 0
  if (faltaDado) {
    alertas.push({
      codigo: 'DADOS_INSUFICIENTES',
      severidade: 'erro',
      mensagem: 'Selecione painel e inversor e cadastre ao menos uma carga para dimensionar.',
    })
  }

  if (p.temPainel && p.temInversor) {
    alertas.push(alerta('SOBRETENSAO',
      p.tensaoStringVocTminV > p.tensaoCcMaxV, 'erro',
      'Tensão da string no frio excede a tensão CC máxima do inversor.',
      'Tensão da string dentro do limite CC do inversor.',
      p.tensaoStringVocTminV, p.tensaoCcMaxV))

    alertas.push(alerta('SUBTENSAO_MPPT',
      p.tensaoStringVmpTmaxV < p.mpptMinV, 'erro',
      'Tensão da string no calor fica abaixo do MPPT mínimo.',
      'Tensão da string acima do MPPT mínimo.',
      p.tensaoStringVmpTmaxV, p.mpptMinV))

    alertas.push(alerta('CORRENTE_MPPT',
      p.correntePorMpptA > p.corrMaxMpptA, 'erro',
      'Corrente por MPPT excede o limite do inversor.',
      'Corrente por MPPT dentro do limite.',
      p.correntePorMpptA, p.corrMaxMpptA))

    alertas.push(alerta('OVERSIZING_ALTO',
      p.oversizingDcAc > p.dcAcMax, 'aviso',
      'Relação DC/AC acima do máximo recomendado.',
      'Relação DC/AC dentro do recomendado.',
      p.oversizingDcAc, p.dcAcMax))

    alertas.push(alerta('SUBDIMENSIONADO_FV',
      p.oversizingDcAc < p.dcAcMin, 'aviso',
      'Relação DC/AC abaixo do mínimo: gerador FV subdimensionado.',
      'Gerador FV não está subdimensionado.',
      p.oversizingDcAc, p.dcAcMin))

    alertas.push(alerta('POT_FV_EXCEDE',
      p.potenciaInstaladaW > p.potFvMaxWp, 'erro',
      'Potência FV instalada excede a máxima suportada pelo inversor.',
      'Potência FV dentro do máximo do inversor.',
      p.potenciaInstaladaW, p.potFvMaxWp))

    alertas.push(alerta('CONFIG_DIVERGE',
      p.modulosConfigurados !== p.numModulos, 'aviso',
      'Arranjo configurado (strings × módulos) difere do número de módulos definido.',
      'Arranjo configurado bate com o número de módulos.',
      p.modulosConfigurados, p.numModulos))

    alertas.push(alerta('GERACAO_INSUFICIENTE',
      p.producaoDiariaKwh < p.consumoDiarioKwh, 'aviso',
      'Geração diária estimada não cobre o consumo diário.',
      'Geração diária cobre o consumo.',
      p.producaoDiariaKwh, p.consumoDiarioKwh))

    alertas.push(alerta('POTENCIA_CONTINUA',
      p.potenciaSimultaneaW > p.potCaNomW, 'erro',
      'Potência simultânea das cargas excede a potência nominal CA do inversor.',
      'Potência contínua dentro da nominal do inversor.',
      p.potenciaSimultaneaW, p.potCaNomW))

    if (p.potSurgeW != null) {
      alertas.push(alerta('SURGE_INSUFICIENTE',
        p.potSurgeW < p.potenciaPartidaW, 'erro',
        'Potência de surge do inversor não cobre a partida das cargas.',
        'Surge do inversor cobre a partida das cargas.',
        p.potSurgeW, p.potenciaPartidaW))
    }

    if (p.tipoInversor && p.tipoSistema) {
      alertas.push(alerta('TIPO_INVERSOR',
        p.tipoInversor !== p.tipoSistema, 'aviso',
        'Tipo do inversor não corresponde ao tipo de sistema selecionado.',
        'Tipo do inversor compatível com o sistema.'))
    }
  }

  if (p.temBateria) {
    if (p.tensaoCcBatV != null) {
      alertas.push(alerta('TENSAO_BANCO',
        p.tensaoBancoV !== p.tensaoCcBatV, 'aviso',
        'Tensão do banco difere da tensão CC de bateria do inversor.',
        'Tensão do banco compatível com o inversor.',
        p.tensaoBancoV, p.tensaoCcBatV))
    }

    alertas.push(alerta('CRATE_EXCEDIDO',
      p.correnteDescargaA > p.correnteContinuaA, 'aviso',
      'Corrente de descarga acima da recomendada para o banco.',
      'Corrente de descarga dentro da recomendada.',
      p.correnteDescargaA, p.correnteContinuaA))

    alertas.push(alerta('AUTONOMIA_ABAIXO',
      p.autonomiaRealDias < p.diasAutonomia, 'aviso',
      'Autonomia real do banco abaixo do alvo de dias.',
      'Autonomia real atende o alvo.',
      p.autonomiaRealDias, p.diasAutonomia))
  }

  return alertas
}
