"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Check, AlertCircle, Sun, CloudSun, Moon, Pill } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// ─── Types ────────────────────────────────────────────────────────────────────

type DoseStatus = "dispensed" | "pending" | "missed"

interface DoseSession {
  morning: DoseStatus
  midday: DoseStatus
  evening: DoseStatus
}

interface WeeklyMatrixProps {
  weekData: Record<string, DoseSession>
  onManualDispense?: (day: string, session: string) => void
  disabled?: boolean
  currentDayIndex?: number
}

// ─── Config ───────────────────────────────────────────────────────────────────

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const SESSIONS = ["morning", "midday", "evening"] as const

const SESSION_CONFIG = {
  morning: { label: "Morning", short: "AM",  Icon: Sun,      color: "text-amber-500",  bg: "bg-amber-50 dark:bg-amber-950/40",   border: "border-amber-200 dark:border-amber-800/40" },
  midday:  { label: "Midday",  short: "Noon", Icon: CloudSun, color: "text-sky-500",    bg: "bg-sky-50 dark:bg-sky-950/40",       border: "border-sky-200 dark:border-sky-800/40" },
  evening: { label: "Evening", short: "PM",  Icon: Moon,     color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950/40", border: "border-indigo-200 dark:border-indigo-800/40" },
}

// ─── Dose Cell ────────────────────────────────────────────────────────────────

interface DoseCellProps {
  status: DoseStatus
  session: typeof SESSIONS[number]
  day: string
  disabled?: boolean
  isToday?: boolean
  onClick: () => void
}

function DoseCell({ status, session, day, disabled, isToday, onClick }: DoseCellProps) {
  const cfg = SESSION_CONFIG[session]
  const Icon = cfg.Icon
  const clickable = !disabled && (status === "pending" || status === "missed")

  return (
    <button
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      aria-label={
        status === "dispensed"
          ? `${day} ${cfg.label} — dispensed`
          : `Dispense ${day} ${cfg.label}`
      }
      className={cn(
        "group relative flex w-full flex-col items-center gap-1 rounded-xl border py-2.5 transition-all duration-200",
        // status styles
        status === "dispensed" && "border-emerald-200 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-950/40",
        status === "pending"   && cn("border-border/60 bg-secondary/20", clickable && "hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm active:scale-95 cursor-pointer"),
        status === "missed"    && cn("border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-950/40", clickable && "hover:brightness-105 active:scale-95 cursor-pointer"),
        !clickable && status !== "dispensed" && "opacity-50 cursor-default",
      )}
    >
      {/* Session icon */}
      <div className={cn(
        "flex h-6 w-6 items-center justify-center rounded-full",
        status === "dispensed" && "bg-emerald-100 dark:bg-emerald-900/60",
        status === "pending"   && "bg-secondary/60",
        status === "missed"    && "bg-red-100 dark:bg-red-900/60",
      )}>
        {status === "dispensed" ? (
          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        ) : status === "missed" ? (
          <AlertCircle className="h-3.5 w-3.5 text-red-500 animate-pulse" />
        ) : (
          <Icon className={cn("h-3 w-3", cfg.color, "opacity-60")} />
        )}
      </div>

      {/* Session label */}
      <span className={cn(
        "text-[10px] font-semibold leading-none",
        status === "dispensed" && "text-emerald-700 dark:text-emerald-400",
        status === "pending"   && "text-muted-foreground",
        status === "missed"    && "text-red-600 dark:text-red-400",
      )}>
        {cfg.short}
      </span>

      {/* Hover hint for clickable cells */}
      {clickable && (
        <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-primary/10 opacity-0 transition-opacity group-hover:opacity-100">
          <Pill className="h-4 w-4 text-primary" />
        </span>
      )}
    </button>
  )
}

// ─── Day Card ─────────────────────────────────────────────────────────────────

interface DayCardProps {
  day: string
  dayFull: string
  dayIndex: number
  doses: DoseSession
  isToday: boolean
  disabled?: boolean
  onDispense: (session: string) => void
}

function DayCard({ day, dayFull, dayIndex, doses, isToday, disabled, onDispense }: DayCardProps) {
  const dispensedCount = SESSIONS.filter(s => doses[s] === "dispensed").length
  const missedCount    = SESSIONS.filter(s => doses[s] === "missed").length
  const progress       = (dispensedCount / 3) * 100

  return (
    <div className={cn(
      "flex flex-col gap-2 rounded-2xl border p-2.5 transition-all duration-200",
      isToday
        ? "border-primary/30 bg-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/20"
        : "border-border/50 bg-card/60"
    )}>
      {/* Day header */}
      <div className="flex flex-col items-center gap-1">
        <span className={cn(
          "text-xs font-bold uppercase tracking-wide",
          isToday ? "text-primary" : "text-foreground"
        )}>
          {day}
        </span>

        {/* Progress bar */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-border/50">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              dispensedCount === 3 ? "bg-emerald-500" :
              missedCount > 0      ? "bg-red-400" :
              dispensedCount > 0   ? "bg-primary" :
                                     "bg-border"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Count badge */}
        <span className={cn(
          "text-[9px] font-semibold tabular-nums",
          dispensedCount === 3 ? "text-emerald-600 dark:text-emerald-400" :
          missedCount > 0      ? "text-red-500" :
                                 "text-muted-foreground"
        )}>
          {dispensedCount}/3
        </span>
      </div>

      {/* Dose cells */}
      <div className="flex flex-col gap-1.5">
        {SESSIONS.map(session => (
          <DoseCell
            key={session}
            status={doses[session]}
            session={session}
            day={day}
            disabled={disabled}
            isToday={isToday}
            onClick={() => onDispense(session)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WeeklyMatrix({ weekData, onManualDispense, disabled, currentDayIndex }: WeeklyMatrixProps) {
  const [dialogOpen, setDialogOpen]   = useState(false)
  const [selectedDose, setSelectedDose] = useState<{ day: string; session: string } | null>(null)

  const handleCellClick = (day: string, session: string) => {
    setSelectedDose({ day, session })
    setDialogOpen(true)
  }

  const handleConfirm = () => {
    if (selectedDose && onManualDispense) {
      onManualDispense(selectedDose.day, selectedDose.session)
    }
    setDialogOpen(false)
    setSelectedDose(null)
  }

  // Overall week stats
  const allDoses   = DAYS.flatMap(d => SESSIONS.map(s => weekData[d]?.[s]))
  const totalDone  = allDoses.filter(s => s === "dispensed").length
  const totalMissed = allDoses.filter(s => s === "missed").length
  const weekProgress = Math.round((totalDone / 21) * 100)

  return (
    <>
      {/* Week summary bar */}
      {/*<div className="mb-4 flex items-center gap-3 rounded-xl border border-border/50 bg-secondary/20 px-3 py-2.5">
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Week Progress</span>
            <span className="text-xs font-bold tabular-nums text-primary">{totalDone} / 21 doses</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-border/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-700"
              style={{ width: `${weekProgress}%` }}
            />
          </div>
        </div>
        {totalMissed > 0 && (
          <div className="flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 dark:bg-red-950/40">
            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
            <span className="text-xs font-bold text-red-600 dark:text-red-400">{totalMissed} missed</span>
          </div>
        )}
        {totalMissed === 0 && totalDone > 0 && (
          <div className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 dark:bg-emerald-950/40">
            <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">On track</span>
          </div>
        )}
      </div>/* End of week summary bar */}
      

      {/* Day cards grid */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {DAYS.map((day, i) => (
          <DayCard
            key={day}
            day={day}
            dayFull={DAY_FULL[i]}
            dayIndex={i}
            doses={weekData[day] ?? { morning: "pending", midday: "pending", evening: "pending" }}
            isToday={currentDayIndex === i}
            disabled={disabled}
            onDispense={(session) => handleCellClick(day, session)}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/60">
            <Check className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span>Dispensed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded-full border-2 border-border/60 bg-secondary/40" />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/60">
            <AlertCircle className="h-2.5 w-2.5 text-red-500" />
          </div>
          <span>Missed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm border border-primary/30 bg-primary/10 ring-1 ring-primary/20" />
          <span>Today</span>
        </div>
      </div>

      {/* Confirm dialog */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-primary" />
              Manual Dispense
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {selectedDose && (() => {
                  const cfg = SESSION_CONFIG[selectedDose.session as typeof SESSIONS[number]]
                  const Icon = cfg.Icon
                  return (
                    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-secondary/30 p-3">
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", cfg.bg, cfg.border, "border")}>
                        <Icon className={cn("h-5 w-5", cfg.color)} />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {DAY_FULL[DAYS.indexOf(selectedDose.day)]} — {cfg.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          This will advance the wheel and mark the dose as dispensed.
                        </p>
                      </div>
                    </div>
                  )
                })()}
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  ⚠️ Make sure the patient is ready to take their medication.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} className="bg-primary hover:bg-primary/90">
              Yes, Dispense Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
