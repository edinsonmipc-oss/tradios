'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import {
  Phone,
  Wrench,
  FileText,
  Trophy,
  ChevronRight,
  Check,
  Calendar,
  Plus,
} from 'lucide-react'

export type PipelineState = {
  contacted: boolean
  contacted_date: string | null
  visit_done: boolean
  visit_date: string | null
  quote_sent: boolean
  quote_date: string | null
  won: boolean
  won_date: string | null
}

const steps = [
  {
    key: 'contacted' as const,
    label: 'Contacted',
    desc: 'Spoke with client',
    icon: Phone,
    color: 'accent',
    bgColor: 'bg-accent/10',
    borderColor: 'border-accent/30',
    textColor: 'text-accent',
    nextLabel: 'Mark Contacted',
  },
  {
    key: 'visit_done' as const,
    label: 'Visit Done',
    desc: 'On-site inspection',
    icon: Wrench,
    color: 'amber',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-400',
    nextLabel: 'Schedule Visit',
  },
  {
    key: 'quote_sent' as const,
    label: 'Quote Sent',
    desc: 'Sent estimate',
    icon: FileText,
    color: 'blue',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-400',
    nextLabel: 'Send Quote',
  },
  {
    key: 'won' as const,
    label: 'Won 🏆',
    desc: 'Client said yes',
    icon: Trophy,
    color: 'green',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    textColor: 'text-green-400',
    nextLabel: 'Mark Won',
  },
]

type Props = {
  clientId: string
  initial: PipelineState
}

export default function ClientPipeline({ clientId, initial }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [pipeline, setPipeline] = useState<PipelineState>(initial)
  const [loading, setLoading] = useState<string | null>(null)

  const handleQuickAction = async (step: typeof steps[number]) => {
    const key = step.key
    if (pipeline[key]) return // already done

    // Find the next incomplete step to auto-advance
    const stepIdx = steps.findIndex((s) => s.key === key)

    if (key === 'visit_done') {
      // Link to new visit page
      router.push(`/visits/new?client=${clientId}`)
      return
    }

    if (key === 'quote_sent') {
      router.push(`/quotes/new?client=${clientId}`)
      return
    }

    setLoading(key)

    if (key === 'contacted') {
      // Create a follow-up marking contacted
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Not authenticated'); setLoading(null); return }

      const { error } = await supabase.from('follow_ups').insert({
        client_id: clientId,
        user_id: user.id,
        title: 'Initial contact made',
        description: 'Contacted client for first conversation',
        due_date: new Date().toISOString().split('T')[0],
        priority: 'normal',
        category: 'call',
        status: 'completed',
        completed_at: new Date().toISOString(),
      })

      if (error) {
        toast.error(error.message)
      } else {
        setPipeline((p) => ({
          ...p,
          contacted: true,
          contacted_date: new Date().toISOString(),
        }))
        toast.success('Marked as contacted ✓')
      }
    }

    if (key === 'won') {
      // Try to find the latest sent quote and mark it accepted
      const { data: latestQuote } = await supabase
        .from('quotes')
        .select('id, status')
        .eq('client_id', clientId)
        .in('status', ['sent', 'draft'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (latestQuote) {
        const { error } = await supabase
          .from('quotes')
          .update({ status: 'accepted' })
          .eq('id', latestQuote.id)

        if (error) {
          toast.error(error.message)
        } else {
          setPipeline((p) => ({ ...p, won: true, won_date: new Date().toISOString() }))
          toast.success('Client won! 🏆')
        }
      } else {
        // No quote to mark, just track it
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { toast.error('Not authenticated'); setLoading(null); return }

        const { error } = await supabase.from('follow_ups').insert({
          client_id: clientId,
          user_id: user.id,
          title: 'Client won!',
          description: 'Client accepted the proposal',
          due_date: new Date().toISOString().split('T')[0],
          priority: 'high',
          category: 'payment',
          status: 'completed',
          completed_at: new Date().toISOString(),
        })

        if (error) {
          toast.error(error.message)
        } else {
          setPipeline((p) => ({ ...p, won: true, won_date: new Date().toISOString() }))
          toast.success('Client won! 🏆')
        }
      }
    }

    setLoading(null)
  }

  // Find current step (last completed)
  const lastCompleted = steps.reduce((acc, s, i) => {
    return pipeline[s.key] ? i : acc
  }, -1)

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <ChevronRight className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Pipeline</h2>
      </div>

      {/* Pipeline steps - horizontal on desktop, vertical on mobile */}
      <div className="flex flex-col gap-3">
        {steps.map((step, i) => {
          const done = pipeline[step.key]
          const isCurrent = i === lastCompleted + 1
          const isPast = i <= lastCompleted
          const Icon = step.icon

          return (
            <div key={step.key} className="relative">
              {/* Connector line */}
              {i > 0 && (
                <div
                  className={`absolute left-[19px] -top-3 w-[2px] h-3 ${
                    done ? 'bg-green-500' : 'bg-border'
                  }`}
                />
              )}

              <div className="flex items-start gap-3">
                {/* Status icon */}
                <div
                  className={`flex-shrink-0 w-[38px] h-[38px] rounded-full flex items-center justify-center transition-all ${
                    done
                      ? 'bg-green-500 text-white'
                      : isCurrent
                        ? step.bgColor + ' ' + step.textColor
                        : 'bg-border/40 text-muted'
                  }`}
                >
                  {done ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm font-semibold ${
                        done ? 'text-green-400' : isCurrent ? step.textColor : 'text-muted'
                      }`}
                    >
                      {step.label}
                    </span>
                    {done && pipeline[`${step.key}_date` as keyof PipelineState] && (
                      <span className="text-xs text-muted">
                        {formatDate(String(pipeline[`${step.key}_date` as keyof PipelineState]))}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted/70 mt-0.5">{step.desc}</p>

                  {/* Action button */}
                  {!done && isCurrent && (
                    <button
                      onClick={() => handleQuickAction(step)}
                      disabled={loading === step.key}
                      className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        step.key === 'contacted' || step.key === 'won'
                          ? 'bg-primary text-white hover:bg-primary-dark'
                          : 'bg-card-hover text-foreground hover:bg-border border border-border'
                      } disabled:opacity-50`}
                    >
                      {loading === step.key ? (
                        <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      ) : step.key === 'visit_done' || step.key === 'quote_sent' ? (
                        <>
                          <Plus className="h-3 w-3" />
                          {step.nextLabel}
                        </>
                      ) : (
                        step.nextLabel
                      )}
                    </button>
                  )}

                  {/* Already done - show check */}
                  {done && (
                    <div className="mt-1">
                      <span className="text-xs text-green-500/70">✓ Completed</span>
                    </div>
                  )}

                  {/* Not yet reachable */}
                  {!done && !isCurrent && i > lastCompleted + 1 && (
                    <p className="mt-1 text-xs text-muted/40">Complete previous step first</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
