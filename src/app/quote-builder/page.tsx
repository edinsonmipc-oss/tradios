'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import toast from 'react-hot-toast'
import { Plus, Trash2, Copy, Check, Calculator, Hammer, FileText, Phone, Mail, MapPin, Calendar, DollarSign, ClipboardList, Info } from 'lucide-react'
import type { Client } from '@/lib/utils'

const JOB_TYPES = [
  'Brick paving',
  'Driveway paving',
  'Paving repair',
  'Porcelain paving',
  'Bluestone paving',
  'Crazy paving',
  'Garden cleanup',
  'Fence repair',
  'Decking',
  'Retaining wall',
  'Landscaping',
  'General handyman',
] as const

interface MaterialItem {
  id: string
  name: string
  cost: number
}

interface QuoteFormData {
  clientId: string
  clientName: string
  phone: string
  email: string
  address: string
  jobType: string
  jobDescription: string
  areaSize: number
  labourDays: number
  workers: number
  labourRate: number
  materials: MaterialItem[]
  skipBinCost: number
  deliveryCost: number
  equipmentHire: number
  depositPercent: number
  timeframe: string
  extraNotes: string
}

const INITIAL_FORM: QuoteFormData = {
  clientId: '',
  clientName: '',
  phone: '',
  email: '',
  address: '',
  jobType: '',
  jobDescription: '',
  areaSize: 0,
  labourDays: 0,
  workers: 1,
  labourRate: 0,
  materials: [{ id: '1', name: '', cost: 0 }],
  skipBinCost: 0,
  deliveryCost: 0,
  equipmentHire: 0,
  depositPercent: 50,
  timeframe: '',
  extraNotes: '',
}

const BUSINESS_NAME = 'Prime Hermes Tradie Services'
const DISCLAIMER =
  'Final price may depend on site access, excavation depth, drainage, material choice, and the condition of the existing base'

const SCOPE_OF_WORKS_TEMPLATE = `Scope of Works

1. Site Preparation
   - Proper excavation of the designated area to required depth
   - Removal and disposal of all excavated materials from site

2. Base Preparation
   - Installation of 70–100mm crushed rock base, compacted to industry standards
   - Evenly spread and compacted bedding sand layer to ensure stable substrate

3. Surface Works
   - Precise level correction to achieve proper falls and drainage
   - Installation of concrete edging to secure perimeter

4. Finishing
   - Application of polymeric sand to fill joints, swept and compacted
   - Thorough clean-up of the entire work area
   - Removal of all debris and waste materials from site`

