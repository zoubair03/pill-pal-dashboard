"use client"

import { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { MailCheck, Loader2, ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'

function VerifyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailParam   = searchParams.get('email')

  const [email]           = useState(emailParam || '')
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!email) router.push('/login')
  }, [email, router])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })

    if (verifyError) {
      setError(verifyError.message)
      setLoading(false)
      return
    }

    router.push('/')
  }

  // Each digit progress indicator
  const filled = token.length

  return (
    <div className="w-full max-w-sm">

      {/* Brand */}
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/15">
          <MailCheck className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Check your inbox</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs">
          We sent a 6-digit code to{' '}
          <span className="font-semibold text-foreground">{email}</span>.
          Enter it below to sign in.
        </p>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-xl shadow-black/5 dark:shadow-black/20">
        <div className="p-6 sm:p-8">
          <form onSubmit={handleVerify} className="space-y-5">
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-400">
                <span className="mt-0.5 shrink-0">⚠</span>
                {error}
              </div>
            )}

            {/* Code input */}
            <div className="space-y-3">
              <Input
                id="otp-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                disabled={loading}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="• • • • • •"
                className="text-center text-3xl tracking-[0.6em] font-mono h-16 border-2 focus:border-primary transition-colors"
                required
              />

              {/* Progress dots */}
              <div className="flex items-center justify-center gap-1.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-6 rounded-full transition-all duration-300 ${
                      i < filled ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                ))}
              </div>
            </div>

            <Button
              id="verify-btn"
              type="submit"
              className="w-full h-11 gap-2 bg-primary hover:bg-primary/90 font-semibold shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30"
              disabled={loading || token.length !== 6}
            >
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</>
                : 'Verify & Sign In'
              }
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/50 px-6 py-4 text-sm text-muted-foreground">
          <Link
            href="/login"
            className="flex items-center gap-1.5 font-medium hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Change email
          </Link>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
            }}
            className="flex items-center gap-1.5 font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Resend code
          </button>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Code expires in 10 minutes · Check spam if not received
      </p>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <div className="mesh-bg min-h-screen flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="w-full max-w-sm space-y-4">
            <div className="skeleton h-14 w-14 rounded-2xl mx-auto" />
            <div className="skeleton h-8 w-48 rounded-lg mx-auto" />
            <div className="skeleton h-64 w-full rounded-2xl" />
          </div>
        }
      >
        <VerifyContent />
      </Suspense>
    </div>
  )
}
