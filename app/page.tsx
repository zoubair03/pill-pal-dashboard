"use client"

import { useState } from "react"
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
} from "lucide-react"
import { PillWheel } from "@/components/pill-wheel"
import { WeeklyMatrix } from "@/components/weekly-matrix"
import { ScheduleSheet } from "@/components/schedule-sheet"

export default function PillPalDashboard() {
  const [isOffline, setIsOffline] = useState(false)
  const [isDispensing, setIsDispensing] = useState(false)

  const batteryLevel = 85
  const currentSlot = 4

  const handleDispense = async () => {
    setIsDispensing(true)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsDispensing(false)
  }

  const weekData = {
    Mon: { morning: "dispensed" as const, midday: "dispensed" as const, evening: "dispensed" as const },
    Tue: { morning: "dispensed" as const, midday: "dispensed" as const, evening: "dispensed" as const },
    Wed: { morning: "dispensed" as const, midday: "dispensed" as const, evening: "missed" as const },
    Thu: { morning: "dispensed" as const, midday: "pending" as const, evening: "pending" as const },
    Fri: { morning: "pending" as const, midday: "pending" as const, evening: "pending" as const },
    Sat: { morning: "pending" as const, midday: "pending" as const, evening: "pending" as const },
    Sun: { morning: "pending" as const, midday: "pending" as const, evening: "pending" as const },
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
              <p className="text-lg text-green-700">
                Next dose: <span className="font-semibold">Midday (13:00)</span>
              </p>
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
                    22-Slot Motor Wheel • 21 Doses + Home Position
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
              <ScheduleSheet />
            </CardHeader>
            <CardContent>
              <WeeklyMatrix weekData={weekData} />
            </CardContent>
          </Card>
        </div>

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
