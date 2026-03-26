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
}

export function WeeklyMatrix({ weekData, onManualDispense }: WeeklyMatrixProps) {
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
    const isClickable = status === "pending" || status === "missed"
    
    const baseClasses = cn(
      "flex h-8 w-8 items-center justify-center rounded-full transition-all",
      isClickable && "cursor-pointer hover:scale-110 hover:ring-2 hover:ring-offset-2"
    )

    switch (status) {
      case "dispensed":
        return (
          <div className={cn(baseClasses, "bg-green-500 text-white shadow-sm")}>
            <Check className="h-4 w-4" />
          </div>
        )
      case "pending":
        return (
          <div 
            className={cn(baseClasses, "border-2 border-gray-300 text-gray-400 hover:border-blue-400 hover:ring-blue-200")}
            onClick={() => handleCellClick(day, session, status)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleCellClick(day, session, status)}
          >
            <Circle className="h-3 w-3" />
          </div>
        )
      case "missed":
        return (
          <div 
            className={cn(baseClasses, "bg-red-500 text-white shadow-sm animate-pulse hover:ring-red-200")}
            onClick={() => handleCellClick(day, session, status)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleCellClick(day, session, status)}
          >
            <AlertCircle className="h-4 w-4" />
          </div>
        )
    }
  }

  return (
    <>
      <div className="overflow-x-auto">
        <div className="min-w-[500px]">
          {/* Header */}
          <div className="mb-3 grid grid-cols-8 gap-2">
            <div className="text-sm font-medium text-muted-foreground"></div>
            {days.map((day) => (
              <div
                key={day}
                className={cn(
                  "text-center text-sm font-semibold",
                  day === "Thu" ? "text-blue-600" : "text-foreground"
                )}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Sessions */}
          {sessions.map((session) => (
            <div key={session} className="mb-2 grid grid-cols-8 items-center gap-2">
              <div className="text-xs font-medium text-muted-foreground">
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
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-4 rounded-full bg-green-500" />
              <span>Dispensed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-4 rounded-full bg-red-500" />
              <span>Missed</span>
            </div>
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
                  <span className="mt-2 block text-amber-600">
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
              className="bg-blue-600 hover:bg-blue-700"
            >
              Yes, Dispense
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
