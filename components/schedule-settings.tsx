"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, Sun, CloudSun, Moon, Save, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface ScheduleTime {
  morning: string
  midday: string
  evening: string
}

import useWebSocket from "@/hooks/useWebSocket"
import { DAYS, SESSIONS, fmt, parse } from "@/hooks/useWebSocket"

interface ScheduleSettingsProps {
  scheduleData?: { hour: number; minute: number }[]
  onSave: (schedule: { hour: number; minute: number }[]) => void
  disabled?: boolean
}

export function ScheduleSettings({ scheduleData, onSave, disabled }: ScheduleSettingsProps) {
  const [schedule, setSchedule] = useState<ScheduleTime>({
    morning: scheduleData?.[0] ? fmt(scheduleData[0]) : "08:00",
    midday: scheduleData?.[1] ? fmt(scheduleData[1]) : "13:00",
    evening: scheduleData?.[2] ? fmt(scheduleData[2]) : "20:00",
  })
  const [isSaving, setIsSaving] = useState(false)

  // Update local state if ESP32 sends a new schedule
  useEffect(() => {
    if (scheduleData) {
      setSchedule({
        morning: scheduleData[0] ? fmt(scheduleData[0]) : "08:00",
        midday: scheduleData[1] ? fmt(scheduleData[1]) : "13:00",
        evening: scheduleData[2] ? fmt(scheduleData[2]) : "20:00",
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(scheduleData)])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      onSave([
        parse(schedule.morning),
        parse(schedule.midday),
        parse(schedule.evening)
      ])
    } finally {
      setTimeout(() => setIsSaving(false), 500) // brief visual feedback
    }
  }

  return (
    <Card className="overflow-hidden border-border/50 bg-card/80 shadow-xl shadow-black/5 backdrop-blur-sm h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Settings className="h-4 w-4 text-primary" />
          Dispense Schedule
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Set default medication times for the device.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Morning */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
            <Sun className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1">
            <Label htmlFor="morning" className="text-xs font-medium">Morning Dose</Label>
            <Input
              id="morning"
              type="time"
              value={schedule.morning}
              onChange={(e) => setSchedule({ ...schedule, morning: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Midday */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-400">
            <CloudSun className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1">
            <Label htmlFor="midday" className="text-xs font-medium">Midday Dose</Label>
            <Input
              id="midday"
              type="time"
              value={schedule.midday}
              onChange={(e) => setSchedule({ ...schedule, midday: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Evening */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
            <Moon className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1">
            <Label htmlFor="evening" className="text-xs font-medium">Evening Dose</Label>
            <Input
              id="evening"
              type="time"
              value={schedule.evening}
              onChange={(e) => setSchedule({ ...schedule, evening: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={disabled || isSaving}
          className="w-full mt-2 gap-2 bg-primary hover:bg-primary/90 h-9"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              Save Schedule
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
