"use client"

import { useRouter } from 'next/navigation'
import { Wifi, Smartphone, CheckCircle, ArrowRight, Power, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STEPS = [
  {
    number: '1',
    Icon: Power,
    iconBg:    'bg-amber-50 dark:bg-amber-950/60',
    iconColor: 'text-amber-600 dark:text-amber-400',
    title: 'Power on the device',
    desc:  'Plug your Pill Pal into power and wait ~10 seconds for it to boot up. The LED will pulse blue.',
  },
  {
    number: '2',
    Icon: Smartphone,
    iconBg:    'bg-sky-50 dark:bg-sky-950/60',
    iconColor: 'text-sky-600 dark:text-sky-400',
    title: 'Connect to the Setup Network',
    desc:  (
      <>
        Open your phone&apos;s WiFi settings and connect to the network named{' '}
        <strong className="text-primary">PillPal-Setup</strong>.
      </>
    ),
  },
  {
    number: '3',
    Icon: Wifi,
    iconBg:    'bg-primary/8 dark:bg-primary/12',
    iconColor: 'text-primary',
    title: 'Enter your Home WiFi credentials',
    desc:  'A captive portal will open automatically. Select your home network, enter the password, and click Save. Your device will restart and connect!',
  },
]

export default function SetupWifiPage() {
  const router = useRouter()

  return (
    <div className="mesh-bg min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Brand header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-xl shadow-primary/30">
            <Wifi className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Connect to WiFi</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            Your Pill Pal needs internet access to sync schedules and dispense medication automatically.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-xl shadow-black/5 dark:shadow-black/20">

          {/* Steps */}
          <div className="p-6 sm:p-8 space-y-1">
            {STEPS.map((step, i) => (
              <div key={i} className="relative">
                <div className="flex gap-4 items-start py-4">
                  {/* Icon */}
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${step.iconBg}`}>
                    <step.Icon className={`h-5 w-5 ${step.iconColor}`} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Step {step.number}
                      </span>
                    </div>
                    <h3 className="font-semibold text-foreground">{step.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </div>

                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="absolute left-[21px] top-[60px] h-[calc(100%-16px)] w-px bg-border/60" />
                )}
              </div>
            ))}
          </div>

          {/* Hint */}
          <div className="mx-6 mb-6 flex items-start gap-2.5 rounded-xl border border-border/50 bg-secondary/50 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              If no portal appears automatically, open your browser and navigate to{' '}
              <strong className="text-foreground font-mono">192.168.4.1</strong>.
              If using the Python mock, use <strong className="text-foreground font-mono">localhost:8080</strong>.
            </p>
          </div>

          {/* CTA */}
          <div className="border-t border-border/40 p-6 sm:px-8">
            <Button
              id="wifi-done-btn"
              onClick={() => router.push('/')}
              className="w-full h-11 gap-2 bg-primary hover:bg-primary/90 font-semibold shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30 group"
            >
              <CheckCircle className="h-4 w-4 opacity-80 group-hover:opacity-100 transition-opacity" />
              I&apos;ve connected my device
              <ArrowRight className="h-4 w-4 ml-auto opacity-70 group-hover:translate-x-1 transition-all" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
