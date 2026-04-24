"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, Sun, CloudSun, Moon, Save, Loader2, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { SESSIONS, SESSION_ICONS, fmt, parse } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface ScheduleTime {
  morning: string
  midday: string
  evening: string
}

interface ScheduleSettingsProps {
  scheduleData?: { hour: number; minute: number }[]
  onSave: (schedule: { hour: number; minute: number }[]) => void
  disabled?: boolean
}

const SESSION_CONFIG = [
  {
    key:    "morning" as const,
    label:  "Morning Dose",
    Icon:   Sun,
    color:  "text-amber-600 dark:text-amber-400",
    bg:     "bg-amber-50 dark:bg-amber-950/60",
    ring:   "ring-amber-200 dark:ring-amber-800/50",
    border: "border-amber-200/80 dark:border-amber-800/40",
  },
  {
    key:    "midday" as const,
    label:  "Midday Dose",
    Icon:   CloudSun,
    color:  "text-sky-600 dark:text-sky-400",
    bg:     "bg-sky-50 dark:bg-sky-950/60",
    ring:   "ring-sky-200 dark:ring-sky-800/50",
    border: "border-sky-200/80 dark:border-sky-800/40",
  },
  {
    key:    "evening" as const,
    label:  "Evening Dose",
    Icon:   Moon,
    color:  "text-indigo-600 dark:text-indigo-400",
    bg:     "bg-indigo-50 dark:bg-indigo-950/60",
    ring:   "ring-indigo-200 dark:ring-indigo-800/50",
    border: "border-indigo-200/80 dark:border-indigo-800/40",
  },
]

export function ScheduleSettings({ scheduleData, onSave, disabled }: ScheduleSettingsProps) {
  const [schedule, setSchedule] = useState<ScheduleTime>({
    morning: scheduleData?.[0] ? fmt(scheduleData[0]) : "08:00",
    midday:  scheduleData?.[1] ? fmt(scheduleData[1]) : "13:00",
    evening: scheduleData?.[2] ? fmt(scheduleData[2]) : "20:00",
  })
  const [isSaving, setIsSaving]   = useState(false)
  const [savedOk, setSavedOk]     = useState(false)

  // Sync with remote schedule
  useEffect(() => {
    if (scheduleData) {
      setSchedule({
        morning: scheduleData[0] ? fmt(scheduleData[0]) : "08:00",
        midday:  scheduleData[1] ? fmt(scheduleData[1]) : "13:00",
        evening: scheduleData[2] ? fmt(scheduleData[2]) : "20:00",
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(scheduleData)])

  const handleSave = async () => {
    setIsSaving(true)
    setSavedOk(false)
    try {
      onSave([parse(schedule.morning), parse(schedule.midday), parse(schedule.evening)])
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 2500)
    } finally {
      setTimeout(() => setIsSaving(false), 500)
    }
  }

  return (
    <Card className="glass-card overflow-hidden h-full">
      <CardHeader className="border-b border-border/40 pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Settings className="h-4 w-4 text-primary" />
          Dispense Schedule
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Configure automatic medication times synced to the device.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 p-5">
        {SESSION_CONFIG.map(({ key, label, Icon, color, bg, ring, border }) => (
          <div
            key={key}
            className={cn(
              "flex items-center gap-3.5 rounded-xl border p-3 transition-all",
              border,
              disabled ? "opacity-60" : "hover:shadow-sm"
            )}
          >
            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1",
              bg, ring
            )}>
              <Icon className={cn("h-5 w-5", color)} />
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor={key} className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {label}
              </Label>
              <Input
                id={key}
                type="time"
                value={schedule[key]}
                onChange={(e) => setSchedule({ ...schedule, [key]: e.target.value })}
                disabled={disabled}
                className="h-9 text-sm font-medium tabular-nums"
              />
            </div>
          </div>
        ))}

        <Button
          id="save-schedule-btn"
          onClick={handleSave}
          disabled={disabled || isSaving}
          className={cn(
            "w-full mt-1 gap-2 h-10 font-semibold transition-all",
            savedOk
              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
              : "bg-primary hover:bg-primary/90 shadow-md shadow-primary/20"
          )}
        >
          {isSaving ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Syncing to device...</>
          ) : savedOk ? (
            <><CheckCircle2 className="h-4 w-4" /> Schedule Saved!</>
          ) : (
            <><Save className="h-4 w-4" /> Save Schedule</>
          )}
        </Button>

        {disabled && (
          <p className="text-center text-xs text-amber-600 dark:text-amber-400 font-medium">
            ⚠ Device is offline — schedule will sync when reconnected
          </p>
        )}
      </CardContent>
    </Card>
  )
}
