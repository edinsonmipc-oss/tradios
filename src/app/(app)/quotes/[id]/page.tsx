import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Badge, statusBadgeVariant } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import QuoteActions from './actions'
import Link from 'next/link'
import { ArrowLeft, Download } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { Quote, QuoteItem } from '@/lib/utils'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function QuoteDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: quote } = await supabase
    .from('quotes')
    .select('*, clients(name, phone, email, address)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!quote) notFound()

  const typedQuote = quote as unknown as Quote
  const items = typedQuote.items || []

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/quotes">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              {typedQuote.quote_number}
            </h1>
            <Badge variant={statusBadgeVariant(typedQuote.status)}>
              {typedQuote.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            {typedQuote.title} • Created {formatDate(typedQuote.created_at)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/quotes/${typedQuote.id}/edit`}>
            <Button variant="secondary" size="sm">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
              Edit
            </Button>
          </Link>
          <QuoteActions
            quoteId={typedQuote.id}
            status={typedQuote.status}
            clientId={typedQuote.client_id}
          />
        </div>
      </div>

      {/* Client Info */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Client</h2>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {typedQuote.clients?.name || 'Unknown'}
          </p>
          {typedQuote.clients?.phone && (
            <p className="text-sm text-muted">{typedQuote.clients.phone}</p>
          )}
          {typedQuote.clients?.email && (
            <p className="text-sm text-muted">{typedQuote.clients.email}</p>
          )}
          {typedQuote.clients?.address && (
            <p className="text-sm text-muted">{typedQuote.clients.address}</p>
          )}
        </div>
      </Card>

      {/* Labor Items */}
      {items.length > 0 && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Labour</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="pb-2 text-left font-medium">Description</th>
                <th className="pb-2 text-right font-medium">Qty</th>
                <th className="pb-2 text-right font-medium">Rate</th>
                <th className="pb-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: QuoteItem, i: number) => (
                <tr key={i} className="border-b border-border/50 text-sm">
                  <td className="py-2 text-foreground">{item.description}</td>
                  <td className="py-2 text-right text-muted">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-2 text-right text-muted">
                    {formatCurrency(item.rate)}
                  </td>
                  <td className="py-2 text-right font-medium text-foreground">
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Totals */}
      <Card>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Subtotal</span>
            <span className="text-foreground">{formatCurrency(typedQuote.subtotal)}</span>
          </div>
          {(typedQuote.tax || 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">GST (10%)</span>
              <span className="text-foreground">{formatCurrency(typedQuote.tax || 0)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2 text-lg font-bold">
            <span className="text-foreground">Total {(typedQuote.tax || 0) > 0 ? '(incl. GST)' : ''}</span>
            <span className="text-primary">{formatCurrency(typedQuote.total)}</span>
          </div>
        </div>
      </Card>

      {/* Notes & Terms */}
      {typedQuote.notes && (
        <Card>
          <h2 className="mb-2 text-sm font-semibold text-foreground">Notes</h2>
          <p className="whitespace-pre-wrap text-sm text-muted">{typedQuote.notes}</p>
        </Card>
      )}
    </div>
  )
}
