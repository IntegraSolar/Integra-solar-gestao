'use client'

import { useState, useEffect, useRef, forwardRef } from 'react'

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ label, error, className, id, ...props }, ref) {
    const [visible, setVisible] = useState(false)
    const [capsLock, setCapsLock] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const resolvedRef = (ref as React.RefObject<HTMLInputElement>) ?? inputRef

    useEffect(() => {
      const handleKey = (e: KeyboardEvent) => setCapsLock(e.getModifierState('CapsLock'))
      window.addEventListener('keydown', handleKey)
      window.addEventListener('keyup', handleKey)
      return () => {
        window.removeEventListener('keydown', handleKey)
        window.removeEventListener('keyup', handleKey)
      }
    }, [])

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-xs font-semibold text-[#6B8CA4]">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            {...props}
            ref={resolvedRef}
            id={id}
            type={visible ? 'text' : 'password'}
            className={`w-full rounded-xl border border-[#D0DCE8] px-4 py-2.5 pr-10 text-sm text-[#1A3A5C] outline-none focus:border-[#1A3A5C] focus:ring-2 focus:ring-[#1A3A5C]/10 transition-colors ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10' : ''} ${className ?? ''}`}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9BAEBF] hover:text-[#4A6580] transition-colors"
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {visible ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        {capsLock && !visible && (
          <p className="flex items-center gap-1 text-xs text-amber-600 font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Caps Lock ativado
          </p>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)
