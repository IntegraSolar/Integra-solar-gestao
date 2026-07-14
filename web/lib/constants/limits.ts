// Teto de itens carregados de uma vez nas telas operacionais (working set ativo:
// projetos, obras, compras, contratos, entrega de material, pós-obra).
// Acima disso a lista é truncada e a tela avisa, orientando o uso de filtros —
// evita carregar a organização inteira sem paginação quando o volume crescer.
// Mesmo espírito do teto do funil no kanban (FUNNEL_MAX).
export const OPERACIONAL_MAX = 500
