"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QrCode, Power, Loader2, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'

export default function SetupPage() {
  const router = useRouter()
  const [serialNumber, setSerialNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Verify session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
       router.push('/login')
       return
    }

    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ serial_number: serialNumber.trim() })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to claim device')
      }

      // Success! Proceed to the Hardware Configuration screen
      router.push('/setup/wifi')
      
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl shadow-sky-500/5 border border-zinc-200 dark:border-zinc-800 relative overflow-hidden">
        
        {/* Logout button top right */}
        <button 
          onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
          className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          <LogOut className="h-5 w-5" />
        </button>

        <div className="text-center space-y-4 pt-4">
          <div className="mx-auto w-16 h-16 bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 rounded-full flex items-center justify-center mb-6">
            <Power className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Add Your Device</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
            To unlock your dashboard, power on your Pill Pal and enter the Serial Number located on the back or in the box.
          </p>
        </div>

        <form onSubmit={handleClaim} className="space-y-6 pt-4 cursor-text border-t border-dashed border-zinc-200 dark:border-zinc-800 mt-4">
          
          <div className="pt-4">
             {error && (
              <div className="mb-4 p-3 text-sm bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-900/50">
                {error}
              </div>
            )}
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">Serial Number</label>
            <div className="relative">
              <QrCode className="absolute left-3 top-3 h-5 w-5 text-zinc-400" />
              <Input 
                disabled={loading}
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                placeholder="SN-XXXXXXX" 
                className="pl-10 text-lg uppercase h-12"
                required 
              />
            </div>
          </div>

          <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 text-white h-12 text-base shadow-md shadow-sky-600/20" disabled={loading}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Link Device"}
          </Button>

        </form>
      </div>
    </div>
  )
}
