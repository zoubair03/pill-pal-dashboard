"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Pill,
  Battery,
  Wifi,
  RefreshCw,
  CheckCircle2,
  Play,
  Loader2,
  RotateCcw,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  Phone,
  Activity,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PillWheel } from "@/components/pill-wheel"
import { WeeklyMatrix } from "@/components/weekly-matrix"
import { ScheduleSettings } from "@/components/schedule-settings"
import { ThemeToggle } from "@/components/theme-toggle"
import useWebSocket, { DAYS, SESSIONS, fmt, parse } from "@/hooks/useWebSocket"
import { useMemo } from "react"

// Patient profile data
const patientProfile = {
  name: "Mohamed Ben Ali",
  age: 65,
  dateOfBirth: "1960-03-15",
  phone: "+216 71 234 567",
  emergencyContact: "+216 71 987 654",
  conditions: ["Diabetes Type 2", "Hypertension"],
  allergies: ["Penicillin"],
  avatar: "",
}

const WS_URL = "ws://192.168.1.38:81"

function formatCountdown(targetHour: number, targetMinute: number): string {
  const now = new Date()
  const target = new Date()
  target.setHours(targetHour, targetMinute, 0, 0)
  
  if (target <= now) {
    target.setDate(target.getDate() + 1)
  }
  
  const diffMs = target.getTime() - now.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  
  if (hours > 0) {
    return `in ${hours}h ${mins}m`
  }
  return `in ${mins}m`
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { 
    hour: "2-digit", 
    minute: "2-digit",
    hour12: false 
  })
}

