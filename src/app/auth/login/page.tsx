'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Hammer,
  Users,
  Calendar,
  FileText,
  Camera,
  MessageSquare,
  Mail,
  Key,
} from 'lucide-react'

const features = [
  { icon: Users, title: 'Client Management', desc: 'Keep track of all your clients and their history' },
  { icon: FileText, title: 'Smart Quotes', desc: 'Create professional quotes with GST auto-calculated' },
  { icon: Calendar, title: 'Visit Scheduling', desc: 'Schedule and manage on-site visits' },
  { icon: Camera, title: 'Portfolio Gallery', desc: 'Showcase your best work to attract new clients' },
  { icon: MessageSquare, title: 'Client Messaging', desc: 'Send SMS and email updates directly' },
  { icon: Hammer, title: 'Built for Tradies', desc: 'Designed for electricians, plumbers, builders & more' },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'magic'>('login')
  const supabase = createClient()

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)

    // Call Supabase auth API directly
    const res = await fetch(
      'https://mpgrsobnxpumzyabomaz.supabase.co/auth/v1/token?grant_type=password',
      {
        method: 'POST',
        headers: {
          apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZ3Jzb2JueHB1bXp5YWJvbWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMDM1MjUsImV4cCI6MjA5MTY3OTUyNX0.d28yAWJpPxRU2i2yLQZjsseXv6AWBqKHmoDeRv_NWP8',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), password }),
      }
    )
    const data = await res.json()

    setLoading(false)

    if (data.error) {
      if (data.error_description?.includes('Invalid login') || data.msg?.includes('Invalid')) {
        // Try sign up
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        })
        if (signUpError) {
          toast.error(signUpError.message)
          return
        }
        // Sign up worked, now set session manually
        const loginRes = await fetch(
          'https://mpgrsobnxpumzyabomaz.supabase.co/auth/v1/token?grant_type=password',
          {
            method: 'POST',
            headers: {
              apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZ3Jzb2JueHB1bXp5YWJvbWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMDM1MjUsImV4cCI6MjA5MTY3OTUyNX0.d28yAWJpPxRU2i2yLQZjsseXv6AWBqKHmoDeRv_NWP8',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: email.trim(), password }),
          }
        )
        const loginData = await loginRes.json()
        if (loginData.access_token) {
          await supabase.auth.setSession({
            access_token: loginData.access_token,
            refresh_token: loginData.refresh_token,
          })
          window.location.href = '/dashboard'
        } else {
          toast.error('Login failed after sign up')
        }
        return
      }
      toast.error(data.error_description || data.msg || 'Login failed')
      return
    }

    // Success - set session via supabase client (handles cookies properly)
    await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    })
    window.location.href = '/dashboard'
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Check your email for the magic link!')
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)
    if (error) toast.error(error.message)
  }

  const isLogin = mode === 'login'

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center px-4 pt-20 pb-12 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20">
          <Hammer className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Tradios
        </h1>
        <p className="mt-2 text-lg font-medium gradient-text">
          La App para Tradies Australianos
        </p>
        <p className="mt-3 max-w-lg text-sm text-muted">
          Gestiona clientes, visitas, cotizaciones y más desde un solo lugar.
          Diseñado para tradespeople en Australia.
        </p>
      </section>

      {/* Features Grid */}
      <section className="mx-auto max-w-5xl px-4 pb-12">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-card-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md card-glow"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 mb-2.5">
                <feature.icon className="h-4.5 w-4.5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-0.5 text-xs text-muted">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Login Section */}
      <section className="mx-auto max-w-md px-4 pb-24">
        <div className="rounded-xl border border-card-border bg-card p-6 shadow-md">
          {/* Tabs */}
          <div className="flex rounded-xl bg-background p-1 mb-6 border border-card-border">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                isLogin ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-foreground'
              }`}
            >
              <Key className="h-3.5 w-3.5 inline mr-1.5" />
              Password
            </button>
            <button
              onClick={() => setMode('magic')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                !isLogin ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-foreground'
              }`}
            >
              <Mail className="h-3.5 w-3.5 inline mr-1.5" />
              Magic Link
            </button>
          </div>

          {isLogin ? (
            /* Password Login */
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <Input
                id="email"
                type="email"
                label="Email address"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                id="password"
                type="password"
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full"
              >
                Sign In / Create Account
              </Button>
              <p className="text-xs text-center text-muted">
                First time? Just enter your email + password and we&apos;ll create your account ✨
              </p>
            </form>
          ) : (
            /* Magic Link */
            <form onSubmit={handleMagicLink} className="space-y-4">
              <Input
                id="email-magic"
                type="email"
                label="Email address"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full"
              >
                Send Magic Link
              </Button>
            </form>
          )}

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted">or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={handleGoogleLogin}
            loading={loading}
            className="w-full"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </Button>
        </div>
      </section>
    </div>
  )
}