export default function QuoteBuilderPage() {
  const supabase = createClient()
  const [clients, setClients] = useState<Client[]>([])
  const [form, setForm] = useState<QuoteFormData>(INITIAL_FORM)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await supabase
        .from('clients')
        .select('*')
        .order('name')

      if (data) setClients(data as Client[])
    }
    fetchClients()
  }, [supabase])

  // ─── Handlers ────────────────────────────────────────

  const updateField = <K extends keyof QuoteFormData>(
    field: K,
    value: QuoteFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleClientSelect = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId)
    setForm((prev) => ({
      ...prev,
      clientId,
      clientName: client?.name || '',
      phone: client?.phone || '',
      email: client?.email || '',
      address: client?.address || '',
    }))
  }

  const addMaterial = () => {
    setForm((prev) => ({
      ...prev,
      materials: [
        ...prev.materials,
        { id: String(Date.now()), name: '', cost: 0 },
      ],
    }))
  }

  const removeMaterial = (id: string) => {
    setForm((prev) => ({
      ...prev,
      materials: prev.materials.filter((m) => m.id !== id),
    }))
  }

  const updateMaterial = (
    id: string,
    field: 'name' | 'cost',
    value: string | number,
  ) => {
    setForm((prev) => ({
      ...prev,
      materials: prev.materials.map((m) =>
        m.id === id ? { ...m, [field]: value } : m,
      ),
    }))
  }

  // ─── Calculations ────────────────────────────────────

  const labourTotal = useMemo(
    () => form.labourDays * form.workers * form.labourRate,
    [form.labourDays, form.workers, form.labourRate],
  )

  const materialsTotal = useMemo(
    () => form.materials.reduce((sum, m) => sum + (m.cost || 0), 0),
    [form.materials],
  )

  const total = useMemo(
    () => labourTotal + materialsTotal + form.skipBinCost + form.deliveryCost + form.equipmentHire,
    [labourTotal, materialsTotal, form.skipBinCost, form.deliveryCost, form.equipmentHire],
  )

  const depositAmount = useMemo(
    () => total * (form.depositPercent / 100),
    [total, form.depositPercent],
  )

  const gstAmount = useMemo(
    () => Math.round(total * 0.1 * 100) / 100,
    [total],
  )

  const totalWithGst = total + gstAmount

  // ─── Generated Outputs ───────────────────────────────

  const outputs = useMemo(() => {
    const clientLabel = form.clientName || 'Client'
    const jobLabel = form.jobType || 'works'

    const sms = [
      `*${BUSINESS_NAME}*`,
      `📋 Quote for ${clientLabel}`,
      `Job: ${jobLabel}`,
      form.areaSize > 0 ? `Area: ${form.areaSize}m²` : '',
      `💰 Total: $${totalWithGst.toFixed(2)} AUD (incl. GST)`,
      form.timeframe ? `⏱ Est. timeframe: ${form.timeframe}` : '',
      `Deposit: $${depositAmount.toFixed(2)} (${form.depositPercent}%)`,
      DISCLAIMER,
    ]
      .filter(Boolean)
      .join('\n')

    const emailHeader = [
      `Subject: Quote — ${jobLabel} — ${clientLabel}`,
      '',
      `Dear ${clientLabel},`,
      '',
      `Thank you for choosing ${BUSINESS_NAME} for your ${jobLabel.toLowerCase()} project.`,
      '',
      `We are pleased to provide the following quotation:`,
      '',
    ].join('\n')

    const emailBody = [
      `Job Details`,
      `──────────────`,
      `Client: ${clientLabel}`,
      form.phone ? `Phone: ${form.phone}` : '',
      form.email ? `Email: ${form.email}` : '',
      form.address ? `Address: ${form.address}` : '',
      `Job Type: ${jobLabel}`,
      form.jobDescription ? `Description: ${form.jobDescription}` : '',
      form.areaSize > 0 ? `Area: ${form.areaSize}m²` : '',
      '',
      `Quote Summary`,
      `──────────────`,
      `Labour: ${form.labourDays} days × ${form.workers} workers @ $${form.labourRate}/day = $${labourTotal.toFixed(2)}`,
      form.materials.some((m) => m.name)
        ? `Materials: $${materialsTotal.toFixed(2)}`
        : '',
      `Skip Bin: $${(form.skipBinCost || 0).toFixed(2)}`,
      `Delivery: $${(form.deliveryCost || 0).toFixed(2)}`,
      `Equipment Hire: $${(form.equipmentHire || 0).toFixed(2)}`,
      '',
      `Subtotal: $${total.toFixed(2)}`,
      `GST (10%): $${gstAmount.toFixed(2)}`,
      `Total: $${totalWithGst.toFixed(2)}`,
      '',
      `Deposit Required: $${depositAmount.toFixed(2)} (${form.depositPercent}%)`,
      form.timeframe ? `Estimated Timeframe: ${form.timeframe}` : '',
      '',
      DISCLAIMER,
      '',
      `Kind regards,`,
      `${BUSINESS_NAME}`,
    ]
      .filter(Boolean)
      .join('\n')

    const email = emailHeader + emailBody

    const materialsList = form.materials
      .filter((m) => m.name)
      .map((m) => `  • ${m.name}: $${(m.cost || 0).toFixed(2)}`)
      .join('\n')

    const breakdown = [
      `━━━ ${BUSINESS_NAME} — Detailed Quote Breakdown ━━━`,
      '',
      `Client: ${clientLabel}`,
      `Job: ${jobLabel}`,
      form.jobDescription ? `Description: ${form.jobDescription}` : '',
      form.areaSize > 0 ? `Area: ${form.areaSize}m²` : '',
      '',
      `Labour: ${form.labourDays} day(s) × ${form.workers} worker(s) @ $${form.labourRate}/day`,
      `  Labour Subtotal: $${labourTotal.toFixed(2)}`,
      '',
    ]
      .filter(Boolean)
      .join('\n')

    const breakdownWithMaterials = [
      breakdown,
      materialsList ? `Materials:\n${materialsList}\n` : '',
      `Other Costs:`,
      `  Skip Bin: $${(form.skipBinCost || 0).toFixed(2)}`,
      `  Delivery: $${(form.deliveryCost || 0).toFixed(2)}`,
      `  Equipment Hire: $${(form.equipmentHire || 0).toFixed(2)}`,
      '',
      `──────────────`,
      `Subtotal: $${total.toFixed(2)}`,
      `GST (10%): $${gstAmount.toFixed(2)}`,
      `Total (incl. GST): $${totalWithGst.toFixed(2)}`,
      `──────────────`,
      '',
      `Deposit (${form.depositPercent}%): $${depositAmount.toFixed(2)}`,
      form.timeframe ? `Estimated Timeframe: ${form.timeframe}` : '',
      form.extraNotes ? `\nNotes: ${form.extraNotes}` : '',
      '',
      DISCLAIMER,
    ]
      .filter(Boolean)
      .join('\n')

    const scope = SCOPE_OF_WORKS_TEMPLATE

    const paymentNote = [
      `Payment / Deposit Terms`,
      `━━━━━━━━━━━━━━━━━━━━━━━`,
      '',
      `A deposit of $${depositAmount.toFixed(2)} (${form.depositPercent}% of total quoted amount) is required`,
      `to secure your booking and commencement of works.`,
      '',
      `The remaining balance of $${(totalWithGst - depositAmount).toFixed(2)} is due upon satisfactory`,
      `completion of all works as per the agreed scope.`,
      '',
      `Payment methods: Bank Transfer, Cash, or Card (fees may apply for card payments).`,
      '',
      DISCLAIMER,
    ].join('\n')

    const timeframeNote = form.timeframe
      ? [
          `Estimated Timeframe`,
          `━━━━━━━━━━━━━━━━━━━`,
          '',
          `We estimate the ${jobLabel.toLowerCase()} project to be completed within:`,
          '',
          `  ${form.timeframe}`,
          '',
          `Please note that this timeframe is an estimate and may be affected by:`,
          `  • Weather conditions`,
          `  • Site access and conditions`,
          `  • Material availability`,
          `  • Any unforeseen issues encountered during excavation`,
          '',
          `We will keep you updated on progress throughout the project.`,
          '',
          DISCLAIMER,
        ].join('\n')
      : ''

    return { sms, email, breakdown: breakdownWithMaterials, scope, paymentNote, timeframeNote }
  }, [
    form,
    labourTotal,
    materialsTotal,
    total,
    gstAmount,
    totalWithGst,
    depositAmount,
  ])

  // ─── Copy Handler ────────────────────────────────────

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      toast.success('Copied to clipboard!')
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  // ─── Render Helpers ──────────────────────────────────

  const renderSection = (title: string, icon: React.ReactNode, children: React.ReactNode) => (
    <Card className="space-y-4">
      <div className="flex items-center gap-2 border-b border-card-border pb-3">
        {icon}
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </Card>
  )

  const renderOutputCard = (
    title: string,
    content: string,
    index: number,
    icon: React.ReactNode,
  ) => (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => copyToClipboard(content, index)}
        >
          {copiedIndex === index ? (
            <Check className="h-4 w-4 text-success" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copiedIndex === index ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre className="whitespace-pre-wrap rounded-lg bg-background-secondary p-4 text-sm text-foreground-secondary font-mono leading-relaxed overflow-x-auto">
        {content || 'Fill in the form above to generate this output...'}
      </pre>
    </Card>
  )

  // ─── Main Render ─────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quote Builder</h1>
          <p className="mt-1 text-sm text-muted">
            Build professional quotes with live previews
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-card-border bg-card px-3 py-2">
          <Hammer className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">{BUSINESS_NAME}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ─── LEFT COLUMN: Form ────────────────────────── */}
        <div className="space-y-6">
          {/* Client Selection */}
          {renderSection(
            'Client Details',
            <FileText className="h-4 w-4 text-primary" />,
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted">
                  Select Client
                </label>
                <select
                  value={form.clientId}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  className="w-full rounded-xl border border-card-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 hover:border-muted-dark transition-all duration-200"
                >
                  <option value="">Or enter details manually...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                id="client-name"
                label="Client Name"
                placeholder="Full name"
                value={form.clientName}
                onChange={(e) => updateField('clientName', e.target.value)}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  id="phone"
                  label="Phone"
                  type="tel"
                  placeholder="0400 123 456"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                />
                <Input
                  id="email"
                  label="Email"
                  type="email"
                  placeholder="client@example.com"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                />
              </div>
              <Input
                id="address"
                label="Address / Suburb"
                placeholder="42 Smith St, Sydney NSW 2000"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
              />
            </>,
          )}

          {/* Job Details */}
          {renderSection(
            'Job Details',
            <ClipboardList className="h-4 w-4 text-primary" />,
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted">
                  Job Type
                </label>
                <select
                  value={form.jobType}
                  onChange={(e) => updateField('jobType', e.target.value)}
                  className="w-full rounded-xl border border-card-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 hover:border-muted-dark transition-all duration-200"
                >
                  <option value="">Select job type...</option>
                  {JOB_TYPES.map((jt) => (
                    <option key={jt} value={jt}>
                      {jt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted">
                  Job Description
                </label>
                <textarea
                  value={form.jobDescription}
                  onChange={(e) => updateField('jobDescription', e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-card-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 hover:border-muted-dark transition-all duration-200 resize-none"
                  placeholder="Describe the work required..."
                />
              </div>
              <Input
                id="area-size"
                label="Area Size (m²)"
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
                value={form.areaSize || ''}
                onChange={(e) =>
                  updateField('areaSize', parseFloat(e.target.value) || 0)
                }
              />
            </>,
          )}

          {/* Labour & Costs */}
          {renderSection(
            'Labour & Costs',
            <Calculator className="h-4 w-4 text-primary" />,
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Input
                  id="labour-days"
                  label="Labour Days"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="0"
                  value={form.labourDays || ''}
                  onChange={(e) =>
                    updateField('labourDays', parseFloat(e.target.value) || 0)
                  }
                />
                <Input
                  id="workers"
                  label="Workers"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="1"
                  value={form.workers || ''}
                  onChange={(e) =>
                    updateField('workers', parseInt(e.target.value) || 1)
                  }
                />
                <Input
                  id="labour-rate"
                  label="Rate $/day"
                  type="number"
                  min="0"
                  step="50"
                  placeholder="0"
                  value={form.labourRate || ''}
                  onChange={(e) =>
                    updateField('labourRate', parseFloat(e.target.value) || 0)
                  }
                />
              </div>

              {/* Materials */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-muted">
                    Materials
                  </label>
                  <Button variant="ghost" size="sm" onClick={addMaterial}>
                    <Plus className="h-4 w-4" /> Add Item
                  </Button>
                </div>
                {form.materials.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-end gap-3 rounded-lg border border-card-border bg-background-secondary/50 p-3"
                  >
                    <div className="flex-1 min-w-[140px]">
                      <label className="mb-1 text-xs text-muted">Name</label>
                      <input
                        value={item.name}
                        onChange={(e) =>
                          updateMaterial(item.id, 'name', e.target.value)
                        }
                        placeholder="Material name"
                        className="w-full rounded-lg border border-card-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </div>
                    <div className="w-28">
                      <label className="mb-1 text-xs text-muted">Cost ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.cost || ''}
                        onChange={(e) =>
                          updateMaterial(
                            item.id,
                            'cost',
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        placeholder="0.00"
                        className="w-full rounded-lg border border-card-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </div>
                    <button
                      onClick={() => removeMaterial(item.id)}
                      className="mb-0.5 rounded-md p-1.5 text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      disabled={form.materials.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Other Costs */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Input
                  id="skip-bin"
                  label="Skip Bin Cost ($)"
                  type="number"
                  min="0"
                  step="10"
                  placeholder="0"
                  value={form.skipBinCost || ''}
                  onChange={(e) =>
                    updateField('skipBinCost', parseFloat(e.target.value) || 0)
                  }
                />
                <Input
                  id="delivery"
                  label="Delivery Cost ($)"
                  type="number"
                  min="0"
                  step="10"
                  placeholder="0"
                  value={form.deliveryCost || ''}
                  onChange={(e) =>
                    updateField('deliveryCost', parseFloat(e.target.value) || 0)
                  }
                />
                <Input
                  id="equipment-hire"
                  label="Equipment Hire ($)"
                  type="number"
                  min="0"
                  step="10"
                  placeholder="0"
                  value={form.equipmentHire || ''}
                  onChange={(e) =>
                    updateField('equipmentHire', parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </>,
          )}

          {/* Deposit & Timeframe */}
          {renderSection(
            'Deposit & Timeframe',
            <Calendar className="h-4 w-4 text-primary" />,
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-muted">
                    Deposit (%)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={form.depositPercent}
                      onChange={(e) =>
                        updateField('depositPercent', parseInt(e.target.value))
                      }
                      className="flex-1 accent-primary h-2 rounded-full cursor-pointer"
                    />
                    <span className="min-w-[3rem] text-right text-sm font-semibold text-primary">
                      {form.depositPercent}%
                    </span>
                  </div>
                </div>
                <Input
                  id="timeframe"
                  label="Estimated Timeframe"
                  placeholder="e.g. 3–5 business days"
                  value={form.timeframe}
                  onChange={(e) => updateField('timeframe', e.target.value)}
                />
              </div>
            </>,
          )}

          {/* Extra Notes */}
          {renderSection(
            'Extra Notes',
            <Info className="h-4 w-4 text-primary" />,
            <>
              <textarea
                value={form.extraNotes}
                onChange={(e) => updateField('extraNotes', e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-card-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 hover:border-muted-dark transition-all duration-200 resize-none"
                placeholder="Any additional notes or instructions..."
              />
            </>,
          )}
        </div>

        {/* ─── RIGHT COLUMN: Summary & Outputs ──────────── */}
        <div className="space-y-6">
          {/* Live Total Summary */}
          <Card className="space-y-4">
            <div className="flex items-center gap-2 border-b border-card-border pb-3">
              <DollarSign className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                Quote Summary
              </h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Labour ({form.labourDays}d × {form.workers} workers)</span>
                <span className="text-foreground">${labourTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Materials</span>
                <span className="text-foreground">${materialsTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Skip Bin</span>
                <span className="text-foreground">${form.skipBinCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Delivery</span>
                <span className="text-foreground">${form.deliveryCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Equipment Hire</span>
                <span className="text-foreground">${form.equipmentHire.toFixed(2)}</span>
              </div>
              <div className="border-t border-card-border pt-2" />
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span className="text-foreground font-medium">${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">GST (10%)</span>
                <span className="text-foreground">${gstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span className="text-foreground">Total (incl. GST)</span>
                <span className="text-primary">${totalWithGst.toFixed(2)}</span>
              </div>
              <div className="border-t border-card-border pt-2" />
              <div className="flex justify-between">
                <span className="text-muted">Deposit ({form.depositPercent}%)</span>
                <span className="text-secondary font-semibold">${depositAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Balance Due</span>
                <span className="text-foreground">${(totalWithGst - depositAmount).toFixed(2)}</span>
              </div>
            </div>
          </Card>

          {/* Generated Outputs */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Generated Outputs
            </h2>

            {renderOutputCard(
              'SMS Quote Summary',
              outputs.sms,
              0,
              <Phone className="h-4 w-4 text-primary" />,
            )}

            {renderOutputCard(
              'Professional Email Quote',
              outputs.email,
              1,
              <Mail className="h-4 w-4 text-primary" />,
            )}

            {renderOutputCard(
              'Detailed Quote Breakdown',
              outputs.breakdown,
              2,
              <DollarSign className="h-4 w-4 text-primary" />,
            )}

            {renderOutputCard(
              'Scope of Works',
              outputs.scope,
              3,
              <ClipboardList className="h-4 w-4 text-primary" />,
            )}

            {renderOutputCard(
              'Payment / Deposit Note',
              outputs.paymentNote,
              4,
              <Calculator className="h-4 w-4 text-primary" />,
            )}

            {outputs.timeframeNote &&
              renderOutputCard(
                'Timeframe Note',
                outputs.timeframeNote,
                5,
                <Calendar className="h-4 w-4 text-primary" />,
              )}

            {/* Disclaimer */}
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
              <p className="text-xs text-yellow-400/80 leading-relaxed">
                <strong>Disclaimer:</strong> {DISCLAIMER}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
