'use client'

interface Props {
  password: string
}

type Strength = 0 | 1 | 2 | 3

function calcStrength(password: string): Strength {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 2) return 1
  if (score === 3) return 2
  return 3
}

const LEVELS: Record<Strength, { label: string; color: string; bars: number }> = {
  0: { label: '',       color: '#E2ECF4', bars: 0 },
  1: { label: 'Fraca',  color: '#dc2626', bars: 1 },
  2: { label: 'Média',  color: '#d97706', bars: 2 },
  3: { label: 'Forte',  color: '#16a34a', bars: 3 },
}

export function PasswordStrengthBar({ password }: Props) {
  const strength = calcStrength(password)
  const level = LEVELS[strength]

  if (!password) return null

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-all duration-300"
            style={{ background: i <= level.bars ? level.color : '#E2ECF4' }}
          />
        ))}
      </div>
      {level.label && (
        <p className="text-xs font-semibold" style={{ color: level.color }}>
          Senha {level.label}
        </p>
      )}
    </div>
  )
}

// Exporta requisitos para uso no form
export function getPasswordRequirements(password: string) {
  return [
    { label: 'Mínimo 8 caracteres',      ok: password.length >= 8 },
    { label: 'Letra maiúscula (A-Z)',     ok: /[A-Z]/.test(password) },
    { label: 'Letra minúscula (a-z)',     ok: /[a-z]/.test(password) },
    { label: 'Número (0-9)',              ok: /[0-9]/.test(password) },
  ]
}

export function PasswordRequirements({ password }: Props) {
  const reqs = getPasswordRequirements(password)
  if (!password) return null

  return (
    <ul className="flex flex-col gap-1">
      {reqs.map((r) => (
        <li key={r.label} className="flex items-center gap-1.5 text-xs">
          <span className={r.ok ? 'text-green-600' : 'text-[#9BAEBF]'}>
            {r.ok ? '✓' : '○'}
          </span>
          <span className={r.ok ? 'text-green-700' : 'text-[#6B8CA4]'}>{r.label}</span>
        </li>
      ))}
    </ul>
  )
}
