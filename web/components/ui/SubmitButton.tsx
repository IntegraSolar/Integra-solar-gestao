'use client'

import { useFormStatus } from 'react-dom'
import { Button } from './Button'
import type { ButtonHTMLAttributes } from 'react'

type SubmitButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
  pendingLabel?: string
}

export function SubmitButton({ children, pendingLabel, className, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" loading={pending} className={className} {...props}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  )
}