export default function PillPalDashboard() {
  const { connected, status, alerts, history, send, dismissAlert, clearHistory } = useWebSocket(WS_URL) as any

  const isOffline = !connected
  const [isDispensing, setIsDispensing] = useState(false)
  const [countdown, setCountdown] = useState("")
  // Hardware slots assigned medicines mapping (not yet synced to ESP32 by default)
  const [slotMedicines, setSlotMedicines] = useState<Record<number, string[]>>({
    1: ["Aspirin", "Vitamin D"], 2: ["Metformin"], 3: ["Lisinopril", "Atorvastatin"], 4: ["Aspirin"]
  })

  // ESP32 variables mapping
  const batteryLevel = status?.battery || 100 // Default if missing
  const currentSlot = status?.slot || 4

  const currentDayIndex = status?.wday != null
    ? (status.wday === 0 ? 6 : status.wday - 1)
    : (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1)

  const currentHour = new Date().getHours()
  const currentSessionIndex = currentHour < 12 ? 0 : currentHour < 20 ? 1 : 2

  // --- NEW PARSED & DYNAMIC LOGIC ---
  const rawSchedule = status?.schedule || ["08:00", "13:00", "20:00"]
  
  // Calculate which session is next based on current time
  let nextSessionIndex = currentSessionIndex + 1
  if (nextSessionIndex > 2) nextSessionIndex = 0 // Wrap around to morning
  
  // Safely parse the string (e.g., "13:00") into { hour: 13, minute: 0 } for the countdown
  const nextDoseTime = typeof rawSchedule[nextSessionIndex] === "string" 
    ? parse(rawSchedule[nextSessionIndex]) 
    : { hour: 13, minute: 0 }
    
  const nextSessionName = SESSIONS[nextSessionIndex] || "Next Dose"
  const nextSessionTimeString = rawSchedule[nextSessionIndex] || "13:00"

  // Transform ESP32 dispensed matrix to WeeklyMatrix format
  const weekData = useMemo(() => {
    const daysShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    const sessionKeys = ["morning", "midday", "evening"] as const
    const data: Record<string, any> = {}
    
    for (let d = 0; d < 7; d++) {
      data[daysShort[d]] = { morning: "pending", midday: "pending", evening: "pending" }
      for (let s = 0; s < 3; s++) {
        const isDispensed = status?.dispensed?.[d]?.[s]
        
        if (isDispensed) {
          data[daysShort[d]][sessionKeys[s]] = "dispensed"
        } else {
          // Identify if it's theoretically a missed dose based on schedule passed
          if (d < currentDayIndex || (d === currentDayIndex && s < currentSessionIndex)) {
            data[daysShort[d]][sessionKeys[s]] = "missed"
          }
        }
      }
    }
    return data
  }, [status, currentDayIndex, currentSessionIndex])

  // Transform hook history into ActivityLog
  const activityLog = useMemo(() => {
    if (!history || history.length === 0) return []
    return history.map((entry: any, i: number) => ({
      id: entry.id || String(i),
      type: entry.kind === "dispensed" ? "dispensed" : entry.kind === "missed" ? "missed" : "manual",
      message: entry.kind === "dispensed" 
        ? `${SESSIONS[entry.session] || "Dose"} dispensed for ${DAYS[entry.day] || "today"}`
        : entry.kind === "missed"
        ? `Missed ${SESSIONS[entry.session]} dose`
        : entry.text || `Action at ${entry.timestamp}`,
      timeLabel: entry.timestamp || entry.date,
    }))
  }, [history])

  // Live countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      setCountdown(formatCountdown(nextDoseTime.hour, nextDoseTime.minute))
    }
    
    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    
    return () => clearInterval(interval)
  }, [nextDoseTime.hour, nextDoseTime.minute])

  const handleDispense = async () => {
    setIsDispensing(true)
    send({ action: "dispense", day: currentDayIndex, session: currentSessionIndex })
    setTimeout(() => setIsDispensing(false), 2000)
  }

  const handleManualDispense = (dayShortName: string, sessionName: string) => {
    const daysShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    const sessionKeys = ["morning", "midday", "evening"]
    const day = daysShort.indexOf(dayShortName)
    const session = sessionKeys.indexOf(sessionName)
    send({ action: "dispense", day, session })
  }

  const handleResetWeek = () => {
    send({ action: "reset" })
  }

  const handleUpdateSlotMedicines = (slot: number, medicines: string[]) => {
    setSlotMedicines((prev) => ({
      ...prev,
      [slot]: medicines,
    }))
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "dispensed":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case "manual":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />
      case "missed":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <RotateCcw className="h-4 w-4 text-primary" />
    }
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* Background gradient */}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 dark:from-primary/10 dark:to-primary/5" />
      
      {/* Offline Overlay */}
      {isOffline && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-card p-8 shadow-2xl ring-1 ring-border">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-semibold text-foreground">
              Reconnecting to PillPal Hardware...
            </p>
            <p className="text-sm text-muted-foreground">
              Please ensure your device is powered on and nearby.
            </p>
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
              <Pill className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">PillPal</span>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`hidden gap-1.5 sm:flex ${
                batteryLevel < 20
                  ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
                  : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
              }`}
            >
              <Battery className="h-3.5 w-3.5" aria-hidden="true" />
              {batteryLevel}%
            </Badge>
            <Badge
              variant="outline"
              className="hidden gap-1.5 border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 sm:flex"
            >
              <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
              Connected
            </Badge>
            <Badge
              variant="outline"
              className="hidden gap-1.5 border-border bg-secondary text-secondary-foreground md:flex"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Synced just now
            </Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container relative mx-auto space-y-4 px-4 py-4 sm:space-y-6 sm:py-6">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Patient Profile Section */}
          <div className="h-full">
            <Card className="overflow-hidden border-border/50 bg-card/80 shadow-xl shadow-black/5 backdrop-blur-sm h-full flex flex-col justify-center">
              <CardContent className="p-4 sm:py-6 flex-1 flex flex-col items-center justify-center">
                <div className="flex flex-col items-center text-center gap-5 w-full">
                  <Avatar className="h-20 w-20 border-4 border-background shadow-md shadow-primary/10 ring-2 ring-primary/20 sm:h-24 sm:w-24">
                    <AvatarImage src={patientProfile.avatar} alt={patientProfile.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold sm:text-2xl">
                      {patientProfile.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-3 w-full">
                    <h2 className="text-xl font-bold text-foreground sm:text-2xl truncate">{patientProfile.name}</h2>
                    <div className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground sm:flex-row sm:gap-4">
                      <span className="flex items-center gap-1.5 bg-secondary/50 px-2.5 py-1 rounded-md">
                        <User className="h-4 w-4 text-primary/70" />
                        {patientProfile.age}y
                      </span>
                      <span className="flex items-center gap-1.5 bg-secondary/50 px-2.5 py-1 rounded-md">
                        <Calendar className="h-4 w-4 text-primary/70" />
                        {new Date(patientProfile.dateOfBirth).toLocaleDateString("en-GB")}
                      </span>
                      <span className="flex items-center gap-1.5 bg-secondary/50 px-2.5 py-1 rounded-md">
                        <Phone className="h-4 w-4 text-primary/70" />
                        <span>{patientProfile.phone}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {patientProfile.conditions.map((condition) => (
                      <Badge key={condition} variant="default" className="bg-primary/15 text-primary hover:bg-primary/25 border-primary/20 border transition-colors shadow-sm">
                        {condition}
                      </Badge>
                    ))}
                    {patientProfile.allergies.map((allergy) => (
                      <Badge key={allergy} variant="destructive" className="bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25 border-red-500/20 border transition-colors shadow-sm">
                        Allergy: {allergy}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Schedule Settings Inline */}
          <div className="h-full">
            <ScheduleSettings 
              scheduleData={status?.schedule} 
              onSave={(parsed) => send({ action: "setschedule", schedule: parsed })}
              disabled={isOffline}
            />
          </div>
        </div>

      {/* Hero Section - Immediate Status */}
      <Card className="overflow-hidden border-emerald-200/50 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-xl shadow-emerald-500/10 dark:border-emerald-800/30 dark:from-emerald-950/50 dark:to-teal-950/50">
          <CardContent className="flex flex-col items-center gap-4 p-4 text-center sm:flex-row sm:gap-6 sm:p-6 sm:text-left">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 ring-4 ring-emerald-200/50 dark:bg-emerald-900 dark:ring-emerald-800/50 sm:h-20 sm:w-20">
              <CheckCircle2 className="h-9 w-9 text-emerald-600 dark:text-emerald-400 sm:h-11 sm:w-11" />
            </div>
            <div className="flex-1 space-y-2">
              <h1 className="text-xl font-bold text-emerald-800 dark:text-emerald-200 sm:text-2xl">
                Medication up to date
              </h1>
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
                <p className="text-base text-emerald-700 dark:text-emerald-300 sm:text-lg">
                  Next dose: <span className="font-semibold">{nextSessionName} ({nextSessionTimeString})</span>
                </p>
                <Badge 
                  variant="secondary" 
                  className="gap-1 bg-emerald-200/70 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-800 dark:text-emerald-200"
                >
                  <Clock className="h-3 w-3" />
                  {countdown}
                </Badge>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="lg"
                  className="w-full gap-2 bg-gradient-to-r from-primary to-primary/90 px-6 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all sm:w-auto sm:px-8 sm:text-lg"
                  disabled={isDispensing}
                >
                  {isDispensing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Dispensing...
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" />
                      Dispense Now
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Manual Dispense</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to dispense medication now? This action
                    will rotate the wheel to the next slot and release the current
                    dose.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDispense}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Yes, Dispense
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Hardware Mirror & Weekly Matrix */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* The Hardware Mirror (The Wheel) */}
          <Card className="overflow-hidden border-border/50 bg-card/80 shadow-xl shadow-black/5 backdrop-blur-sm">
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <div className="h-2 w-2 rounded-full bg-primary" />
                Hardware Mirror
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 sm:pb-6">
              <div className="flex flex-col items-center">
                <PillWheel 
                  currentSlot={currentSlot} 
                  slotMedicines={slotMedicines}
                  onUpdateSlotMedicines={handleUpdateSlotMedicines}
                />
                <div className="mt-3 text-center sm:mt-4">
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    22-Slot Motor Wheel - 21 Doses + Home Position
                  </p>
                  <p className="mt-1 font-semibold text-primary text-sm sm:text-base">
                    Current Position: Slot {currentSlot}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Matrix */}
          <Card className="overflow-hidden border-border/50 bg-card/80 shadow-xl shadow-black/5 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <div className="h-2 w-2 rounded-full bg-primary" />
                Weekly Overview
              </CardTitle>
              <div className="flex items-center gap-1 sm:gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950 h-8 px-2 sm:gap-1.5 sm:px-3">
                      <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Reset Week</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset Weekly Schedule?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will clear the entire 7-day schedule and mark all doses as pending for a new week.
                        <span className="mt-2 block font-medium text-red-600">
                          This action cannot be undone.
                        </span>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleResetWeek}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Yes, Reset Week
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardHeader>
            <CardContent className="pb-4 sm:pb-6">
              <WeeklyMatrix 
                weekData={weekData} 
                onManualDispense={handleManualDispense}
              />
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Log */}
        <Card className="overflow-hidden border-border/50 bg-card/80 shadow-xl shadow-black/5 backdrop-blur-sm">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Activity className="h-4 w-4 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 sm:pb-6">
            <ul className="space-y-2 sm:space-y-3">
              {activityLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              ) : (
                activityLog.map((entry: any) => (
                  <li
                    key={entry.id}
                    className="flex items-center gap-3 rounded-xl border border-border/50 bg-secondary/30 px-3 py-2.5 sm:px-4 sm:py-3"
                  >
                    {getActivityIcon(entry.type)}
                    <span className="flex-1 text-xs sm:text-sm text-foreground">{entry.message}</span>
                    <span className="text-xs text-muted-foreground">
                      {entry.timeLabel}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>

        {/* Removed Dummy Offline Mode Toggle */}
      </main>
    </div>
  )
}
