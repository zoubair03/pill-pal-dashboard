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
} from "lucide-react"
import { PillWheel } from "@/components/pill-wheel"
import { WeeklyMatrix } from "@/components/weekly-matrix"
import { ScheduleSheet } from "@/components/schedule-sheet"

type DoseStatus = "dispensed" | "pending" | "missed"

interface DoseSession {
  morning: DoseStatus
  midday: DoseStatus
  evening: DoseStatus
}

interface ActivityLogEntry {
  id: string
  type: "dispensed" | "manual" | "missed" | "reset"
  message: string
  timestamp: Date
}

const initialWeekData: Record<string, DoseSession> = {
  Mon: { morning: "dispensed", midday: "dispensed", evening: "dispensed" },
  Tue: { morning: "dispensed", midday: "dispensed", evening: "dispensed" },
  Wed: { morning: "dispensed", midday: "dispensed", evening: "missed" },
  Thu: { morning: "dispensed", midday: "pending", evening: "pending" },
  Fri: { morning: "pending", midday: "pending", evening: "pending" },
  Sat: { morning: "pending", midday: "pending", evening: "pending" },
  Sun: { morning: "pending", midday: "pending", evening: "pending" },
}

const emptyWeekData: Record<string, DoseSession> = {
  Mon: { morning: "pending", midday: "pending", evening: "pending" },
  Tue: { morning: "pending", midday: "pending", evening: "pending" },
  Wed: { morning: "pending", midday: "pending", evening: "pending" },
  Thu: { morning: "pending", midday: "pending", evening: "pending" },
  Fri: { morning: "pending", midday: "pending", evening: "pending" },
  Sat: { morning: "pending", midday: "pending", evening: "pending" },
  Sun: { morning: "pending", midday: "pending", evening: "pending" },
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
  const [isOffline, setIsOffline] = useState(false)
  const [isDispensing, setIsDispensing] = useState(false)
  const [weekData, setWeekData] = useState<Record<string, DoseSession>>(initialWeekData)
  const [countdown, setCountdown] = useState("")
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([
    {
      id: "1",
      type: "dispensed",
      message: "Midday dose dispensed at 13:02",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: "2",
      type: "manual",
      message: "Manual dispense triggered at 10:15",
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    },
    {
      id: "3",
      type: "dispensed",
      message: "Morning dose dispensed at 08:00",
      timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000),
    },
    {
      id: "4",
      type: "missed",
      message: "Evening dose missed - Wed",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  ])

  const batteryLevel = 85
  const currentSlot = 4
  const nextDoseTime = { hour: 13, minute: 0 }

  // Live countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      setCountdown(formatCountdown(nextDoseTime.hour, nextDoseTime.minute))
    }
    
    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    
    return () => clearInterval(interval)
  }, [nextDoseTime.hour, nextDoseTime.minute])

  const addActivityLog = (type: ActivityLogEntry["type"], message: string) => {
    const newEntry: ActivityLogEntry = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date(),
    }
    setActivityLog((prev) => [newEntry, ...prev].slice(0, 5))
  }

  const handleDispense = async () => {
    setIsDispensing(true)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsDispensing(false)
    addActivityLog("dispensed", `Midday dose dispensed at ${formatTime(new Date())}`)
  }

  const handleManualDispense = (day: string, session: string) => {
    setWeekData((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [session]: "dispensed" as DoseStatus,
      },
    }))
    addActivityLog("manual", `Manual dispense: ${day} ${session} at ${formatTime(new Date())}`)
  }

  const handleResetWeek = () => {
    setWeekData(emptyWeekData)
    addActivityLog("reset", `Week reset at ${formatTime(new Date())}`)
  }

  const getActivityIcon = (type: ActivityLogEntry["type"]) => {
    switch (type) {
      case "dispensed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "manual":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />
      case "missed":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "reset":
        return <RotateCcw className="h-4 w-4 text-blue-500" />
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Offline Overlay */}
      {isOffline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-md">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-white/80 p-8 shadow-xl ring-1 ring-black/5">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <p className="text-lg font-medium text-gray-700">
              Reconnecting to PillPal Hardware...
            </p>
            <p className="text-sm text-muted-foreground">
              Please ensure your device is powered on and nearby.
            </p>
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Pill className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-gray-900">PillPal</span>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`gap-1.5 ${
                batteryLevel < 20
                  ? "border-red-200 bg-red-50 text-red-600"
                  : "border-green-200 bg-green-50 text-green-600"
              }`}
            >
              <Battery className="h-3.5 w-3.5" />
              {batteryLevel}%
            </Badge>
            <Badge
              variant="outline"
              className="gap-1.5 border-green-200 bg-green-50 text-green-600"
            >
              <Wifi className="h-3.5 w-3.5" />
              Connected
            </Badge>
            <Badge
              variant="outline"
              className="hidden gap-1.5 border-gray-200 bg-gray-50 text-gray-600 sm:flex"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Synced just now
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-6 px-4 py-6">
        {/* Hero Section - Immediate Status */}
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg">
          <CardContent className="flex flex-col items-center gap-6 py-8 text-center sm:flex-row sm:text-left">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-green-100 ring-4 ring-green-200/50">
              <CheckCircle2 className="h-14 w-14 text-green-600" />
            </div>
            <div className="flex-1 space-y-2">
              <h1 className="text-2xl font-bold text-green-800">
                Medication up to date
              </h1>
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
                <p className="text-lg text-green-700">
                  Next dose: <span className="font-semibold">Midday (13:00)</span>
                </p>
                <Badge 
                  variant="secondary" 
                  className="gap-1 bg-green-200/70 text-green-800 hover:bg-green-200"
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
                  className="gap-2 bg-blue-600 px-8 text-lg hover:bg-blue-700"
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
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Yes, Dispense
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Hardware Mirror & Weekly Matrix */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* The Hardware Mirror (The Wheel) */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="h-2 w-2 rounded-full bg-blue-600" />
                Hardware Mirror
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center">
                <PillWheel currentSlot={currentSlot} />
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    22-Slot Motor Wheel - 21 Doses + Home Position
                  </p>
                  <p className="mt-1 font-medium text-blue-600">
                    Current Position: Slot {currentSlot}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Matrix */}
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="h-2 w-2 rounded-full bg-blue-600" />
                Weekly Overview
              </CardTitle>
              <div className="flex items-center gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700">
                      <RotateCcw className="h-4 w-4" />
                      Reset Week
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
                <ScheduleSheet />
              </div>
            </CardHeader>
            <CardContent>
              <WeeklyMatrix 
                weekData={weekData} 
                onManualDispense={handleManualDispense}
              />
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Log */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="h-2 w-2 rounded-full bg-blue-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activityLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              ) : (
                activityLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 rounded-lg border bg-gray-50/50 px-4 py-3"
                  >
                    {getActivityIcon(entry.type)}
                    <span className="flex-1 text-sm">{entry.message}</span>
                    <span className="text-xs text-muted-foreground">
                      {entry.timestamp.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Offline Mode Toggle (for testing) */}
        <Card className="border-dashed border-gray-300 bg-gray-50/50">
          <CardContent className="flex items-center justify-between py-4">
            <div className="space-y-0.5">
              <Label htmlFor="offline-toggle" className="text-sm font-medium">
                Test Offline State
              </Label>
              <p className="text-xs text-muted-foreground">
                Toggle to simulate hardware disconnection
              </p>
            </div>
            <Switch
              id="offline-toggle"
              checked={isOffline}
              onCheckedChange={setIsOffline}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
