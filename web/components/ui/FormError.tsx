interface FormErrorProps {
  message?: string
}

export function FormError({ message }: FormErrorProps) {
  if (!message) return null
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm"
      style={{
        background: 'rgba(255,80,80,0.10)',
        border: '1px solid rgba(255,80,80,0.20)',
        color: '#FF9090',
      }}
    >
      {message}
    </div>
  )
}
