"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, X, Plus, Pill, User, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface PatientProfile {
  name: string
  age: number
  dateOfBirth: string
  phone: string
  prescriptions: string[]
  avatar: string
}

interface ProfileSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: PatientProfile
  onUpdateProfile: (profile: PatientProfile) => void
}

export function ProfileSettings({ open, onOpenChange, profile, onUpdateProfile }: ProfileSettingsProps) {
  const [searchValue, setSearchValue]   = useState("")
  const [dbResults, setDbResults]       = useState<{ id: number; label: string; dci: string; dose: string; form: string; classe: string }[]>([])
  const [searching, setSearching]       = useState(false)

  // Debounced search against /api/medications
  useEffect(() => {
    if (searchValue.trim().length < 2) { setDbResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res  = await fetch(`/api/medications?q=${encodeURIComponent(searchValue.trim())}`)
        const data = await res.json()
        setDbResults(Array.isArray(data) ? data : [])
      } catch { setDbResults([]) }
      finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchValue])

  const addMed = (label: string) => {
    if (!profile.prescriptions.includes(label)) {
      onUpdateProfile({ ...profile, prescriptions: [...profile.prescriptions, label] })
    }
    setSearchValue("")
  }

  const removeMed = (label: string) => {
    onUpdateProfile({ ...profile, prescriptions: profile.prescriptions.filter(m => m !== label) })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-11/12 max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border/40 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            Edit Patient Profile
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Update the patient&apos;s personal information and prescription list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Personal Info Grid */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { id: "name",  label: "Full Name",     type: "text",   value: profile.name,        onChange: (v: string) => onUpdateProfile({ ...profile, name: v }) },
                { id: "phone", label: "Phone Number",  type: "tel",    value: profile.phone,       onChange: (v: string) => onUpdateProfile({ ...profile, phone: v }) },
                { id: "dob",   label: "Date of Birth", type: "date",   value: profile.dateOfBirth, onChange: (v: string) => onUpdateProfile({ ...profile, dateOfBirth: v }) },
                { id: "age",   label: "Age",           type: "number", value: String(profile.age || ""), onChange: (v: string) => onUpdateProfile({ ...profile, age: parseInt(v) || 0 }) },
              ].map(({ id, label, type, value, onChange }) => (
                <div key={id} className="space-y-1.5">
                  <Label htmlFor={id} className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {label}
                  </Label>
                  <Input
                    id={id}
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-10"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Current Prescriptions */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Current Prescriptions ({profile.prescriptions.length})
            </h3>
            <div className={cn(
              "min-h-14 flex flex-wrap gap-2 rounded-xl border border-border/60 bg-secondary/30 p-3",
              profile.prescriptions.length === 0 && "items-center justify-center"
            )}>
              {profile.prescriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No medications prescribed yet</p>
              ) : (
                profile.prescriptions.map(med => (
                  <Badge
                    key={med}
                    className="gap-1.5 pl-2.5 pr-1.5 py-1 text-sm bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 border hover:bg-emerald-200 dark:hover:bg-emerald-900/80 transition-colors"
                  >
                    <Pill className="h-3 w-3" />
                    {med}
                    <button
                      onClick={() => removeMed(med)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-emerald-300/60 dark:hover:bg-emerald-700/60 transition-colors"
                      aria-label={`Remove ${med}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>

          {/* Add Medication */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Add Medication
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="med-search"
                placeholder="Search medication database..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-9 h-10"
              />
            </div>

            {searchValue.trim().length > 1 && (
              <div className="mt-2 overflow-hidden rounded-xl border border-border/60 bg-card shadow-md">
                <ScrollArea className="max-h-48">
                  <div className="p-1.5 space-y-0.5">
                    {searching ? (
                      <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Searching database...
                      </div>
                    ) : dbResults.length > 0 ? (
                      dbResults.map(med => {
                        const isAdded = profile.prescriptions.includes(med.label)
                        return (
                          <div
                            key={med.id}
                            className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-secondary/60 transition-colors"
                          >
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <Pill className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <span className="text-sm font-medium">{med.label}</span>
                              </div>
                              {med.dci && (
                                <span className="ml-5 text-xs text-muted-foreground">{med.dci} · {med.dose} · {med.form}</span>
                              )}
                            </div>
                            <Button
                              variant={isAdded ? "secondary" : "default"}
                              size="sm"
                              className="h-7 shrink-0 rounded-lg px-2.5 text-xs"
                              disabled={isAdded}
                              onClick={() => addMed(med.label)}
                            >
                              {isAdded ? "Added" : <><Plus className="h-3 w-3 mr-1" />Add</>}
                            </Button>
                          </div>
                        )
                      })
                    ) : (
                      <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                        No matches found.{" "}
                        <button
                          onClick={() => addMed(searchValue.trim())}
                          className="font-semibold text-primary hover:underline"
                        >
                          Add &quot;{searchValue}&quot; as custom
                        </button>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
