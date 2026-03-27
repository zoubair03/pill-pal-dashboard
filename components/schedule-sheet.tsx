"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet"
import { Settings, Sun, CloudSun, Moon, Save, Loader2 } from "lucide-react"

interface ScheduleTime {
  morning: string
  midday: string
  evening: string
}

export function ScheduleSheet() {
  const [schedule, setSchedule] = useState<ScheduleTime>({
    morning: "08:00",
    midday: "13:00",
    evening: "20:00",
  })
  const [isSaving, setIsSaving] = useState(false)
  const [open, setOpen] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate saving to device
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsSaving(false)
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs sm:text-sm">
          <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Schedule Settings</span>
          <span className="sm:hidden">Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Dispense Schedule</SheetTitle>
          <SheetDescription>
            Set the default times for your daily medication doses. These times
            will sync to your PillPal device.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {/* Morning */}
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
              <Sun className="h-6 w-6" />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="morning" className="text-sm font-medium">
                Morning Dose
              </Label>
              <Input
                id="morning"
                type="time"
                value={schedule.morning}
                onChange={(e) =>
                  setSchedule({ ...schedule, morning: e.target.value })
                }
                className="w-full"
              />
            </div>
          </div>

          {/* Midday */}
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-400">
              <CloudSun className="h-6 w-6" />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="midday" className="text-sm font-medium">
                Midday Dose
              </Label>
              <Input
                id="midday"
                type="time"
                value={schedule.midday}
                onChange={(e) =>
                  setSchedule({ ...schedule, midday: e.target.value })
                }
                className="w-full"
              />
            </div>
          </div>

          {/* Evening */}
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
              <Moon className="h-6 w-6" />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="evening" className="text-sm font-medium">
                Evening Dose
              </Label>
              <Input
                id="evening"
                type="time"
                value={schedule.evening}
                onChange={(e) =>
                  setSchedule({ ...schedule, evening: e.target.value })
                }
                className="w-full"
              />
            </div>
          </div>
        </div>
        <SheetFooter className="mt-8">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full gap-2 bg-primary hover:bg-primary/90"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Syncing to Device...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Schedule to Device
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
