'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Camera, Save } from 'lucide-react'
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
        })
        if (profile.avatar_url) setAvatarUrl(profile.avatar_url)
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

    const fileExt = file.name.split('.').pop()
    const fileName = `avatars/${user.id}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      toast.error(uploadError.message)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('profiles')
      .getPublicUrl(fileName)

    setAvatarUrl(publicUrl)

    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({ id: user.id, avatar_url: publicUrl })

    if (updateError) {
      toast.error(updateError.message)
    } else {
      toast.success('Logo updated!')
    }
  }

  const handleSave = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Not authenticated')
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
      updated_at: new Date().toISOString(),
    })

    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Settings saved!')
    }
  }

  if (fetching) {
    return <p className="text-center text-sm text-muted py-12">Loading...</p>
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted">Manage your business profile</p>
      </div>

      {/* Logo Upload */}
      <Card>
        <h2 className="mb-4 text-sm font-semibold text-foreground">Business Logo</h2>
        <div className="flex items-center gap-4">
          <div
            className="flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-background transition-colors hover:border-primary/50"
            onClick={() => fileInputRef.current?.click()}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Logo"
                className="h-full w-full object-cover"
              />
            ) : (
              <Camera className="h-6 w-6 text-muted" />
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <div>
            <p className="text-sm text-foreground">Upload your logo</p>
            <p className="text-xs text-muted">PNG, JPG or WebP • Square preferred</p>
          </div>
        </div>
      </Card>

      {/* Profile Form */}
      <Card>
        <h2 className="mb-4 text-sm font-semibold text-foreground">Business Information</h2>
        <div className="space-y-4">
          <Input
            id="business-name"
            label="Business Name"
            placeholder="Your Trade Business"
            value={form.business_name}
            onChange={(e) => setForm({ ...form, business_name: e.target.value })}
          />
          <Input
            id="full-name"
            label="Full Name"
            placeholder="John Smith"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
          <Input
            id="settings-email"
            label="Email"
            type="email"
            value={form.email}
            disabled
            className="opacity-60"
          />
          <Input
            id="settings-phone"
            label="Phone"
            placeholder="0400 000 000"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            id="abn"
            label="ABN"
            placeholder="00 000 000 000"
            value={form.abn}
            onChange={(e) => setForm({ ...form, abn: e.target.value })}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">Address</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="123 Business St, Sydney NSW 2000"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} loading={loading}>
            <Save className="h-4 w-4" /> Save Settings
          </Button>
        </div>
      </Card>
    </div>
  )
}
