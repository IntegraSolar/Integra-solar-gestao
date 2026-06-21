# Sistema Global de Formatação — Design Spec

## Goal
Criar uma arquitetura centralizada de formatação, máscaras e validação. Dados armazenados sem formatação no banco; formatação aplicada exclusivamente na interface. Migrar todos os formulários e telas existentes para o novo sistema.

## Architecture

### Princípio central
- **Banco**: dados puros (ex: `12500.50`, `63999998888`, `12345678900`)
- **Interface**: dados formatados (ex: `R$ 12.500,50`, `(63) 99999-8888`, `123.456.789-00`)
- Nenhuma tela implementa lógica própria de formatação

### Camadas

```
lib/format/index.ts          ← FormatService: funções puras de formatação/mascaramento
components/ui/inputs/        ← Componentes de input com máscara integrada
components/ui/FormatDisplay  ← Componente de exibição formatada (tabelas, cards)
```

---

## FormatService — `web/lib/format/index.ts`

Funções puras (sem dependências, sem side effects). Exportadas individualmente e como objeto `fmt`.

```typescript
// Formatação para exibição
fmt.currency(v: number | string | null): string       // R$ 12.500,50
fmt.phone(v: string | null): string                   // (63) 99999-8888
fmt.cpf(v: string | null): string                     // 123.456.789-00
fmt.cnpj(v: string | null): string                    // 12.345.678/0001-99
fmt.cpfCnpj(v: string | null): string                 // detecta pelo tamanho
fmt.cep(v: string | null): string                     // 77000-000
fmt.date(v: string | null): string                    // 18/06/2026 (de ISO)
fmt.percent(v: number | string | null): string        // 15,50%
fmt.kwp(v: number | string | null): string            // 10,54 kWp
fmt.kwh(v: number | string | null, period?): string   // 1.250 kWh/mês
fmt.area(v: number | string | null): string           // 150,00 m²
fmt.weight(v: number | string | null): string         // 25,50 kg
fmt.number(v: number | string | null, decimals?): string // 1.234,56

// Limpeza (remove máscara → só dígitos/número para enviar ao banco)
fmt.clean(v: string): string                           // remove tudo exceto dígitos
fmt.cleanCurrency(v: string): number                   // "R$ 12.500,50" → 12500.50
fmt.toISODate(v: string): string                       // "18/06/2026" → "2026-06-18"

// Validação
fmt.validateCPF(v: string): boolean                   // valida 11 dígitos
fmt.validateCNPJ(v: string): boolean                  // valida 14 dígitos
fmt.validatePhone(v: string): boolean                 // valida 10 ou 11 dígitos
fmt.validateCEP(v: string): boolean                   // valida 8 dígitos
```

---

## Componentes de Input — `web/components/ui/inputs/`

Todos extendem o estilo do `Input` existente (`rgba(255,255,255,0.06)` background, bordas, cor).

Todos aceitam:
- `label?: string` — label acima
- `name?: string` — para formulários FormData (hidden input com valor raw)
- `value?: string | number` — modo controlado
- `onChange?: (raw: string | number) => void` — retorna valor SEM máscara
- `error?: string` — mensagem de erro abaixo
- `required?: boolean`

### CurrencyInput
- Exibe: `R$ 12.500,50`
- Comportamento de dígitos: usuário digita `12500` → `R$ 125,00` (centavos first)
- Hidden input envia valor como string numérica: `"12500.50"`
- `onChange` retorna `number`

### PhoneInput
- Máscara dinâmica: 10 dígitos → `(XX) XXXX-XXXX`, 11 dígitos → `(XX) XXXXX-XXXX`
- Hidden input envia só dígitos: `"63999998888"`
- Validação: mínimo 10 dígitos

### CpfCnpjInput
- Detecta pelo comprimento: ≤11 dígitos → CPF `000.000.000-00`, 14 dígitos → CNPJ `00.000.000/0000-00`
- Validação: exatamente 11 (CPF) ou 14 (CNPJ) dígitos
- Hidden input envia só dígitos

### CepInput
- Máscara: `00000-000`
- Validação: exatamente 8 dígitos
- Hidden input envia só dígitos

### DatePicker
- Biblioteca: `react-day-picker` (leve, sem dependências pesadas)
- Input exibe `dd/mm/aaaa`, ao clicar abre calendário visual
- Hidden input envia ISO: `"2026-06-18"`
- `onChange` retorna ISO string

