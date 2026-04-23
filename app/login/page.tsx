"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Pill, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false, // Login page shouldn't create accounts!
      }
    })

    if (error) {
      if (error.message.includes("Signups not allowed for otp")) {
         setError("No account found with this email. Please register first.")
      } else {
         setError(error.message)
      }
      setLoading(false)
    } else {
      router.push(`/verify?email=${encodeURIComponent(email)}`)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-sm space-y-8 bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl shadow-emerald-500/5 border border-zinc-200 dark:border-zinc-800">
        
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-4">
            <Pill className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Enter your email to receive a secure login code.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 pt-4">
          {error && (
            <div className="p-3 text-sm bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-900/50">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input 
              id="email" 
              type="email" 
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com" 
              required 
            />
          </div>

          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-4" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Login Code"}
          </Button>

          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 pt-4">
            Don't have an account?{' '}
            <Link href="/register" className="font-semibold text-emerald-600 dark:text-emerald-500 hover:text-emerald-500">
              Register here <ArrowRight className="inline h-3 w-3 ml-0.5" />
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
