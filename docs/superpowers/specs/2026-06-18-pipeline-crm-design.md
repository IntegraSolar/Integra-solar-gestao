# Pipeline CRM — Integra Solar Design Spec

## Objetivo

Construir uma plataforma de gestão de vendas e obras solares onde cada cliente percorre um pipeline linear de módulos. O cliente avança automaticamente entre módulos conforme gatilhos são ativados, garantindo que nenhuma informação, documento ou atividade seja esquecida na trilha da venda até a conclusão da obra.

## Arquitetura Geral

### Pipeline de módulos

```
CRM -> Clientes -> Contratos -> Financeiro -> Projetos + Compras ->
Comissoes -> Entrega do Material -> Obra -> Entrega da Obra -> Pos Obra
```

Cada módulo é uma página na sidebar que lista apenas os clientes que atingiram o gatilho de entrada daquele módulo.

### Tabela de gatilhos

| Módulo destino        | Gatilho de entrada                                              |
|-----------------------|-----------------------------------------------------------------|
| Clientes              | Lead convertido + abas 1-6 do cadastro completas               |
| Contratos             | Aba 7 (Contrato) com arquivo anexado                           |
| Financeiro            | Contrato marcado como assinado                                  |
| Projetos              | 1a parcela (entrada) confirmada no Financeiro                   |
| Compras               | 1a parcela (entrada) confirmada no Financeiro                   |
| Comissoes             | Compra realizada                                                |
| Entrega do Material   | Compra realizada                                                |
| Obra                  | Material entregue                                               |
| Entrega da Obra       | Obra concluida                                                  |
| Pos Obra              | Entrega da obra confirmada                                      |

### Campo Prazo (global)

Em todos os módulos, para cada cliente exibir: `X - Y`
- X = dias desde o pagamento da 1a parcela (entrada) ate hoje
- Y = prazo maximo configurado no contrato (em dias)

Ex: `15 - 45` = ja tem 15 dias de prazo, maximo e 45 dias.

---

## Modulo 1 — CRM / Leads

### Modelo de dados

```
leads
  id, org_id, created_by
  name, phone, city
  address, avg_kwh, installation_type, lead_source, notes
  stage_id          FK -> funnel_stages
  assigned_to       FK -> profiles
  converted         boolean
  converted_to_client_id  FK -> clients (nullable)
  created_at, updated_at

funnel_stages
  id, org_id
  name              ex: "Novo", "Em contato", "Visita agendada"
  position          integer (ordem drag & drop)
  color             texto hex opcional
  is_terminal_won   boolean
  is_terminal_lost  boolean

proposals
  id, org_id, lead_id, created_by
  name
  panel_qty, panel_power_w, panel_brand_model
  inverter_qty, inverter_power_w, inverter_brand_model
  kit_value, supplier
  system_power_kwp        calculado: (panel_qty x panel_power_w) / 1000
  avg_monthly_generation  calculado: system_power_kwp x fator_geracao_org
  status                  'rascunho' | 'enviada' | 'aprovada' | 'recusada'
  created_at

lead_notes
  id, lead_id, org_id, created_by
  content, created_at

lead_followups
  id, lead_id, org_id, created_by
  scheduled_at, description
  done  boolean
```

### Pagina /leads

- Toggle kanban / lista no canto superior direito
- Kanban: colunas por etapa do funil, cards arrastaveis entre colunas
- Lista: tabela com colunas nome, telefone, cidade, etapa, responsavel, data criacao — filtros e ordenacao
- Botao "+ Novo Lead" abre drawer lateral com campos basicos

### Drawer de detalhes do lead

Campos editaveis inline (basicos + completos), mais:
- Historico de contato (lista de anotacoes com data/autor)
- Follow-ups agendados (data, hora, descricao, status pendente/concluido)
- Aba "Propostas": lista propostas existentes + botao "+ Nova Proposta"
- Botao "Converter em Cliente" (visivel somente se converted = false)

### Proposta — campos e calculos

Campos manuais:
- Nome da proposta
- Quantidade de placas, potencia das placas (W), marca/modelo das placas
- Quantidade de inversores, potencia do inversor (W), marca/modelo do(s) inversor(es)
- Valor do kit, fornecedor

Campos calculados automaticamente:
- Potencia do sistema (kWp) = (qtd_placas x potencia_placa_w) / 1000
- Geracao media mensal (kWh/mes) = potencia_kwp x fator_geracao_org
  - fator_geracao_org configurado pelo integrador em Configuracoes

Dados do cliente pre-preenchidos na proposta: nome, cidade.

### Configuracao do funil

Botao "Configurar funil" na pagina /leads. Permite:
- Adicionar etapa
- Renomear etapa
- Reordenar via drag & drop
- Excluir etapa (obrigatorio mover leads existentes para outra etapa antes)

