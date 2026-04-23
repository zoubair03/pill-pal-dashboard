"use client"

import { useRouter } from 'next/navigation'
import { Wifi, Smartphone, CheckCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SetupWifiPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-lg space-y-8 bg-white dark:bg-zinc-900 p-8 sm:p-10 rounded-3xl shadow-xl shadow-sky-500/5 border border-zinc-200 dark:border-zinc-800">
        
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 rounded-full flex items-center justify-center mb-6">
            <Wifi className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Connect to WiFi</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 pb-2">
            Your Pill Pal needs internet access to sync your schedules and dispense medication automatically. Follow these steps:
          </p>
        </div>

        <div className="space-y-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-600 dark:text-zinc-300">
              1
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Power on the device</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Plug your Pill Pal into the wall. Wait 10 seconds for it to boot up.</p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-600 dark:text-zinc-300">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Connect to the Setup Network</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Open your phone's WiFi settings and connect to the network named <strong className="text-sky-600 dark:text-sky-400">PillPal-Setup</strong>.</p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-600 dark:text-zinc-300">
              3
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Enter your Home WiFi Protocol</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">A screen will automatically pop up on your phone. Select your home network and enter your password. The Pill Pal will restart and connect!</p>
            </div>
          </div>

        </div>

        <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 mt-8">
          <Button 
            onClick={() => router.push('/')} 
            className="w-full bg-sky-600 hover:bg-sky-700 text-white h-12 text-base shadow-md shadow-sky-600/20 group"
          >
            <CheckCircle className="mr-2 h-5 w-5 opacity-70 group-hover:opacity-100 transition-opacity" />
            I've connected my device
            <ArrowRight className="ml-2 h-4 w-4 opacity-70 group-hover:translate-x-1 transition-all" />
          </Button>
          <p className="text-xs text-center text-zinc-400 mt-4">
            If no popup appears on your phone automatically, open your browser and go to http://192.168.4.1 (or http://localhost:8080 if using the Python Mock)
          </p>
        </div>

      </div>
    </div>
  )
}
