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
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime"
import { DAYS, SESSIONS, fmt } from "@/hooks/useWebSocket"
import { useMemo } from "react"
import { Settings } from "lucide-react"

import { ProfileSettings, PatientProfile } from "@/components/profile-settings"
import { MonthlyReport } from "@/components/monthly-report"
//IP ESP 32 """"""""""""""""""""""""""""""""""""""""""""""""""
const WS_URL = "ws://localhost:81"

function getSlotIndexFromDaySession(day: number, session: number): number {
  return day * 3 + session + 1
}

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
  const { connected, dispensedSlots, activityLogs, resetWeek, dispenseManual, deviceMeta, profile: remoteProfile, updateProfile, updateSchedule } = useSupabaseRealtime()

  const [isOffline, setIsOffline] = useState(false)
  const [syncDelta, setSyncDelta] = useState("just now")

  useEffect(() => {
    const checkOffline = () => {
      if (!deviceMeta?.last_sync) return
      const diffSecs = Math.floor((Date.now() - new Date(deviceMeta.last_sync).getTime()) / 1000)
      setIsOffline(diffSecs > 30)
      if (diffSecs < 10) setSyncDelta("just now")
      else if (diffSecs < 60) setSyncDelta(`${diffSecs}s ago`)
      else setSyncDelta(`${Math.floor(diffSecs / 60)}m ago`)
    }
    checkOffline()
    const timer = setInterval(checkOffline, 2000)
    return () => clearInterval(timer)
  }, [deviceMeta?.last_sync])

  const [isDispensing, setIsDispensing] = useState(false)
  const [countdown, setCountdown] = useState("")
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  const profile: PatientProfile = {
    name: remoteProfile?.full_name || "Loading...",
    age: remoteProfile?.birth_date ? Math.floor((Date.now() - new Date(remoteProfile.birth_date).getTime()) / 31557600000) : 0,
    dateOfBirth: remoteProfile?.birth_date || "2000-01-01",
    phone: remoteProfile?.phone_number || "",
    prescriptions: remoteProfile?.medication_list || [],
    avatar: "",
  }

  const handleUpdateProfile = (updated: PatientProfile) => {
    updateProfile({
      full_name: updated.name,
      birth_date: updated.dateOfBirth,
      phone_number: updated.phone,
      medication_list: updated.prescriptions
    })
  }

  // Hardware slots assigned medicines mapping
  const [slotMedicines, setSlotMedicines] = useState<Record<number, string[]>>({
    1: ["Aspirin", "Vitamin D"], 2: ["Metformin"], 3: ["Lisinopril", "Atorvastatin"], 4: ["Aspirin"]
  })

  // Supabase metadata mapping
  const batteryLevel = deviceMeta.battery_level ?? 100
  const currentSlot = deviceMeta.current_slot ?? 0

  const currentDayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

  const rawSchedule = deviceMeta.schedule || [
    { hour: 9, minute: 0 },
    { hour: 13, minute: 0 },
    { hour: 20, minute: 0 }
  ]

  // Find the next required dose based on what has actually been dispensed today
  let nextSessionIndex = -1
  let dispenseDayIndex = currentDayIndex

  for (let s = 0; s < 3; s++) {
    const slotIndex = getSlotIndexFromDaySession(currentDayIndex, s)
    if (!dispensedSlots.includes(slotIndex)) {
      nextSessionIndex = s
      break
    }
  }

  // If all 3 doses today are dispensed, the next dose is tomorrow morning
  if (nextSessionIndex === -1) {
    nextSessionIndex = 0
    dispenseDayIndex = (currentDayIndex + 1) % 7
  }

  const nextDoseTime = rawSchedule[nextSessionIndex]
  const nextSessionName = SESSIONS[nextSessionIndex] || "Next Dose"

  // Format the object into a "HH:MM" string using your fmt() hook for the HTML
  const nextSessionTimeString = fmt(nextDoseTime)

  // Transform Supabase arrays to WeeklyMatrix format
  const weekData = useMemo(() => {
    const daysShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    const sessionKeys = ["morning", "midday", "evening"] as const
    const data: Record<string, any> = {}

    for (let d = 0; d < 7; d++) {
      data[daysShort[d]] = { morning: "pending", midday: "pending", evening: "pending" }
      for (let s = 0; s < 3; s++) {
        const slot = getSlotIndexFromDaySession(d, s)
        const isDispensed = dispensedSlots.includes(slot)

        if (isDispensed) {
          data[daysShort[d]][sessionKeys[s]] = "dispensed"
        } else {
          data[daysShort[d]][sessionKeys[s]] = "pending"
        }
      }
    }
    return data
  }, [dispensedSlots, currentDayIndex, nextSessionIndex])

  // Transform hook history into ActivityLog
  const activityLog = activityLogs

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
    const slot = getSlotIndexFromDaySession(dispenseDayIndex, nextSessionIndex)
    await dispenseManual(slot)
    setTimeout(() => setIsDispensing(false), 2000)
  }

  const handleManualDispense = async (dayShortName: string, sessionName: string) => {
    setIsDispensing(true)
    const daysShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    const sessionKeys = ["morning", "midday", "evening"]
    const day = daysShort.indexOf(dayShortName)
    const session = sessionKeys.indexOf(sessionName)

    const slot = getSlotIndexFromDaySession(day, session)
    await dispenseManual(slot)
    setTimeout(() => setIsDispensing(false), 2000)
  }

  const handleResetWeek = () => {
    resetWeek()
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
              className={`hidden gap-1.5 sm:flex ${batteryLevel < 20
                ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
                : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                }`}
            >
              <Battery className="h-3.5 w-3.5" aria-hidden="true" />
              {batteryLevel}%
            </Badge>
            <Badge
              variant="outline"
              className={`hidden gap-1.5 border hover:bg-transparent sm:flex ${isOffline ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400" : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"}`}
            >
              <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
              {isOffline ? "Hardware Offline" : "Hardware Connected"}
            </Badge>
            <Badge
              variant="outline"
              className="hidden gap-1.5 border-border bg-secondary text-secondary-foreground md:flex"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Synced {syncDelta}
            </Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container relative mx-auto space-y-4 px-4 py-4 sm:space-y-6 sm:py-6">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Patient Profile Section */}
          <div className="h-full">
            <Card className="relative overflow-hidden border-border/50 bg-card/80 shadow-xl shadow-black/5 backdrop-blur-sm h-full flex flex-col justify-center">
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-background/50 hover:bg-background/80 backdrop-blur-sm shadow-sm border border-border/50"
                  onClick={() => setIsProfileModalOpen(true)}
                >
                  <Settings className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                </Button>
              </div>
              <CardContent className="p-4 sm:py-6 flex-1 flex flex-col items-center justify-center">
                <div className="flex flex-col items-center text-center gap-5 w-full">
                  <Avatar className="h-20 w-20 border-4 border-background shadow-md shadow-primary/10 ring-2 ring-primary/20 sm:h-24 sm:w-24">
                    <AvatarImage src={profile.avatar} alt={profile.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold sm:text-2xl">
                      {profile.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="space-y-3 w-full">
                    <h2 className="text-xl font-bold text-foreground sm:text-2xl truncate">{profile.name}</h2>
                    <div className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground sm:flex-row sm:gap-4">
                      <span className="flex items-center gap-1.5 bg-secondary/50 px-2.5 py-1 rounded-md">
                        <User className="h-4 w-4 text-primary/70" />
                        {profile.age}y
                      </span>
                      <span className="flex items-center gap-1.5 bg-secondary/50 px-2.5 py-1 rounded-md">
                        <Calendar className="h-4 w-4 text-primary/70" />
                        {new Date(profile.dateOfBirth).toLocaleDateString("en-GB")}
                      </span>
                      <span className="flex items-center gap-1.5 bg-secondary/50 px-2.5 py-1 rounded-md">
                        <Phone className="h-4 w-4 text-primary/70" />
                        <span>{profile.phone}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1 transition-all">
                    {profile.prescriptions.map((med) => (
                      <Badge key={med} variant="default" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 border-emerald-500/20 border shadow-sm">
                        <Pill className="h-3 w-3 mr-1.5" />
                        {med}
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
              scheduleData={rawSchedule}
              onSave={(parsed) => updateSchedule(parsed)}
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
                  isDispensing={isDispensing}
                  slotMedicines={slotMedicines}
                  onUpdateSlotMedicines={handleUpdateSlotMedicines}
                  dispensedSlots={dispensedSlots}
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
                disabled={isDispensing}
                currentDayIndex={currentDayIndex}
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Recent Activity Log */}
          <Card className="overflow-hidden border-border/50 bg-card/80 shadow-xl shadow-black/5 backdrop-blur-sm flex flex-col h-full">
            <CardHeader className="pb-2 sm:pb-4 border-b border-border/10 bg-muted/20">
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

          {/* Monthly Analytics Report */}
          <div className="h-full print:block">
            <MonthlyReport />
          </div>
        </div>

      </main>

      <ProfileSettings
        open={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
        profile={profile}
        onUpdateProfile={handleUpdateProfile}
      />
    </div>
  )
}
