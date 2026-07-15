// web/lib/simuladores/viabilidade/finance.ts

// VPL de um fluxo cujo primeiro elemento ocorre em t=1 (igual à função NPV do Excel).
export function npv(rate: number, cashflows: number[]): number {
  let acc = 0
  for (let i = 0; i < cashflows.length; i++) {
    acc += cashflows[i] / Math.pow(1 + rate, i + 1)
  }
  return acc
}

// VPL de um fluxo cujo primeiro elemento ocorre em t=0 (usado internamente pela TIR).
function npvAtZero(rate: number, cashflows: number[]): number {
  let acc = 0
  for (let i = 0; i < cashflows.length; i++) {
    acc += cashflows[i] / Math.pow(1 + rate, i)
  }
  return acc
}

// TIR: taxa que zera o VPL (fluxo começa em t=0). Bisseção robusta em [-0.9999, 10].
export function irr(cashflows: number[]): number {
  let lo = -0.9999
  let hi = 10
  let fLo = npvAtZero(lo, cashflows)
  for (let iter = 0; iter < 200; iter++) {
    const mid = (lo + hi) / 2
    const fMid = npvAtZero(mid, cashflows)
    if (Math.abs(fMid) < 1e-9) return mid
    if (fLo * fMid < 0) { hi = mid } else { lo = mid; fLo = fMid }
  }
  return (lo + hi) / 2
}
