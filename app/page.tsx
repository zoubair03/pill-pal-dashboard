"use client"

import { useState, useEffect, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  WifiOff,
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
  Settings,
  TrendingUp,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { WeeklyMatrix } from "@/components/weekly-matrix"
import { ScheduleSettings } from "@/components/schedule-settings"
import { ThemeToggle } from "@/components/theme-toggle"
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime"
import { SESSIONS, fmt } from "@/lib/utils"
import { ProfileSettings, PatientProfile } from "@/components/profile-settings"
import { MonthlyReport } from "@/components/monthly-report"

// ── Helpers ───────────────────────────────────────────────────────────────────

// Wheel types (module-level so they're available throughout the file)
type WheelName = 'morning' | 'midday' | 'night'
const WHEEL_NAMES: WheelName[] = ['morning', 'midday', 'night']

function formatCountdown(targetHour: number, targetMinute: number): string {
  const now = new Date()
  const target = new Date()
  target.setHours(targetHour, targetMinute, 0, 0)
  if (target <= now) target.setDate(target.getDate() + 1)
  const diffMs = target.getTime() - now.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  return hours > 0 ? `in ${hours}h ${mins}m` : `in ${mins}m`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PillPalDashboard() {
  const {
    connected,
    dispensedByWheel,
    activityLogs,
    resetWeek,
    dispenseManual,
    deviceMeta,
    profile: remoteProfile,
    updateProfile,
    updateSchedule,
  } = useSupabaseRealtime()

  const [isOffline, setIsOffline]             = useState(false)
  const [syncDelta, setSyncDelta]             = useState("just now")
  const [isDispensing, setIsDispensing]       = useState(false)
  const [countdown, setCountdown]             = useState("")
  const [isProfileOpen, setIsProfileOpen]     = useState(false)
  // Optimistic: track locally what we just sent to the device,
  // so the UI advances immediately without waiting for the ESP32 callback.
  const [optimistic, setOptimistic] = useState<Record<WheelName, number[]>>({ morning: [], midday: [], night: [] })

  // ── Hardware connection status ───────────────────────────────────────────
  useEffect(() => {
    const check = () => {
      if (!deviceMeta?.last_sync) return
      const diffSecs = Math.floor((Date.now() - new Date(deviceMeta.last_sync).getTime()) / 1000)
      setIsOffline(diffSecs > 30)
      if (diffSecs < 10)       setSyncDelta("just now")
      else if (diffSecs < 60)  setSyncDelta(`${diffSecs}s ago`)
      else if (diffSecs < 3600) setSyncDelta(`${Math.floor(diffSecs / 60)}m ago`)
      else if (diffSecs < 86400) setSyncDelta(`${Math.floor(diffSecs / 3600)}h ago`)
      else                     setSyncDelta(`${Math.floor(diffSecs / 86400)}d ago`)
    }
    check()
    const t = setInterval(check, 2000)
    return () => clearInterval(t)
  }, [deviceMeta?.last_sync])

  // ── Profile ──────────────────────────────────────────────────────────────
  const profile: PatientProfile = {
    name: remoteProfile?.full_name || (remoteProfile ? "New Patient" : "Loading..."),
    age:  remoteProfile?.birth_date
      ? Math.floor((Date.now() - new Date(remoteProfile.birth_date).getTime()) / 31557600000)
      : 0,
    dateOfBirth:   remoteProfile?.birth_date || "2000-01-01",
    phone:         remoteProfile?.phone_number || "",
    prescriptions: remoteProfile?.medication_list || [],
    avatar:        "",
  }

  const handleUpdateProfile = (updated: PatientProfile) => {
    updateProfile({
      full_name:       updated.name,
      birth_date:      updated.dateOfBirth,
      phone_number:    updated.phone,
      medication_list: updated.prescriptions,
    })
  }

  // ── Schedule & next dose ─────────────────────────────────────────────────
  const batteryLevel   = deviceMeta.battery_level ?? 100
  const currentDayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

  const rawSchedule = deviceMeta.schedule || [
    { hour: 9, minute: 0 },
    { hour: 13, minute: 0 },
    { hour: 20, minute: 0 },
  ]

  // daySlot: 1=Mon...7=Sun (matches DB and firmware)
  const todayDaySlot = currentDayIndex + 1

  // Merge realtime + optimistic so the UI always shows the latest intent
  const effectiveDispensed: Record<WheelName, number[]> = {
    morning: [...new Set([...(dispensedByWheel.morning ?? []), ...optimistic.morning])],
    midday:  [...new Set([...(dispensedByWheel.midday  ?? []), ...optimistic.midday])],
    night:   [...new Set([...(dispensedByWheel.night   ?? []), ...optimistic.night])],
  }

  // Check if a wheel+day is dispensed (optimistic-aware)
  const isDispensed = (wheel: WheelName, daySlot: number) =>
    effectiveDispensed[wheel].includes(daySlot)

  // Find next undispensed session for today
  let nextSessionIndex = -1
  for (let s = 0; s < 3; s++) {
    if (!isDispensed(WHEEL_NAMES[s], todayDaySlot)) {
      nextSessionIndex = s
      break
    }
  }
  const dispenseDaySlot = nextSessionIndex === -1
    ? (todayDaySlot % 7) + 1   // tomorrow
    : todayDaySlot
  if (nextSessionIndex === -1) nextSessionIndex = 0

  const nextDoseTime        = rawSchedule[nextSessionIndex]
  const nextSessionName     = SESSIONS[nextSessionIndex] || "Next Dose"
  const nextSessionTimeStr  = fmt(nextDoseTime)

  // ── Weekly matrix data ───────────────────────────────────────────────────
  type DoseStatus = "dispensed" | "pending" | "missed"
  const weekData = useMemo(() => {
    const daysShort   = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    const sessionKeys = ["morning", "midday", "night"] as const
    const data: Record<string, { morning: DoseStatus; midday: DoseStatus; night: DoseStatus }> = {}

    for (let d = 0; d < 7; d++) {
      const daySlot = d + 1  // 1=Mon...7=Sun
      data[daysShort[d]] = { morning: "pending", midday: "pending", night: "pending" }
      for (const w of sessionKeys) {
        data[daysShort[d]][w] = effectiveDispensed[w].includes(daySlot) ? "dispensed" : "pending"
      }
    }
    return data
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispensedByWheel, optimistic])

  // ── Countdown ────────────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => setCountdown(formatCountdown(nextDoseTime.hour, nextDoseTime.minute))
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [nextDoseTime.hour, nextDoseTime.minute])

  // Optimistically mark a slot so the UI advances immediately
  const markOptimistic = (wheel: WheelName, daySlot: number) => {
    setOptimistic(prev => ({
      ...prev,
      [wheel]: prev[wheel].includes(daySlot) ? prev[wheel] : [...prev[wheel], daySlot]
    }))
  }

  const handleDispense = async () => {
    const wheel   = WHEEL_NAMES[nextSessionIndex]
    const daySlot = dispenseDaySlot
    setIsDispensing(true)
    // Optimistically advance the UI immediately
    markOptimistic(wheel, daySlot)
    try {
      const res  = await dispenseManual(wheel, daySlot)
      if (!res?.ok) console.error('[Dispense] MQTT failed:', res)
    } catch (e) {
      console.error('[Dispense] Error:', e)
    } finally {
      setTimeout(() => setIsDispensing(false), 1500)
    }
  }

  const handleManualDispense = async (dayShortName: string, sessionName: string) => {
    const daysShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    const wheelMap: Record<string, WheelName> = { morning: 'morning', midday: 'midday', evening: 'night', night: 'night' }
    const daySlot = daysShort.indexOf(dayShortName) + 1  // 1-7
    const wheel   = wheelMap[sessionName] ?? 'morning'
    if (!daySlot || daySlot < 1) return
    setIsDispensing(true)
    // Optimistically mark this slot immediately
    markOptimistic(wheel, daySlot)
    try {
      const res = await dispenseManual(wheel, daySlot)
      if (!res?.ok) console.error('[ManualDispense] MQTT failed:', res)
    } catch (e) {
      console.error('[ManualDispense] Error:', e)
    } finally {
      setTimeout(() => setIsDispensing(false), 1500)
    }
  }

  // ── Activity icon ────────────────────────────────────────────────────────
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "dispensed": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case "manual":    return <AlertTriangle className="h-4 w-4 text-amber-500" />
      case "missed":    return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:          return <RotateCcw className="h-4 w-4 text-primary" />
    }
  }

  // ── Weekly adherence stat ─────────────────────────────────────────────────
  const weeklyDone = Object.values(effectiveDispensed).reduce((sum, arr) => sum + arr.length, 0)
  const weeklyPct  = Math.round((weeklyDone / 21) * 100)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen bg-background mesh-bg">

      {/* ── Top Nav ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md shadow-primary/30">
              <Pill className="h-4.5 w-4.5" aria-hidden="true" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base font-bold tracking-tight text-foreground">PillPal</span>
              <span className="hidden text-[10px] font-medium text-muted-foreground sm:block">Smart Medication System</span>
            </div>
          </div>

          {/* Status + Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Battery */}
            <Badge
              variant="outline"
              className={`hidden gap-1.5 rounded-lg sm:flex ${
                batteryLevel < 20
                  ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800/60 dark:bg-red-950/60 dark:text-red-400"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-400"
              }`}
            >
              <Battery className="h-3.5 w-3.5" aria-hidden="true" />
              {batteryLevel}%
            </Badge>

            {/* Connection */}
            <Badge
              variant="outline"
              className={`gap-1.5 rounded-lg ${
                isOffline
                  ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/60 dark:text-amber-400"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-400"
              }`}
            >
              {isOffline
                ? <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
                : <Wifi    className="h-3.5 w-3.5" aria-hidden="true" />
              }
              <span className="hidden sm:inline">{isOffline ? "Offline" : "Connected"}</span>
            </Badge>

            {/* Sync */}
            <Badge
              variant="outline"
              className="hidden gap-1.5 rounded-lg border-border bg-muted/50 text-muted-foreground md:flex"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              {syncDelta}
            </Badge>

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 sm:py-6">

        {/* ── Row 1: Patient + Schedule ───────────────────────────────────── */}
        <div className="grid gap-5 lg:grid-cols-2">

          {/* Patient Card */}
          <Card className="glass-card relative overflow-hidden">
            {/* Edit button */}
            <div className="absolute right-4 top-4 z-10">
              <Button
                variant="ghost"
                size="icon"
                id="edit-profile-btn"
                className="h-8 w-8 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                onClick={() => setIsProfileOpen(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>

            <CardContent className="flex flex-col items-center gap-5 p-6 text-center">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="h-20 w-20 ring-4 ring-background shadow-xl shadow-primary/10 sm:h-24 sm:w-24">
                  <AvatarImage src={profile.avatar} alt={profile.name} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-2xl font-bold">
                    {profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                {/* Online dot */}
                <span className={`absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-background ${isOffline ? "bg-amber-400" : "bg-emerald-500"}`} />
              </div>

              {/* Name */}
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-foreground sm:text-2xl">{profile.name}</h2>
                <p className="text-sm text-muted-foreground">Patient</p>
              </div>

              {/* Info chips */}
              <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
                <span className="flex items-center gap-1.5 rounded-lg bg-secondary/80 px-3 py-1.5 font-medium text-foreground">
                  <User className="h-3.5 w-3.5 text-primary/60" />
                  {profile.age}y
                </span>
                <span className="flex items-center gap-1.5 rounded-lg bg-secondary/80 px-3 py-1.5 font-medium text-foreground">
                  <Calendar className="h-3.5 w-3.5 text-primary/60" />
                  {new Date(profile.dateOfBirth).toLocaleDateString("en-GB")}
                </span>
                <span className="flex items-center gap-1.5 rounded-lg bg-secondary/80 px-3 py-1.5 font-medium text-foreground">
                  <Phone className="h-3.5 w-3.5 text-primary/60" />
                  {profile.phone || "—"}
                </span>
              </div>

              {/* Prescriptions */}
              {profile.prescriptions.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {profile.prescriptions.map(med => (
                    <Badge
                      key={med}
                      className="gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 border font-medium"
                    >
                      <Pill className="h-3 w-3" />
                      {med}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schedule */}
          <ScheduleSettings
            scheduleData={rawSchedule}
            onSave={(parsed) => updateSchedule(parsed)}
            disabled={isOffline}
          />
        </div>

        {/* ── Row 2: Hero Dispense Banner ──────────────────────────────────── */}
        <Card className="overflow-hidden border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-sky-50/40 shadow-xl shadow-emerald-500/10 dark:border-emerald-800/30 dark:from-emerald-950/60 dark:via-teal-950/40 dark:to-sky-950/30">
          <CardContent className="flex flex-col items-center gap-5 p-5 text-center sm:flex-row sm:gap-6 sm:p-6 sm:text-left">

            {/* Status icon */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 ring-4 ring-emerald-200/60 dark:bg-emerald-900/50 dark:ring-emerald-800/40 sm:h-20 sm:w-20">
              <CheckCircle2 className="h-9 w-9 text-emerald-600 dark:text-emerald-400 sm:h-11 sm:w-11" />
            </div>

            {/* Text */}
            <div className="flex-1 space-y-1.5">
              <h1 className="text-xl font-bold text-emerald-800 dark:text-emerald-200 sm:text-2xl">
                Medication up to date
              </h1>
              <div className="flex flex-col items-center gap-2 sm:flex-row">
                <p className="text-emerald-700 dark:text-emerald-300 sm:text-lg">
                  Next dose:{" "}
                  <span className="font-semibold">
                    {nextSessionName} ({nextSessionTimeStr})
                  </span>
                </p>
                <Badge
                  variant="secondary"
                  className="gap-1 bg-emerald-200/70 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-800/60 dark:text-emerald-200"
                >
                  <Clock className="h-3 w-3" />
                  {countdown}
                </Badge>
              </div>
            </div>

            {/* CTA */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  id="dispense-now-btn"
                  size="lg"
                  className="w-full shrink-0 gap-2 bg-gradient-to-r from-primary to-primary/80 px-6 text-base font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:brightness-105 transition-all sm:w-auto sm:px-8 sm:text-lg"
                  disabled={isDispensing}
                >
                  {isDispensing ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> Dispensing...</>
                  ) : (
                    <><Play className="h-5 w-5" /> Dispense Now</>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Manual Dispense</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will advance the <strong>{WHEEL_NAMES[nextSessionIndex]}</strong> wheel to slot{" "}
                    <strong>{dispenseDaySlot}</strong> and release the{" "}
                    <strong>{nextSessionName}</strong> dose. Are you sure?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDispense} className="bg-primary hover:bg-primary/90">
                    Yes, Dispense
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* ── Row 3: Quick Stats ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            {
              label: "Weekly Doses",
              value: `${weeklyDone}/21`,
              sub:   `${weeklyPct}% adherence`,
              icon:  TrendingUp,
              color: "text-primary",
              bg:    "bg-primary/8 dark:bg-primary/12",
            },
            {
              label: "Next Dose",
              value: nextSessionTimeStr,
              sub:   nextSessionName,
              icon:  Clock,
              color: "text-amber-600 dark:text-amber-400",
              bg:    "bg-amber-500/8 dark:bg-amber-500/12",
            },
            {
              label: "Battery",
              value: `${batteryLevel}%`,
              sub:   batteryLevel < 20 ? "Low — charge soon" : "Good",
              icon:  Battery,
              color: batteryLevel < 20 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400",
              bg:    batteryLevel < 20 ? "bg-red-500/8 dark:bg-red-500/12" : "bg-emerald-500/8 dark:bg-emerald-500/12",
            },
            {
              label: "Status",
              value: isOffline ? "Offline" : "Online",
              sub:   isOffline ? "Last seen: " + syncDelta : "Synced: " + syncDelta,
              icon:  isOffline ? WifiOff : Wifi,
              color: isOffline ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400",
              bg:    isOffline ? "bg-amber-500/8 dark:bg-amber-500/12" : "bg-emerald-500/8 dark:bg-emerald-500/12",
            },
          ].map(({ label, value, sub, icon: Icon, color, bg }) => (
            <Card key={label} className="glass-card">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground truncate">{label}</p>
                  <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Row 4: Weekly Matrix ─────────────────────────────────────────── */}
        <Card className="glass-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse-dot" />
              Weekly Overview
            </CardTitle>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  id="reset-week-btn"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/60 h-8 rounded-lg px-3"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Reset Week</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Weekly Schedule?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will clear the entire 7-day schedule and mark all doses as pending for a new week.{" "}
                    <span className="font-medium text-red-600">This action cannot be undone.</span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={async () => { await resetWeek(); setOptimistic({ morning: [], midday: [], night: [] }) }} className="bg-red-600 hover:bg-red-700">
                    Yes, Reset Week
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <WeeklyMatrix
              weekData={weekData}
              onManualDispense={handleManualDispense}
              disabled={isDispensing}
              currentDayIndex={currentDayIndex}
            />
          </CardContent>
        </Card>

        {/* ── Row 5: Activity + Monthly Report ─────────────────────────────── */}
        <div className="grid gap-5 lg:grid-cols-2">

          {/* Activity Log */}
          <Card className="glass-card flex flex-col">
            <CardHeader className="border-b border-border/40 pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Activity className="h-4 w-4 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-4 sm:p-5">
              {activityLogs.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  No recent activity recorded
                </div>
              ) : (
                <ul className="space-y-2">
                  {activityLogs.map((entry: { id: string | number; type: string; message: string; timeLabel: string }) => (
                    <li
                      key={entry.id}
                      className="flex items-center gap-3 rounded-xl border border-border/50 bg-secondary/30 px-3.5 py-2.5 transition-colors hover:bg-secondary/50"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm">
                        {getActivityIcon(entry.type)}
                      </div>
                      <span className="flex-1 text-xs font-medium text-foreground sm:text-sm">{entry.message}</span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{entry.timeLabel}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Monthly Report */}
          <div className="h-full">
            <MonthlyReport />
          </div>
        </div>

      </main>

      {/* ── Profile Modal ─────────────────────────────────────────────────── */}
      <ProfileSettings
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        profile={profile}
        onUpdateProfile={handleUpdateProfile}
      />
    </div>
  )
}
