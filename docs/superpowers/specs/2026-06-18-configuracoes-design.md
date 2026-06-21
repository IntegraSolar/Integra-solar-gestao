# Configurações — Design Spec

## Goal
Página `/configuracoes` com 3 abas: Empresa (dados + cálculos + origens de lead + meta), Acesso (criar/listar colaboradores + permissões por módulo) e Auditoria (log paginado de ações).

## Architecture

### Novas tabelas

**`org_config`** — uma linha por organização, colunas flat para configurações da empresa:
- Dados da empresa: `razao_social`, `nome_fantasia`, `cnpj`, `email`, `telefone`, `cep`, `endereco`, `bairro`, `numero`, `cidade`, `estado`, `cor_principal`, `cor_secundaria`, `concessionaria`, `logo_url`
- Dados bancários: `banco`, `agencia`, `conta`, `tipo_chave_pix`, `pix`
- Dados de cálculo: `kwh_por_kwp`, `valor_projeto_por_kwp`, `valor_instalacao_por_placa`, `pct_material_ca`, `quilometragem`, `pct_comissao`, `pct_imposto`, `pct_margem`
- Meta: `meta_anual` (numeric — dividida por 12 no dashboard)

**`audit_logs`** — log de ações:
- `id`, `organization_id`, `user_id`, `user_name`, `action`, `description`, `created_at`

**Coluna `permissions` JSONB em `organization_members`** — permissões granulares por módulo:
```json
{
  "leads": { "access": true, "view_all": false, "add": true, "edit": true, "delete": false },
  "clientes": { ... }
}
```

**`lead_sources`** — já existe. Apenas adicionar CRUD na UI.

### Roles

Manter `owner` (dono da conta). Estender check constraint para incluir: `admin`, `gerente`, `vendedor`, `instalador`, `projetista`.

### Criação de colaboradores

Server action com cliente Supabase admin (service role):
1. `supabase.auth.admin.createUser({ email, password, email_confirm: true })`
2. Atualizar `profiles` com `full_name`
3. Inserir em `organization_members` com `role` e `permissions`

### Auditoria

Helper `logAction(action: string, description: string)` chamado de dentro dos server actions.
IP via `headers()['x-forwarded-for']` — não armazenado por simplicidade (opcional).

### Permissões — enforcement

- **Sidebar**: filtra itens de navegação baseado em `permissions[module].access`
- **Layout do dashboard**: lê permissions do usuário e passa via Context ou props
- **Server actions**: verificam `permissions[module].edit/add/delete` antes de executar
- Owner e admin têm acesso total implícito (sem verificar permissions)

---

## Pages

### `/configuracoes` — page.tsx (Server Component)
Carrega `org_config`, `lead_sources`, `organization_members` + renderiza `ConfiguracoesClient`

### `ConfiguracoesClient.tsx` (Client Component)
Tabs: `empresa` | `acesso` | `auditoria`

#### Aba Empresa
- Seção 1: Dados da empresa (formulário com todos os campos)
- Seção 2: Dados para cálculo (campos numéricos)
- Seção 3: Dados bancários
- Seção 4: Meta anual
- Seção 5: Origens de lead (lista + adicionar/remover)
- Botão "Salvar" por seção ou um único botão global

#### Aba Acesso
- Lista de membros: nome, e-mail, papel, ações (desativar)
- Formulário "Adicionar colaborador": nome, e-mail, senha, papel, permissões por módulo
- Tabela de permissões: módulo × (Acessar | Ver todos | Adicionar | Editar | Excluir)

#### Aba Auditoria
- Tabela paginada: usuário, ação, descrição, data
- 20 itens por página, navegação anterior/próximo

---

## Módulos para permissões

| Chave | Label |
|---|---|
| `dashboard` | Dashboard |
| `leads` | CRM / Leads |
| `clientes` | Clientes |
| `contratos` | Contratos |
| `financeiro` | Financeiro |
| `projetos` | Projetos |
| `compras` | Compras |
| `comissoes` | Comissões |
| `entrega_material` | Entrega do Material |
| `obra` | Obra |
| `entrega_obra` | Entrega da Obra |
| `pos_obra` | Pós-Obra |
| `configuracoes` | Configurações |

---

## Tech Stack
- Next.js 14 App Router, TypeScript, Supabase, glassmorphism theme (navy + `#FFD080`)
- `(supabase as any)` para tabelas novas
- Server Actions com `'use server'`
- `useTransition` no client para chamar actions
