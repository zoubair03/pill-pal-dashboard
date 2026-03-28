"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Check, Circle, AlertCircle } from "lucide-react"
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

export function WeeklyMatrix({ weekData, onManualDispense, disabled, currentDayIndex }: WeeklyMatrixProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDose, setSelectedDose] = useState<{ day: string; session: string } | null>(null)

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const sessions = ["morning", "midday", "evening"] as const

  const getSessionLabel = (session: string) => {
    switch (session) {
      case "morning":
        return "AM"
      case "midday":
        return "Noon"
      case "evening":
        return "PM"
      default:
        return session
    }
  }

  const getSessionFullName = (session: string) => {
    switch (session) {
      case "morning":
        return "Morning"
      case "midday":
        return "Midday"
      case "evening":
        return "Evening"
      default:
        return session
    }
  }

  const handleCellClick = (day: string, session: string, status: DoseStatus) => {
    if (disabled) return;
    if (status === "pending" || status === "missed") {
      setSelectedDose({ day, session })
      setDialogOpen(true)
    }
  }

  const handleConfirmDispense = () => {
    if (selectedDose && onManualDispense) {
      onManualDispense(selectedDose.day, selectedDose.session)
    }
    setDialogOpen(false)
    setSelectedDose(null)
  }

  const renderStatusIcon = (status: DoseStatus, day: string, session: string) => {
    const isClickable = !disabled && (status === "pending" || status === "missed")
    
    const baseClasses = cn(
      "flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full transition-all",
      isClickable && "cursor-pointer hover:scale-110 hover:ring-2 hover:ring-offset-1 sm:hover:ring-offset-2",
      disabled && (status === "pending" || status === "missed") && "opacity-50 cursor-not-allowed"
    )

    switch (status) {
      case "dispensed":
        return (
          <div className={cn(baseClasses, "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30")} aria-label="Dispensed">
            <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </div>
        )
      case "pending":
        return (
          <div 
            className={cn(baseClasses, "border-2 border-border text-muted-foreground hover:border-primary hover:ring-primary/20 dark:border-muted-foreground/30")}
            onClick={() => handleCellClick(day, session, status)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleCellClick(day, session, status)}
            aria-label={`Mark ${day} ${getSessionFullName(session)} dose as dispensed`}
          >
            <Circle className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
          </div>
        )
      case "missed":
        return (
          <div 
            className={cn(baseClasses, "bg-red-500 text-white shadow-sm shadow-red-500/30 animate-pulse hover:ring-red-200 dark:hover:ring-red-800")}
            onClick={() => handleCellClick(day, session, status)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleCellClick(day, session, status)}
            aria-label={`Mark missed ${day} ${getSessionFullName(session)} dose as dispensed`}
          >
            <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </div>
        )
    }
  }

  return (
    <>
      <div className="w-full">
        {/* Header */}
        <div className="mb-2 sm:mb-3 grid grid-cols-8 gap-1 sm:gap-2">
          <div className="text-xs font-medium text-muted-foreground"></div>
          {days.map((day) => (
            <div
              key={day}
              className={cn(
                "text-center text-xs sm:text-sm font-semibold",
                currentDayIndex !== undefined && days.indexOf(day) === currentDayIndex ? "text-primary" : "text-foreground"
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Sessions */}
        {sessions.map((session) => (
          <div key={session} className="mb-1.5 sm:mb-2 grid grid-cols-8 items-center gap-1 sm:gap-2">
            <div className="text-xs font-medium text-muted-foreground pr-1">
              {getSessionLabel(session)}
            </div>
            {days.map((day) => (
              <div key={`${day}-${session}`} className="flex justify-center">
                {renderStatusIcon(weekData[day][session], day, session)}
              </div>
            ))}
          </div>
        ))}

        {/* Legend */}
        <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 sm:h-4 sm:w-4 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30" />
            <span>Dispensed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 sm:h-4 sm:w-4 rounded-full border-2 border-border dark:border-muted-foreground/30" />
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 sm:h-4 sm:w-4 rounded-full bg-red-500 shadow-sm shadow-red-500/30" />
            <span>Missed</span>
          </div>
        </div>
      </div>

      {/* Manual Dispense Confirmation Dialog */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Manual Dispense</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedDose && (
                <>
                  Manually dispense <span className="font-semibold">{selectedDose.day}</span>{" "}
                  <span className="font-semibold">{getSessionFullName(selectedDose.session)}</span> dose?
                  <br />
                  <span className="mt-2 block text-amber-600 dark:text-amber-400">
                    This will mark the dose as dispensed and advance the wheel.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDispense}
              className="bg-primary hover:bg-primary/90"
            >
              Yes, Dispense
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
