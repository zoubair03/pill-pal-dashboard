"use client"

import { cn } from "@/lib/utils"
import { Check, Circle, AlertCircle } from "lucide-react"

type DoseStatus = "dispensed" | "pending" | "missed"

interface DoseSession {
  morning: DoseStatus
  midday: DoseStatus
  evening: DoseStatus
}

interface WeeklyMatrixProps {
  weekData: Record<string, DoseSession>
}

const defaultWeekData: Record<string, DoseSession> = {
  Mon: { morning: "dispensed", midday: "dispensed", evening: "dispensed" },
  Tue: { morning: "dispensed", midday: "dispensed", evening: "dispensed" },
  Wed: { morning: "dispensed", midday: "dispensed", evening: "dispensed" },
  Thu: { morning: "dispensed", midday: "pending", evening: "pending" },
  Fri: { morning: "pending", midday: "pending", evening: "pending" },
  Sat: { morning: "pending", midday: "pending", evening: "pending" },
  Sun: { morning: "pending", midday: "pending", evening: "pending" },
}

export function WeeklyMatrix({ weekData = defaultWeekData }: WeeklyMatrixProps) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const sessions = ["morning", "midday", "evening"] as const

  const getStatusIcon = (status: DoseStatus) => {
    switch (status) {
      case "dispensed":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white shadow-sm">
            <Check className="h-4 w-4" />
          </div>
        )
      case "pending":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 text-gray-400">
            <Circle className="h-3 w-3" />
          </div>
        )
      case "missed":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white shadow-sm animate-pulse">
            <AlertCircle className="h-4 w-4" />
          </div>
        )
    }
  }

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

  return (
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
                {getStatusIcon(weekData[day][session])}
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
  )
}
