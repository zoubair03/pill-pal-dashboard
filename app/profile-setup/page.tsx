"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Calendar, Phone, ArrowRight, Loader2, CheckCircle2, Pill } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'

export default function ProfileSetupPage() {
  const router = useRouter()

  const [fullName, setFullName]   = useState('')
  const [dob, setDob]             = useState('')
  const [phone, setPhone]         = useState('')
  const [error, setError]         = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)
  const [success, setSuccess]     = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const { error: dbError } = await supabase
      .from('profiles')
      .upsert({
        id:           session.user.id,
        full_name:    fullName.trim(),
        birth_date:   dob,
        phone_number: phone.trim(),
        medication_list: [],
      })

    if (dbError) {
      setError(dbError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/setup'), 1000)
  }

  // Calculate age preview
  const agePreview = dob
    ? Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000)
    : null

  return (
    <div className="mesh-bg min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Brand + progress */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-xl shadow-primary/30">
            <Pill className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Set up your profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This information helps personalize your medication schedule.
          </p>

          {/* Step indicator */}
          <div className="mt-4 flex items-center gap-2">
            {[
              { label: 'Account', done: true },
              { label: 'Profile', active: true },
              { label: 'Device', done: false },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  step.done
                    ? 'bg-primary text-primary-foreground'
                    : step.active
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                    : 'bg-secondary text-muted-foreground'
                }`}>
                  {step.done && i === 0 ? '✓' : i + 1}
                </div>
                <span className={`text-xs font-medium ${step.active ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.label}
                </span>
                {i < 2 && <div className="h-px w-6 bg-border" />}
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-xl shadow-black/5 dark:shadow-black/20">
          <div className="p-6 sm:p-8">
            <form onSubmit={handleSave} className="space-y-5">

              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-400">
                  <span className="mt-0.5 shrink-0">⚠</span>
                  {error}
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Profile saved! Setting up your device...
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="fullname" className="text-sm font-semibold">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullname"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ahmed Ben Ali"
                    className="pl-9 h-11"
                    disabled={loading || success}
                    required
                  />
                </div>
              </div>

              {/* Date of Birth */}
              <div className="space-y-1.5">
                <Label htmlFor="dob" className="text-sm font-semibold">
                  Date of Birth
                  {agePreview !== null && agePreview > 0 && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      ({agePreview} years old)
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="dob"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="pl-9 h-11"
                    disabled={loading || success}
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="phone-setup" className="text-sm font-semibold">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone-setup"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+216 XX XXX XXX"
                    className="pl-9 h-11"
                    disabled={loading || success}
                    required
                  />
                </div>
              </div>

              <Button
                id="save-profile-btn"
                type="submit"
                className="w-full h-11 gap-2 bg-primary hover:bg-primary/90 font-semibold shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30 mt-2"
                disabled={loading || success}
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                  : success
                  ? <><CheckCircle2 className="h-4 w-4" /> Saved!</>
                  : <> Save & Continue <ArrowRight className="h-4 w-4" /></>
                }
              </Button>
            </form>
          </div>

          <div className="border-t border-border/40 px-6 py-4">
            <p className="text-xs text-center text-muted-foreground">
              You can update this information anytime from your dashboard settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
