import { describe, it, expect } from 'vitest'
import { parseHspColado } from '@/lib/simuladores/hibrido/montar-input'

const ESPERADO = [4.75, 4.71, 4.7, 5.16, 5.56, 5.69, 5.82, 5.91, 5.71, 5.42, 4.96, 4.78]

describe('parseHspColado', () => {
  it('vírgula decimal, separado por espaço', () => {
    expect(parseHspColado('4,75 4,71 4,70 5,16 5,56 5,69 5,82 5,91 5,71 5,42 4,96 4,78')).toEqual(ESPERADO)
  })
  it('ponto decimal, separado por espaço', () => {
    expect(parseHspColado('4.75 4.71 4.70 5.16 5.56 5.69 5.82 5.91 5.71 5.42 4.96 4.78')).toEqual(ESPERADO)
  })
  it('ponto decimal com vírgula separando a lista', () => {
    expect(parseHspColado('4.75, 4.71, 4.70, 5.16, 5.56, 5.69, 5.82, 5.91, 5.71, 5.42, 4.96, 4.78')).toEqual(ESPERADO)
  })
  it('separado por quebra de linha', () => {
    expect(parseHspColado('4,75\n4,71\n4,70\n5,16\n5,56\n5,69\n5,82\n5,91\n5,71\n5,42\n4,96\n4,78')).toEqual(ESPERADO)
  })
  it('separado por tabulação (colagem de planilha)', () => {
    expect(parseHspColado('4,75\t4,71\t4,70\t5,16\t5,56\t5,69\t5,82\t5,91\t5,71\t5,42\t4,96\t4,78')).toEqual(ESPERADO)
  })
  it('separado por ponto-e-vírgula', () => {
    expect(parseHspColado('4,75;4,71;4,70;5,16;5,56;5,69;5,82;5,91;5,71;5,42;4,96;4,78')).toEqual(ESPERADO)
  })
  it('ignora espaços nas pontas', () => {
    expect(parseHspColado('   4,75 4,71 4,70 5,16 5,56 5,69 5,82 5,91 5,71 5,42 4,96 4,78   ')).toEqual(ESPERADO)
  })
  it('aceita inteiros sem separador decimal', () => {
    expect(parseHspColado('5 5 5 5 5 5 5 5 5 5 5 5')).toEqual(new Array(12).fill(5))
  })

  it('rejeita menos de 12 números', () => {
    expect(parseHspColado('4,75 4,71 4,70')).toBeNull()
  })
  it('rejeita mais de 12 números', () => {
    expect(parseHspColado('1 2 3 4 5 6 7 8 9 10 11 12 13')).toBeNull()
  })
  it('rejeita texto não numérico', () => {
    expect(parseHspColado('jan fev mar abr mai jun jul ago set out nov dez')).toBeNull()
  })
  it('rejeita string vazia', () => {
    expect(parseHspColado('')).toBeNull()
    expect(parseHspColado('    ')).toBeNull()
  })
})
