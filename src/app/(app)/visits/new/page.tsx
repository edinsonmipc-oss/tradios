'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function NewVisitRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clientId = searchParams.get('client')
  
  useEffect(() => {
    const base = '/visits'
    const params = clientId ? `?client=${clientId}` : ''
    router.replace(base + params)
  }, [router, clientId])
  
  return <div className="flex min-h-screen items-center justify-center text-muted text-sm">Redirecting to Visits...</div>
}
