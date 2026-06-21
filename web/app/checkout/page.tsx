import { Suspense } from 'react'
import CheckoutForm from './CheckoutForm'

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
      <CheckoutForm />
    </Suspense>
  )
}
