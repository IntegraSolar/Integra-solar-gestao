// web/lib/simuladores/hibrido/memorial-conteudo.ts
// Monta o conteúdo do Memorial descritivo. Função PURA: recebe os resultados e
// devolve as seções prontas. O risco real deste documento não é o desenho no
// PDF — é imprimir o valor certo na frase errada, e é isso que os testes cobrem.
import type { DadosMemorial, SecaoDocumento } from './documento-tipos'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

const n = (v: number, casas = 2) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

/** Campo descritivo não informado vira travessão — nunca "undefined" ou "NaN". */
const ou = (v: string, sufixo = '') => (v.trim() === '' ? '—' : `${v.trim()}${sufixo}`)

export function montarMemorial(d: DadosMemorial): SecaoDocumento[] {
  const { dados, projeto, resultado, painel, inversor, bateria } = d
  const dim = resultado.dimensionamento
  const mesCritico = dim.mesCriticoIndice >= 0 ? MESES[dim.mesCriticoIndice] : '—'
  const cobertura = resultado.cargas.consumoAnualKwh > 0
    ? dim.producaoAnualKwh / resultado.cargas.consumoAnualKwh
    : 0

  const armazenamento: SecaoDocumento = bateria
    ? {
        titulo: '6. Armazenamento (banco de baterias)',
        linhas: [
          { rotulo: 'Nº de baterias', valor: n(resultado.baterias.numBaterias, 0) },
          { rotulo: 'Modelo', valor: `${bateria.fabricante} ${bateria.modelo}` },
          { rotulo: 'Energia nominal instalada', valor: `${n(resultado.baterias.energiaInstaladaKwh)} kWh` },
          { rotulo: 'Tensão do banco', valor: `${n(resultado.baterias.tensaoBancoV, 0)} V` },
          { rotulo: 'Autonomia estimada', valor: `${n(resultado.baterias.autonomiaRealDias, 1)} dias` },
        ],
      }
    : {
        titulo: '6. Armazenamento (banco de baterias)',
        paragrafos: [
          'O sistema não contempla armazenamento em baterias, operando conectado à rede da concessionária.',
        ],
      }

  return [
    {
      titulo: '1. Objetivo',
      paragrafos: [
        `Este memorial descreve as especificações técnicas do sistema solar fotovoltaico projetado para ${ou(dados.clienteNome)}, na cidade de ${ou(dados.clienteCidade)}/${ou(dados.clienteUf)}. Contempla o dimensionamento do gerador fotovoltaico, do sistema de conversão e armazenamento, as proteções elétricas e a estimativa de geração de energia, em conformidade com as normas técnicas vigentes.`,
      ],
    },
    {
      titulo: '2. Dados gerais do empreendimento',
      linhas: [
        { rotulo: 'Cliente', valor: ou(dados.clienteNome) },
        { rotulo: 'Concessionária', valor: ou(dados.concessionaria) },
        { rotulo: 'Tipo de sistema', valor: ou(d.tipoSistema) },
        { rotulo: 'Modo de operação', valor: ou(dados.modoOperacao) },
        { rotulo: 'Tipo de ligação', valor: ou(dados.tipoLigacao) },
        { rotulo: 'Tensão nominal', valor: ou(dados.tensaoNominal, ' V') },
        { rotulo: 'Responsável técnico', valor: ou(dados.responsavelTecnico) },
      ],
    },
    {
      titulo: '3. Localização e condições climáticas',
      linhas: [
        { rotulo: 'Latitude', valor: ou(dados.latitude, '°') },
        { rotulo: 'Longitude', valor: ou(dados.longitude, '°') },
        { rotulo: 'Altitude', valor: ou(dados.altitude, ' m') },
        { rotulo: 'Irradiação média (HSP)', valor: `${n(dim.hspMediaAnual)} kWh/m²·dia` },
        { rotulo: 'Mês crítico', valor: mesCritico },
        { rotulo: 'Temperatura média', valor: `${n(projeto.tempMediaC, 0)} °C` },
        { rotulo: 'Temperatura máxima', valor: `${n(projeto.tempMaxC, 0)} °C` },
        { rotulo: 'Temperatura mínima', valor: `${n(projeto.tempMinC, 0)} °C` },
      ],
    },
    {
      titulo: '4. Gerador fotovoltaico',
      linhas: [
        { rotulo: 'Nº de módulos', valor: n(dim.numModulos, 0) },
        { rotulo: 'Modelo', valor: painel ? `${painel.fabricante} ${painel.modelo}` : '—' },
        { rotulo: 'Potência unitária', valor: painel ? `${n(painel.potenciaWp, 0)} Wp` : '—' },
        { rotulo: 'Potência instalada', valor: `${n(dim.potenciaInstaladaKwp)} kWp` },
        { rotulo: 'Área ocupada', valor: `${n(dim.areaTotalM2, 1)} m²` },
        { rotulo: 'Azimute', valor: ou(dados.azimute, '°') },
        { rotulo: 'Inclinação', valor: ou(dados.inclinacao, '°') },
      ],
    },
    {
      titulo: '5. Sistema de conversão (inversor)',
      linhas: [
        { rotulo: 'Nº de inversores', valor: n(resultado.inversor.numInversoresParalelo, 0) },
        { rotulo: 'Modelo', valor: inversor ? `${inversor.fabricante} ${inversor.modelo}` : '—' },
        { rotulo: 'Potência CA total', valor: `${n(resultado.inversor.potenciaCaTotalW, 0)} W` },
      ],
    },
    armazenamento,
    {
      titulo: '7. Arranjo elétrico e dimensionamento',
      linhas: [
        { rotulo: 'Módulos por string', valor: n(resultado.strings.modulosPorString, 0) },
        { rotulo: 'Nº de strings', valor: n(resultado.strings.numStrings, 0) },
        { rotulo: 'Tensão da string a Tmín', valor: `${n(resultado.strings.tensaoStringVocTminV)} V` },
        { rotulo: 'Corrente de projeto', valor: `${n(resultado.strings.correnteProjetoA)} A` },
        { rotulo: 'Relação DC/AC', valor: n(dim.oversizingDcAc) },
        { rotulo: 'HSP de dimensionamento', valor: `${n(dim.hspDimensionamento)} kWh/m²·dia` },
        { rotulo: 'Performance Ratio', valor: `${n(dim.prTotal * 100, 1)}%` },
      ],
    },
    {
      titulo: '8. Proteções e aterramento',
      paragrafos: [
        'As proteções de corrente contínua incluem dispositivo de proteção contra surtos (DPS), fusíveis de string e chave seccionadora sob carga. No lado de corrente alternada, preveem-se disjuntor termomagnético e DPS.',
        'Todo o sistema será aterrado conforme a ABNT NBR 5410 e a ABNT NBR 16690, com condutor de proteção dedicado e equipotencialização das estruturas metálicas.',
      ],
    },
    {
      titulo: '9. Estimativa de geração',
      linhas: [
        { rotulo: 'Geração anual estimada', valor: `${n(dim.producaoAnualKwh, 0)} kWh` },
        { rotulo: 'Média diária', valor: `${n(dim.producaoDiariaKwh, 1)} kWh` },
        { rotulo: 'Consumo anual da unidade', valor: `${n(resultado.cargas.consumoAnualKwh, 0)} kWh` },
        { rotulo: 'Cobertura do consumo', valor: `${n(cobertura * 100, 1)}%` },
      ],
    },
    {
      titulo: '10. Normas aplicáveis',
      paragrafos: [
        'ABNT NBR 16690 — Instalações elétricas de arranjos fotovoltaicos.',
        'ABNT NBR 16149 e 16150 — Interface de conexão inversor–rede.',
        'ABNT NBR 5410 — Instalações elétricas de baixa tensão.',
        'ABNT NBR 5419 — Proteção contra descargas atmosféricas.',
        'Resolução Normativa ANEEL nº 1.059/2023 e Lei nº 14.300/2022 — marco legal da micro e minigeração distribuída.',
      ],
    },
    {
      titulo: '11. Conclusão',
      paragrafos: [
        'O sistema descrito atende aos requisitos técnicos e normativos aplicáveis, apresentando dimensionamento compatível com o consumo levantado e as condições locais informadas. Recomenda-se a execução conforme as especificações deste memorial e das normas vigentes.',
      ],
    },
  ]
}
