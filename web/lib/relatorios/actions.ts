'use server'

import {
  getComercialData as _getComercialData,
  getLeadsData as _getLeadsData,
  getFinanceiroData as _getFinanceiroData,
  getTecnicoData as _getTecnicoData,
  getPosVendaData as _getPosVendaData,
  getSlaData as _getSlaData,
} from './queries'
import type { RelatorioFilter } from './queries'

export async function getComercialData(filter: RelatorioFilter) { return _getComercialData(filter) }
export async function getLeadsData(filter: RelatorioFilter) { return _getLeadsData(filter) }
export async function getFinanceiroData(filter: RelatorioFilter) { return _getFinanceiroData(filter) }
export async function getTecnicoData(filter: RelatorioFilter) { return _getTecnicoData(filter) }
export async function getPosVendaData(filter: RelatorioFilter) { return _getPosVendaData(filter) }
export async function getSlaData() { return _getSlaData() }
