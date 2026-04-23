"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Pill, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: { 
          full_name: name,
          phone: phone
        } 
      }
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push(`/verify?email=${encodeURIComponent(email)}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-sm space-y-8 bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl shadow-emerald-500/5 border border-zinc-200 dark:border-zinc-800">
        
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-4">
            <Pill className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Create Account</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Setup your Pill Pal dashboard via Email Code
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4 pt-4">
          {error && (
            <div className="p-3 text-sm bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-900/50">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input 
              id="name" 
              disabled={loading}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe" 
              required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input 
              id="phone" 
              type="tel"
              disabled={loading}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1234567890" 
              required 
            />
          </div>

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
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Verification Code"}
          </Button>

          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 pt-4">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-emerald-600 dark:text-emerald-500 hover:text-emerald-500">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
