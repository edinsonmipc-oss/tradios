'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function FollowUpSystemRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/follow-ups') }, [router])
  return <div className="flex min-h-screen items-center justify-center text-muted text-sm">Redirecting to Follow-ups...</div>
}
