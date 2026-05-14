'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import toast from 'react-hot-toast'
import { Sparkles, RefreshCw, Save, Download, ChevronDown, ChevronUp, Check, Star } from 'lucide-react'

interface QuoteOption {
  name: string
  total: number
  description: string
  recommended: boolean
  dayByDay: { day: number; title: string; details: string }[]
  labourDays: number
  whatsIncluded: string[]
  whatsNotIncluded: string[]
}

interface QuoteData {
  quoteNumber: string
  clientName: string
  date: string
  validUntil: string
  businessName: string
  abn: string
  phone: string
  email: string
  jobAddress: string
  introduction: string
  options: QuoteOption[]
  recommendation: { optionIndex: number; title: string; reason: string }
  depositRequired: number
  paymentTerms: string
  warranty: string
  validityDays: number
  notes: string
}

export default function QuoteMakerPage() {
  const router = useRouter()
  const supabase = createClient()

  const [clientName, setClientName] = useState('')
  const [jobAddress, setJobAddress] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [budgetRange, setBudgetRange] = useState('')
  const [feedback, setFeedback] = useState('')
  const [quote, setQuote] = useState<QuoteData | null>(null)
  const [loading, setLoading] = useState(false)
  const [improving, setImproving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedDay, setExpandedDay] = useState<number | null>(null)
  const [selectedOption, setSelectedOption] = useState(0)

  const handleGenerate = async (improve = false) => {
    if (!clientName.trim()) {
      toast.error('Client name is required')
      return
    }

    const setLoader = improve ? setImproving : setLoading
    setLoader(true)

    try {
      const res = await fetch('/api/quotes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName.trim(),
          jobAddress: jobAddress.trim(),
          title: title.trim() || 'General quote',
          description: description.trim() || 'Professional installation',
          budgetRange: budgetRange,
          feedback: improve ? feedback.trim() : null,
        }),
      })

      const data = await res.json()

      if (data.error && !data.mock) {
        toast.error(data.error)
      } else if (data.options) {
        setQuote(data as QuoteData)
        setFeedback('')
        toast.success(improve ? 'Quote improved!' : 'Quote generated!')
      } else {
        toast.error('Unexpected response format')
      }
    } catch (e) {
      toast.error('Failed to connect. Check your connection.')
    }

    setLoader(false)
  }

  const handleSave = async () => {
    if (!quote) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Not authenticated'); return }

      const { error } = await supabase.from('quotes').insert({
        user_id: user.id,
        quote_number: quote.quoteNumber,
        title: title.trim() || quote.clientName + ' Quote',
        client_name: quote.clientName,
        job_address: quote.jobAddress,
        items: quote.options,
        subtotal: quote.options[selectedOption]?.total || 0,
        tax: Math.round((quote.options[selectedOption]?.total || 0) * 0.1 * 100) / 100,
        total: quote.options[selectedOption]?.total || 0,
        notes: quote.notes,
        recommendation: quote.recommendation.reason,
        status: 'draft',
        payment_terms: quote.paymentTerms,
        warranty: quote.warranty,
        valid_until: quote.validUntil,
      })

      if (error) throw error
      toast.success('Quote saved!')
      router.push('/quotes')
    } catch (e: any) {
      toast.error(e.message || 'Failed to save')
    }
    setSaving(false)
  }

  const formatCurrency = (n: number) =>
    '$' + n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const selected = quote?.options?.[selectedOption]

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quote Maker</h1>
          <p className="mt-1 text-sm text-muted">AI-powered professional quotes for your clients</p>
        </div>
      </div>

      {/* Input Form */}
      <Card className="space-y-5 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Client Name *"
            placeholder="e.g. Hayden"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
          <Input
            label="Job Address"
            placeholder="e.g. 16 Rutherglen Rd, Vermont South"
            value={jobAddress}
            onChange={(e) => setJobAddress(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input
            label="Service / Title"
            placeholder="e.g. Crazy Paving - Steps & Entry"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            label="Budget Range"
            placeholder="e.g. $5k-$8k"
            value={budgetRange}
            onChange={(e) => setBudgetRange(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">Project Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Describe the project scope, materials, any special requirements..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="flex gap-3">
          <Button onClick={() => handleGenerate(false)} loading={loading}>
            <Sparkles className="h-4 w-4" /> {quote ? 'Regenerate' : 'Generate Quote'}
          </Button>
        </div>
      </Card>

      {/* Quote Result */}
      {quote && (
        <>
          {/* Option Selector */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">{quote.quoteNumber} — {quote.clientName}</h2>
              <span className="text-xs text-muted">{quote.date} · Valid until {quote.validUntil}</span>
            </div>

            <p className="mb-6 text-sm leading-relaxed text-foreground/80">{quote.introduction}</p>

            {/* Options Grid */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              {quote.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedOption(i)}
                  className={`relative rounded-xl border-2 p-5 text-left transition-all ${
                    selectedOption === i
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border bg-card-hover/30 hover:border-primary/50'
                  } ${opt.recommended ? 'ring-1 ring-primary/30' : ''}`}
                >
                  {opt.recommended && (
                    <span className="absolute -top-2.5 right-3 flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      <Star className="h-3 w-3" /> Best Value
                    </span>
                  )}
                  <div className="mt-1 text-2xl font-black text-foreground">{formatCurrency(opt.total)}</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">{opt.name}</div>
                  <div className="mt-1.5 text-xs leading-relaxed text-muted">{opt.description}</div>
                  <div className="mt-2 text-[10px] text-muted">~{opt.labourDays} working days</div>
                  {selectedOption === i && (
                    <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-primary">
                      <Check className="h-3 w-3" /> Selected
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Selected Option Details */}
            {selected && (
              <div className="space-y-6">
                {/* Day-by-day */}
                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Work Schedule</h3>
                  <div className="space-y-2">
                    {selected.dayByDay.map((day) => (
                      <div key={day.day} className="rounded-lg border border-border">
                        <button
                          onClick={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
                          className="flex w-full items-center justify-between px-4 py-3 text-left"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                              {day.day}
                            </span>
                            <span className="text-sm font-medium text-foreground">{day.title}</span>
                          </div>
                          {expandedDay === day.day ? (
                            <ChevronUp className="h-4 w-4 text-muted" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted" />
                          )}
                        </button>
                        {expandedDay === day.day && (
                          <div className="border-t border-border px-4 py-3 text-sm leading-relaxed text-foreground/70">
                            {day.details}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* What's Included */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-green-500">✓ Included</h3>
                    <ul className="space-y-1.5">
                      {selected.whatsIncluded.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground/70">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">✕ Not Included</h3>
                    <ul className="space-y-1.5">
                      {selected.whatsNotIncluded.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted">
                          <span className="mt-0.5 text-muted">✕</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Total & Terms */}
            <div className="mt-6 rounded-lg bg-card-hover/50 p-5">
              <div className="mb-4 flex items-baseline justify-between">
                <span className="text-sm text-muted">Total (incl. GST)</span>
                <span className="text-3xl font-black text-primary">
                  {formatCurrency(quote.options[selectedOption]?.total || 0)}
                </span>
              </div>
              <div className="space-y-2 text-sm text-foreground/60">
                <p>{quote.warranty}</p>
                <p>{quote.paymentTerms}</p>
              </div>
            </div>

            {/* Recommendation */}
            <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-5">
              <div className="mb-1 flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold text-primary">{quote.recommendation.title}</span>
              </div>
              <p className="text-sm leading-relaxed text-foreground/70">{quote.recommendation.reason}</p>
            </div>

            {/* Notes */}
            <div className="mt-6">
              <p className="text-sm italic leading-relaxed text-foreground/60">{quote.notes}</p>
            </div>
          </Card>

          {/* Improve Section */}
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <input
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Tell the AI how to improve the quote... (e.g. 'Add more detail to day 2', 'Make it sound more premium', 'Lower the price')"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
                onKeyDown={(e) => { if (e.key === 'Enter' && feedback.trim()) handleGenerate(true) }}
              />
              <Button onClick={() => handleGenerate(true)} loading={improving} disabled={!feedback.trim()}>
                <RefreshCw className="h-4 w-4" /> Improve
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-muted/60">Press Enter or click Improve — the AI will refine the quote based on your feedback</p>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleSave} loading={saving}>
              <Save className="h-4 w-4" /> Save Quote
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              <Download className="h-4 w-4" /> Print / PDF
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