Cada org tem funil proprio. Etapas padrao criadas automaticamente ao criar a org:
Novo, Em contato, Visita agendada, Proposta enviada, Fechado, Perdido.

---

## Modulo 2 — Clientes (Cadastro Completo)

### Fluxo de conversao

1. Clicar "Converter em Cliente" no drawer do lead
2. Criar registro em `clients` com dados basicos copiados do lead
3. Redirecionar para /clientes/[id] com formulario de 8 abas
4. Lead marcado como converted = true

O cliente aparece na sidebar em "Clientes" somente apos abas 1-6 salvas.
O cliente aparece em "Contratos" somente apos aba 7 com arquivo anexado.

### Abas do cadastro

| # | Aba             | Gatilho ao completar                    |
|---|-----------------|------------------------------------------|
| 1 | Dados Pessoais  | —                                        |
| 2 | Equ. Vendidos   | —                                        |
| 3 | Venda e Fat.    | Cria parcelas em client_installments     |
| 4 | Vistoria        | —                                        |
| 5 | Prazos          | —                                        |
| 6 | Anexos          | —                                        |
| 7 | Contrato        | Libera modulo Contratos                  |
| 8 | Pasta Completa  | Visualizacao somente leitura (dossie)    |

### Modelo de dados

```
clients
  id, org_id, lead_id (FK)
  -- Aba 1
  type                  'pf' | 'pj'
  name, cpf_cnpj, email, phone
  zip, street, neighborhood, number, city, state
  -- Aba 2
  promised_kwh, system_power_kwp
  panel_brand, panel_power_w
  inverter_brand, inverter_power_w
  specific_panels       boolean
  specific_inverter     boolean
  direct_delivery       boolean
  viability_proposal_id FK -> proposals (nullable)
  -- Aba 4
  has_adaptation_works  boolean
  roof_type             'fibrocimento' | 'ceramica' | 'metalica' | 'laje' | outro
  roof_orientation
  maps_coordinates
  entry_breaker
  entry_cable_mm
  inspection_done       boolean
  client_notes
  extra_promises
  -- Aba 5
  delivery_start_date   date
  contract_date         date
  contract_max_days     integer (prazo maximo em dias)
  -- Pipeline
  pipeline_stage        enum (crm | clientes | contratos | financeiro | projetos | compras | comissoes | entrega_material | obra | entrega_obra | pos_obra)
  pipeline_flags        JSONB
  completed_tabs        JSONB { tab1: bool, tab2: bool, ... tab7: bool }

client_sale
  id, client_id, org_id
  sale_value, payment_method
  nf_notes
  commission_pct

client_installments
  id, client_id, org_id
  position              integer (1 = entrada)
  due_date, amount, notes
  status                'pendente' | 'confirmada'
  payment_proof_url
  confirmed_at

client_attachments
  id, client_id, org_id
  type                  enum (procuracao | conta_luz | rg_cnh | foto_disjuntor | foto_maps | foto_frente | proposta_formalizada | cotacao_material)
  file_url
  uploaded_at

client_contracts
  id, client_id, org_id
  contract_url
  power_of_attorney_url
  signed               boolean
  signed_at
```

---

## Modulo 3 — Contratos

**Gatilho de entrada:** client_contracts com arquivo anexado (contract_url preenchido)

- Lista clientes com contrato pendente de assinatura
- Status: `aguardando_assinatura` -> `assinado`
- Botao "Visualizar contrato" abre o arquivo anexado em nova aba
- Marcar como assinado e o gatilho para liberar Financeiro

---

## Modulo 4 — Financeiro

**Gatilho de entrada:** contrato assinado

- Lista todas as parcelas de todos os clientes (de client_installments)
- Cada parcela: nome do cliente, numero da parcela, vencimento, valor, status
- Confirmar parcela: mudar status para 'confirmada', upload de comprovante opcional
- Confirmar a 1a parcela (position = 1) e gatilho para liberar Projetos e Compras
- Filtros: por cliente, por status, por mes de vencimento
- Campo Prazo visivel por cliente (X - Y dias)

---

## Modulo 5 — Projetos

**Gatilho de entrada:** 1a parcela confirmada

```
client_projects
  id, client_id, org_id
  status                'pendente' | 'aguardando_procuracao' | 'enviado' | 'aprovado'
  designer_name         nome do projetista responsavel
  -- Dados do Projeto (modal)
  phase                 'monofasico' | 'bifasico' | 'trifasico'
  system_breaker        disjuntor do sistema
  standard_breaker      disjuntor padrao
  ca_system_wire        bitola cabo CA sistema
  ca_standard_wire      bitola cabo CA padrao
  grounding             aterramento
  standard_adequacy     adequacao de padrao
  created_at, updated_at
```

