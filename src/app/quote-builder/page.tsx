'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function QuoteBuilderRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/quotes/new') }, [router])
  return <div className="flex min-h-screen items-center justify-center text-muted text-sm">Redirecting to Quotes...</div>
}
