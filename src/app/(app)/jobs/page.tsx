'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function JobsRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/pipeline') }, [router])
  return <div className="flex min-h-screen items-center justify-center text-muted text-sm">Redirecting to Pipeline...</div>
}
