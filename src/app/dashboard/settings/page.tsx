'use client'

// ============================================================
// SQL MIGRATION — Add these columns to the profiles table if
// they don't already exist in the DB:
//
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_name TEXT;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS abn TEXT;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website TEXT;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_description TEXT;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS services TEXT;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS years_in_business TEXT;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS license_number TEXT;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS insurance_details TEXT;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS logo_url TEXT;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS instagram TEXT;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS facebook TEXT;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tiktok TEXT;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_hourly_rate NUMERIC(10,2) DEFAULT 0;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_helper_rate NUMERIC(10,2) DEFAULT 0;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_deposit_pct NUMERIC(5,2) DEFAULT 50;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS quote_validity_days INTEGER DEFAULT 14;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_liability_note TEXT;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_review_link TEXT;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS service_area TEXT;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_sender TEXT;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_signature TEXT;
// ============================================================

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import {
  Camera,
  Save,
  Store,
  Building2,
  Info,
  Share2,
  MapPin,
  AtSign,
  Globe,
  Music,
  DollarSign,
  MapPinned,
  ShieldAlert,
  Mail,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [form, setForm] = useState({
    business_name: '',
    full_name: '',
    email: '',
    phone: '',
    abn: '',
    address: '',
    website: '',
    business_description: '',
    services: '',
    years_in_business: '',
    license_number: '',
    insurance_details: '',
    instagram: '',
    facebook: '',
    tiktok: '',
    service_area: '',
    default_hourly_rate: '',
    default_helper_rate: '',
    default_deposit_pct: '',
    quote_validity_days: '',
    public_liability_note: '',
    google_review_link: '',
    email_sender: '',
    email_signature: '',
  })
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setForm((prev) => ({ ...prev, email: user.email || '' }))

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        setForm({
          business_name: profile.business_name || '',
          full_name: profile.full_name || '',
          email: user.email || '',
          phone: profile.phone || '',
          abn: profile.abn || '',
          address: profile.address || '',
          website: profile.website || '',
          business_description: profile.business_description || '',
          services: profile.services || '',
          years_in_business: profile.years_in_business || '',
          license_number: profile.license_number || '',
          insurance_details: profile.insurance_details || '',
          instagram: profile.instagram || '',
          facebook: profile.facebook || '',
          tiktok: profile.tiktok || '',
          service_area: profile.service_area || '',
          default_hourly_rate: profile.default_hourly_rate?.toString() || '',
          default_helper_rate: profile.default_helper_rate?.toString() || '',
          default_deposit_pct: profile.default_deposit_pct?.toString() || '50',
          quote_validity_days: profile.quote_validity_days?.toString() || '14',
          public_liability_note: profile.public_liability_note || '',
          google_review_link: profile.google_review_link || '',
          email_sender: profile.email_sender || '',
          email_signature: profile.email_signature || '',
        })
        if (profile.logo_url) setAvatarUrl(profile.logo_url)
      } else {
        // Set defaults for new profiles
        setForm((prev) => ({
          ...prev,
          default_deposit_pct: '50',
          quote_validity_days: '14',
        }))
      }
      setFetching(false)
    }
    fetchProfile()
  }, [])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Convert image to base64 and save directly in DB (no storage needed)
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string

      setAvatarUrl(base64)

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, logo_url: base64 })

      if (updateError) {
        toast.error(updateError.message)
      } else {
        toast.success('¡Logo actualizado!')
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('No autenticado')
      setLoading(false)
      return
    }

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      business_name: form.business_name || null,
      full_name: form.full_name || null,
      phone: form.phone || null,
      abn: form.abn || null,
      address: form.address || null,
      website: form.website || null,
      business_description: form.business_description || null,
      services: form.services || null,
      years_in_business: form.years_in_business || null,
      license_number: form.license_number || null,
      insurance_details: form.insurance_details || null,
      instagram: form.instagram || null,
      facebook: form.facebook || null,
      tiktok: form.tiktok || null,
      service_area: form.service_area || null,
      default_hourly_rate: form.default_hourly_rate
        ? parseFloat(form.default_hourly_rate)
        : null,
      default_helper_rate: form.default_helper_rate
        ? parseFloat(form.default_helper_rate)
        : null,
      default_deposit_pct: form.default_deposit_pct
        ? parseFloat(form.default_deposit_pct)
        : 50,
      quote_validity_days: form.quote_validity_days
        ? parseInt(form.quote_validity_days, 10)
        : 14,
      public_liability_note: form.public_liability_note || null,
      google_review_link: form.google_review_link || null,
      email_sender: form.email_sender || null,
      email_signature: form.email_signature || null,
      updated_at: new Date().toISOString(),
    })

    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('¡Configuración guardada!')
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12 px-4 sm:px-0">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Configuración
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Administra la información de tu negocio, precios y perfil
        </p>
      </div>

      {/* ============================================ */}
      {/* Logo */}
      {/* ============================================ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Logo del Negocio</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <div
              className="group relative flex h-28 w-28 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-background transition-all duration-200 hover:border-primary/60 hover:bg-primary/5"
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarUrl ? (
                <>
                  <img
                    src={avatarUrl}
                    alt="Logo"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Camera className="h-7 w-7 text-white" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <Camera className="h-7 w-7 text-muted" />
                  <span className="text-xs text-muted">Subir logo</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
              <p className="text-sm font-medium text-foreground">
                Logo de tu negocio
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Haz clic en el recuadro para subir una imagen.
                <br />
                PNG, JPG o WebP &mdash; Se recomienda formato cuadrado
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* Información del Negocio */}
      {/* ============================================ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Información del Negocio
            </h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="business-name"
              label="Nombre del Negocio"
              placeholder="Ej: Prime Hermes Tradie Services"
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
            />
            <Input
              id="full-name"
              label="Nombre Completo"
              placeholder="Ej: Juan López"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
            <Input
              id="settings-email"
              label="Correo Electrónico"
              type="email"
              value={form.email}
              disabled
              className="opacity-60"
            />
            <Input
              id="settings-phone"
              label="Teléfono"
              placeholder="Ej: 0406 170 544"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* Detalles del Negocio */}
      {/* ============================================ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Detalles del Negocio
            </h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="website"
              label="Sitio Web"
              placeholder="https://tunejemplo.com"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
            <Input
              id="abn"
              label="ABN"
              placeholder="00 000 000 000"
              value={form.abn}
              onChange={(e) => setForm({ ...form, abn: e.target.value })}
            />
            <Input
              id="license-number"
              label="Número de Licencia"
              placeholder="Licencia profesional"
              value={form.license_number}
              onChange={(e) => setForm({ ...form, license_number: e.target.value })}
            />
            <Input
              id="years-in-business"
              label="Años en el Negocio"
              placeholder="Ej: 10"
              value={form.years_in_business}
              onChange={(e) => setForm({ ...form, years_in_business: e.target.value })}
            />
            <div className="sm:col-span-2">
              <Input
                id="insurance-details"
                label="Detalles del Seguro"
                placeholder="Ej: Cobertura de responsabilidad civil hasta $5M"
                value={form.insurance_details}
                onChange={(e) => setForm({ ...form, insurance_details: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* Área de Servicio / Ubicación */}
      {/* ============================================ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPinned className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Área de Servicio y Dirección
            </h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="address"
                className="mb-1.5 block text-sm font-medium text-muted"
              >
                Dirección del Negocio
              </label>
              <textarea
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-card-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 transition-all duration-200 hover:border-muted-dark focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/40"
                placeholder="Calle, número, ciudad, código postal..."
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                id="service-area"
                label="Área de Servicio"
                placeholder="Ej: Sídney, Melbourne, Brisbane y alrededores"
                value={form.service_area}
                onChange={(e) => setForm({ ...form, service_area: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* Acerca del Negocio */}
      {/* ============================================ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Acerca del Negocio
            </h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="business-description"
                className="mb-1.5 block text-sm font-medium text-muted"
              >
                Descripción del Negocio
              </label>
              <textarea
                id="business-description"
                value={form.business_description}
                onChange={(e) =>
                  setForm({ ...form, business_description: e.target.value })
                }
                rows={4}
                className="w-full rounded-xl border border-card-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 transition-all duration-200 hover:border-muted-dark focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/40"
                placeholder="Describe tu negocio, especialidades y experiencia..."
              />
            </div>
            <div>
              <label
                htmlFor="services"
                className="mb-1.5 block text-sm font-medium text-muted"
              >
                Servicios Ofrecidos
              </label>
              <textarea
                id="services"
                value={form.services}
                onChange={(e) =>
                  setForm({ ...form, services: e.target.value })
                }
                rows={4}
                className="w-full rounded-xl border border-card-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 transition-all duration-200 hover:border-muted-dark focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/40"
                placeholder="Enumera los servicios que ofreces (uno por línea)..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* Precios y Cotizaciones */}
      {/* ============================================ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Precios y Cotizaciones
            </h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="default-hourly-rate"
              label="Tarifa por Hora (por defecto)"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ej: 150.00"
              value={form.default_hourly_rate}
              onChange={(e) =>
                setForm({ ...form, default_hourly_rate: e.target.value })
              }
            />
            <Input
              id="default-helper-rate"
              label="Tarifa de Ayudante (por defecto)"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ej: 75.00"
              value={form.default_helper_rate}
              onChange={(e) =>
                setForm({ ...form, default_helper_rate: e.target.value })
              }
            />
            <Input
              id="default-deposit-pct"
              label="% Depósito (por defecto)"
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="50"
              value={form.default_deposit_pct}
              onChange={(e) =>
                setForm({ ...form, default_deposit_pct: e.target.value })
              }
            />
            <Input
              id="quote-validity-days"
              label="Vigencia de Cotización (días)"
              type="number"
              step="1"
              min="1"
              placeholder="14"
              value={form.quote_validity_days}
              onChange={(e) =>
                setForm({ ...form, quote_validity_days: e.target.value })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* Notas Legales y Reseñas */}
      {/* ============================================ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Notas Legales y Reseñas
            </h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="public-liability-note"
                className="mb-1.5 block text-sm font-medium text-muted"
              >
                Nota de Responsabilidad Pública
              </label>
              <textarea
                id="public-liability-note"
                value={form.public_liability_note}
                onChange={(e) =>
                  setForm({ ...form, public_liability_note: e.target.value })
                }
                rows={3}
                className="w-full rounded-xl border border-card-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 transition-all duration-200 hover:border-muted-dark focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/40"
                placeholder="Ej: Este trabajo cuenta con cobertura de responsabilidad civil por $5 millones..."
              />
            </div>
            <Input
              id="google-review-link"
              label="Enlace de Reseña de Google"
              placeholder="https://g.page/r/..."
              value={form.google_review_link}
              onChange={(e) =>
                setForm({ ...form, google_review_link: e.target.value })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* Configuración de Correo Electrónico */}
      {/* ============================================ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Configuración de Correo Electrónico
            </h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-xs text-muted/70">
              Configura el remitente y la firma para los correos que envías desde Tradios.
              Necesitas agregar <code className="rounded bg-card-border px-1.5 py-0.5 text-[11px]">RESEND_API_KEY</code> en las variables de entorno de Render para habilitar el envío real.
            </p>
            <Input
              id="email-sender"
              label="Dirección de Remitente"
              placeholder="notifications@tudominio.com"
              value={form.email_sender}
              onChange={(e) => setForm({ ...form, email_sender: e.target.value })}
            />
            <div>
              <label
                htmlFor="email-signature"
                className="mb-1.5 block text-sm font-medium text-muted"
              >
                Firma de Correo
              </label>
              <textarea
                id="email-signature"
                value={form.email_signature}
                onChange={(e) =>
                  setForm({ ...form, email_signature: e.target.value })
                }
                rows={4}
                className="w-full rounded-xl border border-card-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 transition-all duration-200 hover:border-muted-dark focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/40"
                placeholder={`Nombre del Negocio\nTel: 0400 000 000\nABN: 00 000 000 000`}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* Redes Sociales */}
      {/* ============================================ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Redes Sociales
            </h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-[38px] z-10 text-muted">
                <AtSign className="h-4 w-4" />
              </div>
              <Input
                id="instagram"
                label="Instagram"
                placeholder="@tunegocio"
                value={form.instagram}
                onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                className="pl-9"
              />
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-[38px] z-10 text-muted">
                <Globe className="h-4 w-4" />
              </div>
              <Input
                id="facebook"
                label="Facebook"
                placeholder="facebook.com/tunegocio"
                value={form.facebook}
                onChange={(e) => setForm({ ...form, facebook: e.target.value })}
                className="pl-9"
              />
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-[38px] z-10 text-muted">
                <Music className="h-4 w-4" />
              </div>
              <Input
                id="tiktok"
                label="TikTok"
                placeholder="@tunegocio"
                value={form.tiktok}
                onChange={(e) => setForm({ ...form, tiktok: e.target.value })}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* Save Button */}
      {/* ============================================ */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} loading={loading} size="lg">
          <Save className="h-4 w-4" />
          Guardar Cambios
        </Button>
      </div>
    </div>
  )
}
