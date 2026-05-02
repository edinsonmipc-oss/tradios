'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Search, Building2, MapPin, CheckCircle, XCircle, FileText, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export interface AbnResult {
  name: string
  abn: string
  status: string
  address: string
  gst: string
  entity_type: string
}

interface AbnLookupProps {
  onResult?: (result: AbnResult) => void
}

export function AbnLookup({ onResult }: AbnLookupProps) {
  const [abn, setAbn] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AbnResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleLookup = async () => {
    const cleaned = abn.replace(/\s/g, '')

    if (!/^\d{11}$/.test(cleaned)) {
      toast.error('Please enter a valid 11-digit ABN')
      return
    }

    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const res = await fetch('/api/abr-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ abn: cleaned }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to look up ABN')
        toast.error(data.error || 'Failed to look up ABN')
        return
      }

      setResult(data as AbnResult)
      onResult?.(data as AbnResult)
      toast.success('ABN lookup successful')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const formatAbn = (value: string): string => {
    // Format as XX XXX XXX XXX
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return digits
    if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`
    if (digits.length <= 8) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
  }

  const handleAbnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAbn(formatAbn(e.target.value))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLookup()
    }
  }

  return (
    <div className="space-y-4">
      {/* Search form */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            id="abn-input"
            label="Australian Business Number (ABN)"
            placeholder="XX XXX XXX XXX"
            value={abn}
            onChange={handleAbnChange}
            onKeyDown={handleKeyDown}
            maxLength={14} // 11 digits + 3 spaces
            disabled={loading}
          />
        </div>
        <Button
          variant="primary"
          onClick={handleLookup}
          loading={loading}
          disabled={loading}
          className="mb-0.5"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Lookup
        </Button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <Card className="animate-pulse">
          <CardContent>
            <div className="space-y-3">
              <div className="h-5 w-3/4 rounded bg-card-hover" />
              <div className="h-4 w-1/2 rounded bg-card-hover" />
              <div className="h-4 w-2/3 rounded bg-card-hover" />
              <div className="h-4 w-1/3 rounded bg-card-hover" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {!loading && error && (
        <Card className="border-red-500/30">
          <CardContent>
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
              <div>
                <p className="font-medium text-red-400">Lookup Failed</p>
                <p className="mt-1 text-sm text-muted">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success result card */}
      {!loading && result && (
        <Card className="animate-fade-in border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">
                {result.status === 'Active' ? (
                  <span className="flex items-center gap-2">
                    {result.name}
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                      <CheckCircle className="h-3 w-3" />
                      Active
                    </span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {result.name}
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
                      <XCircle className="h-3 w-3" />
                      {result.status}
                    </span>
                  </span>
                )}
              </h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* ABN */}
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-dark" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-dark">
                    ABN
                  </p>
                  <p className="text-sm text-foreground-secondary font-mono">{result.abn}</p>
                </div>
              </div>

              {/* Entity Type */}
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-dark" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-dark">
                    Entity Type
                  </p>
                  <p className="text-sm text-foreground-secondary">{result.entity_type}</p>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-dark" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-dark">
                    Business Address
                  </p>
                  <p className="text-sm text-foreground-secondary">{result.address}</p>
                </div>
              </div>

              {/* GST Status */}
              <div className="flex items-start gap-3">
                {result.gst === 'Yes' || result.gst.toLowerCase().includes('registered') ? (
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-dark" />
                )}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-dark">
                    GST Status
                  </p>
                  <p
                    className={`text-sm ${
                      result.gst === 'Yes' || result.gst.toLowerCase().includes('registered')
                        ? 'text-success'
                        : 'text-foreground-secondary'
                    }`}
                  >
                    {result.gst}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
