'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Building2,
  UserPlus,
  Sparkles,
  ArrowRight,
  Check,
  ChevronRight,
  Hammer,
  MapPin,
  Phone,
  Mail,
  User,
  FileText,
  Star,
} from 'lucide-react'

const STEPS = [
  { id: 1, label: 'Welcome', icon: Sparkles },
  { id: 2, label: 'Business', icon: Building2 },
  { id: 3, label: 'First Client', icon: UserPlus },
  { id: 4, label: 'Done', icon: Check },
]

type FormData = {
  business_name: string
  full_name: string
  phone: string
  abn: string
  address: string
}

type ClientData = {
  name: string
  phone: string
  email: string
}

const STEP_HEADLINES = [
  {
    title: 'Welcome to Tradie SitePilot!',
    subtitle: "Let's get your trade business set up in no time.",
  },
  {
    title: 'Tell us about your business',
    subtitle: 'We need a few details to get your account ready.',
  },
  {
    title: 'Add your first client',
    subtitle: "Add a client to get started. You can always add more later.",
  },
  {
    title: "You're all set!",
    subtitle: 'Your Tradie SitePilot account is ready to go. Time to get tradie-ing!',
  },
]

const australianStates = [
  'NSW',
  'VIC',
  'QLD',
  'WA',
  'SA',
  'TAS',
  'ACT',
  'NT',
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Step 2 — Business form
  const [businessForm, setBusinessForm] = useState<FormData>({
    business_name: '',
    full_name: '',
    phone: '',
    abn: '',
    address: '',
  })
  const [businessErrors, setBusinessErrors] = useState<Partial<FormData>>({})

  // Step 3 — Client form
  const [clientForm, setClientForm] = useState<ClientData>({
    name: '',
    phone: '',
    email: '',
  })
  const [clientErrors, setClientErrors] = useState<Partial<ClientData>>({})
  const [addAnother, setAddAnother] = useState(false)

  // ─── Validation ──────────────────────────────────────

  const validateBusiness = (): boolean => {
    const errs: Partial<FormData> = {}
    if (!businessForm.business_name.trim())
      errs.business_name = 'Business name is required'
    if (!businessForm.full_name.trim())
      errs.full_name = 'Your name is required'
    if (!businessForm.phone.trim())
      errs.phone = 'Phone number is required'
    if (
      businessForm.abn.trim() &&
      !/^\d{11}$/.test(businessForm.abn.replace(/\s/g, ''))
    ) {
      errs.abn = 'ABN must be 11 digits'
    }
    setBusinessErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validateClient = (): boolean => {
    const errs: Partial<ClientData> = {}
    if (!clientForm.name.trim()) errs.name = 'Client name is required'
    if (
      clientForm.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientForm.email.trim())
    ) {
      errs.email = 'Invalid email address'
    }
    setClientErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ─── Handlers ────────────────────────────────────────

  const handleNext = () => {
    if (step === 2 && !validateBusiness()) return
    if (step === 3 && !validateClient()) return
    setStep((s) => Math.min(s + 1, 4))
  }

  const handleBack = () => setStep((s) => Math.max(s - 1, 1))

  const handleFinish = async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast.error('You must be logged in to complete onboarding')
        router.push('/auth/login')
        return
      }

      // 1. Upsert profile
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: businessForm.full_name.trim(),
        business_name: businessForm.business_name.trim(),
        phone: businessForm.phone.trim() || null,
        abn: businessForm.abn.trim() || null,
        address: businessForm.address.trim() || null,
        onboarding_complete: true,
        updated_at: new Date().toISOString(),
      })

      if (profileError) {
        console.error('Profile upsert error:', profileError)
        toast.error('Failed to save business info. Please try again.')
        setLoading(false)
        return
      }

      // 2. Insert first client if name is provided
      if (clientForm.name.trim()) {
        const { error: clientError } = await supabase.from('clients').insert({
          user_id: user.id,
          name: clientForm.name.trim(),
          phone: clientForm.phone.trim() || null,
          email: clientForm.email.trim() || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

        if (clientError) {
          console.error('Client insert error:', clientError)
          toast.error('Business info saved, but failed to add client.')
          setLoading(false)
          return
        }
      }

      toast.success('Welcome to Tradie SitePilot! 🎉')
      router.push('/dashboard')
    } catch (err) {
      console.error('Onboarding error:', err)
      toast.error('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const updateBusiness = (field: keyof FormData, value: string) => {
    setBusinessForm((prev) => ({ ...prev, [field]: value }))
    if (businessErrors[field]) {
      setBusinessErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const updateClient = (field: keyof ClientData, value: string) => {
    setClientForm((prev) => ({ ...prev, [field]: value }))
    if (clientErrors[field]) {
      setClientErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  // ─── Render Helpers ──────────────────────────────────

  const renderProgress = () => (
    <div className="mb-10 flex items-center justify-center gap-1 sm:gap-2">
      {STEPS.map((s, idx) => (
        <div key={s.id} className="flex items-center gap-1 sm:gap-2">
          <div
            className={`
              flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-300
              ${
                step === s.id
                  ? 'border-primary bg-primary text-white shadow-md shadow-primary/30 scale-110'
                  : step > s.id
                  ? 'border-success bg-success/20 text-success'
                  : 'border-card-border bg-card text-muted'
              }
            `}
          >
            {step > s.id ? (
              <Check className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              <s.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            )}
          </div>
          <span
            className={`hidden sm:inline text-xs font-medium ${
              step === s.id
                ? 'text-foreground'
                : step > s.id
                ? 'text-success'
                : 'text-muted'
            }`}
          >
            {s.label}
          </span>
          {idx < STEPS.length - 1 && (
            <div
              className={`mx-1 h-0.5 w-6 sm:w-10 rounded-full transition-colors duration-300 ${
                step > s.id ? 'bg-success' : 'bg-card-border'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )

  const renderStepIndicator = () => (
    <div className="mb-6 text-center">
      <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        Step {step} of 4
      </span>
    </div>
  )

  const renderHeadline = () => (
    <div className="mb-8 text-center">
      <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
        {STEP_HEADLINES[step - 1].title}
      </h1>
      <p className="mt-2 text-sm text-muted">{STEP_HEADLINES[step - 1].subtitle}</p>
    </div>
  )

  // ─── Step Content ────────────────────────────────────

  const renderWelcome = () => (
    <div className="space-y-6 text-center">
      {/* Flag decoration */}
      <div className="flex justify-center gap-2 text-4xl sm:text-5xl">
        <span>🇦🇺</span>
        <span>🔨</span>
      </div>

      <div className="mx-auto max-w-md space-y-4">
        <p className="text-sm leading-relaxed text-muted">
          Tradie SitePilot is the all-in-one management app built for Australian tradies.
          Whether you&apos;re an electrician, plumber, builder, or chippy —
          we&apos;ve got your back, mate.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { icon: FileText, label: 'Smart Quotes', desc: 'With GST auto-calc' },
            { icon: Building2, label: 'Client Hub', desc: 'Manage everyone' },
            { icon: MapPin, label: 'Visit Planner', desc: 'Schedule site visits' },
            { icon: Phone, label: 'SMS & Email', desc: 'Stay in touch' },
          ].map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-3 rounded-lg border border-card-border bg-card/50 p-3 text-left"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <f.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{f.label}</p>
                <p className="text-xs text-muted">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-dark">
          This one-time setup takes less than a minute.
        </p>
      </div>
    </div>
  )

  const renderBusinessForm = () => (
    <div className="mx-auto max-w-lg space-y-5">
      <Input
        id="business_name"
        label="Business Name *"
        placeholder="Aussie Electrical Services"
        value={businessForm.business_name}
        onChange={(e) => updateBusiness('business_name', e.target.value)}
        error={businessErrors.business_name}
      />

      <Input
        id="full_name"
        label="Your Full Name *"
        placeholder="John Smith"
        value={businessForm.full_name}
        onChange={(e) => updateBusiness('full_name', e.target.value)}
        error={businessErrors.full_name}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          id="phone"
          label="Phone Number *"
          type="tel"
          placeholder="0400 123 456"
          value={businessForm.phone}
          onChange={(e) => updateBusiness('phone', e.target.value)}
          error={businessErrors.phone}
        />

        <Input
          id="abn"
          label="ABN (optional)"
          type="text"
          placeholder="12345678901"
          maxLength={11}
          value={businessForm.abn}
          onChange={(e) =>
            updateBusiness('abn', e.target.value.replace(/\D/g, ''))
          }
          error={businessErrors.abn}
        />
      </div>

      <div>
        <Input
          id="address"
          label="Business Address (optional)"
          placeholder="42 Smith St, Sydney NSW 2000"
          value={businessForm.address}
          onChange={(e) => updateBusiness('address', e.target.value)}
        />
        <p className="mt-1 text-xs text-muted-dark">
          Used for quotes and invoices
        </p>
      </div>
    </div>
  )

  const renderClientForm = () => (
    <div className="mx-auto max-w-lg space-y-5">
      {/* Optional skip hint */}
      <div className="rounded-lg border border-card-border bg-card/30 p-3 text-center">
        <p className="text-xs text-muted">
          Not ready yet? Just skip this step — you can add clients later from
          the dashboard.
        </p>
      </div>

      <Input
        id="client_name"
        label="Client Name *"
        placeholder="Sarah Connor"
        value={clientForm.name}
        onChange={(e) => updateClient('name', e.target.value)}
        error={clientErrors.name}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          id="client_phone"
          label="Phone"
          type="tel"
          placeholder="0411 222 333"
          value={clientForm.phone}
          onChange={(e) => updateClient('phone', e.target.value)}
        />

        <Input
          id="client_email"
          label="Email"
          type="email"
          placeholder="sarah@example.com"
          value={clientForm.email}
          onChange={(e) => updateClient('email', e.target.value)}
          error={clientErrors.email}
        />
      </div>
    </div>
  )

  const renderDone = () => (
    <div className="space-y-6 text-center">
      {/* Confetti-like decoration */}
      <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
        {/* Orbiting sparkles */}
        <div className="absolute inset-0 animate-spin [animation-duration:4s]">
          {[0, 60, 120, 180, 240, 300].map((deg, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-0 -ml-1.5 h-3 w-3"
              style={{ transform: `rotate(${deg}deg) translateY(-36px)` }}
            >
              <Star
                className={`h-3 w-3 ${
                  i % 2 === 0 ? 'text-secondary' : 'text-primary'
                }`}
                fill="currentColor"
              />
            </div>
          ))}
        </div>

        {/* Central check */}
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-xl shadow-primary/30">
          <Check className="h-10 w-10 text-white" />
        </div>
      </div>

      <div className="mx-auto max-w-sm space-y-3">
        <h2 className="text-xl font-bold text-foreground">
          Ready to roll,{' '}
          <span className="gradient-text">
            {businessForm.full_name.split(' ')[0] || 'Tradie'}
          </span>
          !
        </h2>

        <div className="space-y-2 rounded-xl border border-card-border bg-card/50 p-4 text-left">
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-foreground font-medium">
              {businessForm.business_name || 'Your Business'}
            </span>
          </div>
          {clientForm.name.trim() && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-secondary" />
              <span className="text-muted">
                First client: <span className="text-foreground">{clientForm.name}</span>
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Hammer className="h-4 w-4 text-muted-dark" />
            <span className="text-muted">
              Quotes, visits, invoicing & more
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  // ─── Main Render ─────────────────────────────────────

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-2xl">
        <Card className="animate-fade-in p-6 sm:p-10">
          {renderProgress()}
          {renderStepIndicator()}
          {renderHeadline()}

          {/* Step content with transition */}
          <div className="transition-all duration-300 animate-scale-in">
            {step === 1 && renderWelcome()}
            {step === 2 && renderBusinessForm()}
            {step === 3 && renderClientForm()}
            {step === 4 && renderDone()}
          </div>

          {/* Navigation */}
          <div className="mt-10 flex items-center justify-between border-t border-card-border pt-6">
            <div>
              {step > 1 && step < 4 && (
                <Button variant="ghost" onClick={handleBack} disabled={loading}>
                  Back
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Skip on client step */}
              {step === 3 && (
                <Button
                  variant="ghost"
                  onClick={() => setStep(4)}
                  disabled={loading}
                  className="text-muted"
                >
                  Skip
                </Button>
              )}

              {step < 4 ? (
                <Button onClick={handleNext} disabled={loading}>
                  {step === 3 ? 'Save & Continue' : 'Continue'}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="gold"
                  size="lg"
                  onClick={handleFinish}
                  loading={loading}
                >
                  <Hammer className="mr-1 h-4 w-4" />
                  Go to Dashboard
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Footer branding */}
        <p className="mt-6 text-center text-xs text-muted-dark">
          Built for Australian tradies 🇦🇺
        </p>
      </div>
    </div>
  )
}
