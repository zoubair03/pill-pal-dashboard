"use client"

import { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Pill, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'

function VerifyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailParam = searchParams.get('email')
  
  const [email] = useState(emailParam || '')
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Auto redirect if someone lands here without an email
  useEffect(() => {
    if (!email) {
      router.push('/login')
    }
  }, [email, router])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    })

    if (verifyError) {
      setError(verifyError.message)
      setLoading(false)
      return
    }

    // Success! Let middleware/hooks redirect them if they need setup!
    router.push('/')
  }

  return (
    <div className="w-full max-w-sm space-y-8 bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl shadow-emerald-500/5 border border-zinc-200 dark:border-zinc-800">
      
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-4">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          We've sent a 6-digit code to <span className="font-semibold text-zinc-900 dark:text-zinc-100">{email}</span>
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-4 pt-4">
        {error && (
          <div className="p-3 text-sm bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-900/50">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Input 
            id="token" 
            type="text" 
            inputMode="numeric"
            maxLength={6}
            disabled={loading}
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="•  •  •  •  •  •" 
            className="text-center text-2xl tracking-[0.5em] font-mono h-14"
            required 
          />
        </div>

        <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-4 h-12" disabled={loading || token.length !== 6}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify Code"}
        </Button>

        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 pt-4">
          <Link href="/login" className="font-semibold text-zinc-600 dark:text-zinc-400 hover:text-emerald-600">
            Re-enter email address
          </Link>
        </p>
      </form>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <Suspense fallback={<div className="animate-pulse w-64 h-64 bg-zinc-200 dark:bg-zinc-800 rounded-3xl" />}>
        <VerifyContent />
      </Suspense>
    </div>
  )
}