### PercentInput
- Exibe: `15,50%`
- Aceita decimais com vírgula ou ponto
- Hidden input envia número: `"15.50"`
- `onChange` retorna `number`

---

## FormatDisplay — `web/components/ui/FormatDisplay.tsx`

Componente de exibição para tabelas, cards, dashboards:

```tsx
<FormatDisplay type="currency" value={12500.50} />        // R$ 12.500,50
<FormatDisplay type="phone" value="63999998888" />         // (63) 99999-8888
<FormatDisplay type="cpfCnpj" value="12345678900" />       // 123.456.789-00
<FormatDisplay type="date" value="2026-06-18" />           // 18/06/2026
<FormatDisplay type="percent" value={15.5} />              // 15,50%
<FormatDisplay type="kwp" value={10.54} />                 // 10,54 kWp
```

Props: `type`, `value`, `className`, `fallback` (string exibida quando value é null/undefined, default "—")

---

## Date Picker — detalhes

Instalar: `react-day-picker` + `date-fns`

```tsx
// Exemplo de uso
<DatePicker
  label="Data de vencimento"
  name="due_date"
  value="2026-06-18"         // ISO (do banco)
  onChange={(iso) => ...}    // recebe ISO
/>
// Exibe: "18/06/2026" no input
// Abre calendário ao clicar
// Hidden input envia: "2026-06-18"
```

Locale: pt-BR via `date-fns/locale/pt-BR`

---

## Migração — Mapa de arquivos

### Formulários com inputs que precisam de máscara:

| Arquivo | Campos a migrar |
|---|---|
| `clientes/[id]/tabs/Tab1DadosPessoais.tsx` | cpf_cnpj, phone, zip |
| `clientes/[id]/tabs/Tab3VendaFat.tsx` | sale_value, due_date (parcelas), amount (parcelas) |
| `clientes/[id]/tabs/Tab2EquVendidos.tsx` | kwp, valores |
| `clientes/[id]/tabs/Tab4Vistoria.tsx` | datas |
| `clientes/[id]/tabs/Tab5Prazos.tsx` | datas |
| `configuracoes/EmpresaTab.tsx` | cnpj, telefone, cep |
| `contratos/[id]/ContratoDetail.tsx` | datas, valores |
| `compras/[id]/CompraDetail.tsx` | valor, data |
| `financeiro/[id]/ParcelasClient.tsx` | valor, data |
| `comissoes/[id]/ComissaoDetail.tsx` | valor, percentual |
| `projetos/[id]/ProjetoDetail.tsx` | kwp, kwh, valores |
| `obra/[id]/ObraDetail.tsx` | datas |
| `entrega-material/[id]/EntregaMaterialDetail.tsx` | data |
| `entrega-obra/[id]/EntregaObraDetail.tsx` | data |
| `pos-obra/[id]/PosObraDetail.tsx` | data, nps |
| `estoque/EstoqueClient.tsx` | unit_value, quantity |
| `leads/LeadsClient.tsx` | phone, data |

### Exibições que precisam de FormatDisplay:

| Arquivo | Campos a formatar |
|---|---|
| `clientes/page.tsx` | phone, cpf_cnpj |
| `contratos/page.tsx` | valores, datas |
| `financeiro/FinanceiroPainelClient.tsx` | valores, datas |
| `comissoes/ComissoesPainelClient.tsx` | valores |
| `compras/page.tsx` | valores |
| `dashboard/KpiCards.tsx` | currency, kwp |
| `dashboard/MetaCard.tsx` | currency |
| `dashboard/FaturamentoChart.tsx` | currency (tooltip) |
| `relatorios/RelatoriosClient.tsx` | currency, percent, kwh |

---

## Integração com FormData (useFormState)

Para formulários que usam `useFormState` + Server Actions com `FormData`:

O componente renderiza:
1. Input visível com máscara (sem `name`)
2. Hidden input com valor raw e `name` correto

```tsx
// Internamente no CurrencyInput:
<>
  <input value="R$ 12.500,50" onChange={handleChange} />           // display
  <input type="hidden" name={name} value="12500.50" />              // FormData
</>
```

Server action recebe `formData.get('sale_value')` → `"12500.50"` → `parseFloat()`.

---

## Tech Stack
- Next.js 14 App Router, TypeScript
- `react-day-picker` + `date-fns` para date picker
- Sem dependências de máscara externa (implementação própria, mais leve e controlada)
- Glassmorphism theme: estilo idêntico ao `Input` existente
