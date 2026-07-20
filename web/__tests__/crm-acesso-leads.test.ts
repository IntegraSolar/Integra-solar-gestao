import { describe, it, expect } from 'vitest'
import { podeVerTodosOsLeads, podeAcessarLead } from '@/lib/crm/acesso'

const EU = 'user-1'
const OUTRO = 'user-2'

const permLeads = (view_all: boolean) => ({
  leads: { access: true, view_all, add: true, edit: true, delete: true, export: false },
})

describe('podeVerTodosOsLeads', () => {
  it('proprietário vê tudo, mesmo sem view_all', () => {
    expect(podeVerTodosOsLeads('owner', permLeads(false))).toBe(true)
  })

  it('administrador vê tudo, mesmo sem view_all', () => {
    expect(podeVerTodosOsLeads('admin', permLeads(false))).toBe(true)
  })

  it('gerente vê tudo pelo preset (view_all ligado)', () => {
    expect(podeVerTodosOsLeads('gerente', permLeads(true))).toBe(true)
  })

  it('vendedor não vê tudo', () => {
    expect(podeVerTodosOsLeads('vendedor', permLeads(false))).toBe(false)
  })

  it('permissões ausentes não liberam o funil', () => {
    expect(podeVerTodosOsLeads('vendedor', {})).toBe(false)
    expect(podeVerTodosOsLeads('vendedor', { leads: undefined as any })).toBe(false)
  })
})

describe('podeAcessarLead', () => {
  it('quem vê tudo acessa lead de qualquer um', () => {
    expect(podeAcessarLead({ assigned_to_user_id: OUTRO, created_by: OUTRO }, EU, true)).toBe(true)
  })

  it('vendedor acessa lead em que é responsável', () => {
    expect(podeAcessarLead({ assigned_to_user_id: EU, created_by: OUTRO }, EU, false)).toBe(true)
  })

  it('vendedor acessa lead que ele criou', () => {
    expect(podeAcessarLead({ assigned_to_user_id: OUTRO, created_by: EU }, EU, false)).toBe(true)
  })

  it('vendedor NÃO acessa lead de outro vendedor', () => {
    expect(podeAcessarLead({ assigned_to_user_id: OUTRO, created_by: OUTRO }, EU, false)).toBe(false)
  })

  it('vendedor NÃO acessa lead sem responsável que não criou', () => {
    expect(podeAcessarLead({ assigned_to_user_id: null, created_by: OUTRO }, EU, false)).toBe(false)
  })

  it('lead órfão sem criador fica só para quem vê tudo', () => {
    expect(podeAcessarLead({ assigned_to_user_id: null, created_by: null }, EU, false)).toBe(false)
    expect(podeAcessarLead({ assigned_to_user_id: null, created_by: null }, EU, true)).toBe(true)
  })
})