- Status configuravel com 4 opcoes: Pendente, Aguardando procuracao, Enviado, Aprovado
- Campo "Projetista responsavel"
- Botao "Dados do Projeto" abre modal com os campos tecnicos acima
- Campo Prazo visivel (X - Y dias)

---

## Modulo 6 — Compras

**Gatilho de entrada:** 1a parcela confirmada (mesmo gatilho que Projetos)

```
client_purchases
  id, client_id, org_id
  status  'aguardando' | 'compra_parcial' | 'compra_realizada'
  notes
  created_at, updated_at
```

- Status: Aguardando, Compra parcial, Compra realizada
- Marcar como "Compra realizada" libera Comissoes e Entrega do Material
- Campo Prazo visivel (X - Y dias)

---

## Modulo 7 — Comissoes

**Gatilho de entrada:** compra realizada

```
client_commissions
  id, client_id, org_id
  amount                calculado: sale_value x (commission_pct / 100)
  status                'pendente' | 'paga'
  paid_at
```

- Lista comissoes por venda
- Marcar como paga
- Campo Prazo visivel (X - Y dias)

---

## Modulo 8 — Entrega do Material

**Gatilho de entrada:** compra realizada

```
client_material_delivery
  id, client_id, org_id
  status   'aguardando' | 'entregue'
  delivered_at
  notes
```

- Marcar como entregue e gatilho para liberar Obra
- Campo Prazo visivel (X - Y dias)

---

## Modulo 9 — Obra

**Gatilho de entrada:** material entregue

```
client_works
  id, client_id, org_id
  status   'aguardando_inicio' | 'em_andamento' | 'concluida'
  started_at, finished_at
  notes
```

- Botao "Dados para equipe" abre modal com dados puxados da plataforma:
  - Nome do cliente, endereco completo, coordenadas Google Maps
  - Tipo de telhado, quantidade e potencia das placas, potencia do inversor
  - Todos os campos de "Dados do Projeto" (fase, disjuntores, bitolas, aterramento, adequacao)
- Modal com opcao de exportar como:
  - PDF (download)
  - Texto formatado (copiar para envio via WhatsApp)
- Marcar como concluida e gatilho para liberar Entrega da Obra
- Campo Prazo visivel (X - Y dias)

---

## Modulo 10 — Entrega da Obra

**Gatilho de entrada:** obra concluida

```
client_work_delivery
  id, client_id, org_id
  status   'pendente' | 'entregue'
  delivered_at
  notes
```

- Marcar como entregue e gatilho para liberar Pos Obra
- Campo Prazo visivel (X - Y dias)

---

## Modulo 11 — Pos Obra

**Gatilho de entrada:** entrega da obra confirmada

```
client_monitoring
  id, client_id, org_id
  monitoring_app
  username
  password
  status   'em_acompanhamento' | 'concluido'
```

- Botao "Monitoramento" por cliente abre modal com campos:
  - Aplicativo de monitoramento
  - Usuario
  - Senha
- Campo Prazo visivel (X - Y dias)

---

## Configuracoes da Organizacao

```
org_settings
  org_id
  generation_factor     float (fator de geracao media mensal para calculos de proposta)
  default_contract_days integer (prazo padrao do contrato em dias)
```

---

## Sidebar atualizada

Ordem dos itens no menu lateral:
1. Dashboard
2. CRM / Leads
3. Clientes
4. Contratos
5. Financeiro
6. Projetos
7. Compras
8. Comissoes
9. Entrega do Material
10. Obra
11. Entrega da Obra
12. Pos Obra
13. Configuracoes

---

## Decisoes tecnicas

- **Stack:** Next.js 14 App Router + TypeScript + Supabase (Postgres + RLS + Storage)
- **Arquivos:** upload via Supabase Storage, URL armazenada nas tabelas
- **Gatilhos:** logica de pipeline implementada em Server Actions ao salvar/confirmar dados
- **RLS:** todas as tabelas filtradas por org_id com Row Level Security
- **Calculos de proposta:** feitos no cliente (browser) em tempo real ao digitar
- **Export PDF obra:** gerado no browser via biblioteca (ex: jsPDF) ou via Edge Function
- **Funil configuravel:** etapas por org, posicao via drag & drop (dnd-kit)
- **Kanban:** dnd-kit para arrastar cards entre colunas

## Fora do escopo desta fase

- Calculos detalhados de dimensionamento da proposta (refinamento futuro)
- Notificacoes automaticas (email/WhatsApp) por gatilho
- Relatorios e dashboards avancados
- App mobile
