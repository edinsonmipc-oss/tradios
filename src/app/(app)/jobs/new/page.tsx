'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NewJobRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/jobs') }, [router])
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-fg-tertiary">
      Redirecting to jobs...
    </div>
  )
}
