"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QrCode, Cpu, Loader2, LogOut, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'

const EXAMPLE_SNS = ['SN-A1B2C3', 'SN-X9Y8Z7', 'SN-M4D3H1']

export default function SetupPage() {
  const router = useRouter()
  const [serialNumber, setSerialNumber] = useState('')
  const [error, setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ serial_number: serialNumber.trim() }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to claim device')

      setSuccess(true)
      setTimeout(() => router.push('/setup/wifi'), 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setLoading(false)
    }
  }

  return (
    <div className="mesh-bg min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Brand header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-xl shadow-primary/30">
            <Cpu className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Add Your Device</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">
            Enter the Serial Number on the back of your Pill Pal to link it to your account.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-xl shadow-black/5 dark:shadow-black/20">

          {/* Sign out */}
          <div className="flex items-center justify-between border-b border-border/40 px-6 py-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Device Setup</span>
            <button
              onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>

          <div className="p-6 sm:p-8">
            <form onSubmit={handleClaim} className="space-y-5">
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Device claimed! Redirecting to WiFi setup...
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="serial" className="text-sm font-semibold">Serial Number</Label>
                <div className="relative">
                  <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="serial"
                    disabled={loading || success}
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                    placeholder="SN-XXXXXXX"
                    className="pl-9 h-12 text-lg font-mono uppercase tracking-widest"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Found on a label on the bottom of your device.
                </p>
              </div>

              <Button
                id="claim-device-btn"
                type="submit"
                className="w-full h-11 gap-2 bg-primary hover:bg-primary/90 font-semibold shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30"
                disabled={loading || success || serialNumber.length < 6}
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Claiming device...</>
                  : success
                  ? <><CheckCircle2 className="h-4 w-4" /> Claimed!</>
                  : 'Link Device to Account'
                }
              </Button>
            </form>
          </div>

          {/* Sample SNs hint */}
          <div className="border-t border-border/40 px-6 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Available demo devices
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_SNS.map(sn => (
                <button
                  key={sn}
                  type="button"
                  onClick={() => setSerialNumber(sn)}
                  className="rounded-lg border border-border/60 bg-secondary/60 px-3 py-1 font-mono text-xs font-medium text-foreground hover:bg-secondary hover:border-primary/40 transition-colors"
                >
                  {sn}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
