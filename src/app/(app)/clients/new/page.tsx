'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NewClientRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/clients') }, [router])
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-fg-tertiary">
      Redirecting to clients...
    </div>
  )
}
