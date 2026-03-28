"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, X, Plus, Pill } from "lucide-react"
import medications from "@/data/medications.json"

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
  const [searchValue, setSearchValue] = useState("")

  const filteredMedications = useMemo(() => {
    if (!searchValue.trim()) return []
    const query = searchValue.toLowerCase()
    return medications.filter(med => 
      med.brand.toLowerCase().includes(query) ||
      med.dci.toLowerCase().includes(query) ||
      med.label.toLowerCase().includes(query)
    ).slice(0, 10)
  }, [searchValue])

  const handleAddMedication = (label: string) => {
    if (!profile.prescriptions.includes(label)) {
      onUpdateProfile({
        ...profile,
        prescriptions: [...profile.prescriptions, label]
      })
    }
    setSearchValue("")
  }

  const handleRemoveMedication = (label: string) => {
    onUpdateProfile({
      ...profile,
      prescriptions: profile.prescriptions.filter(m => m !== label)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-11/12 rounded-xl sm:max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit Patient Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                value={profile.name} 
                onChange={(e) => onUpdateProfile({ ...profile, name: e.target.value })} 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="age">Age</Label>
              <Input 
                id="age" 
                type="number"
                value={profile.age || ""} 
                onChange={(e) => onUpdateProfile({ ...profile, age: parseInt(e.target.value) || 0 })} 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input 
                id="dob" 
                type="date"
                value={profile.dateOfBirth} 
                onChange={(e) => onUpdateProfile({ ...profile, dateOfBirth: e.target.value })} 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone Number</Label>
              <Input 
                id="phone" 
                value={profile.phone} 
                onChange={(e) => onUpdateProfile({ ...profile, phone: e.target.value })} 
              />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Current Prescriptions</h3>
            <div className="flex flex-wrap gap-2 min-h-12 p-3 bg-secondary/30 rounded-lg border border-border/50">
              {profile.prescriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground italic my-auto">No medications prescribed</p>
              ) : (
                profile.prescriptions.map(med => (
                  <Badge key={med} variant="secondary" className="gap-1.5 pl-2.5 pr-1.5 py-1 text-sm bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <Pill className="h-3 w-3" />
                    {med}
                    <button
                      onClick={() => handleRemoveMedication(med)}
                      className="ml-1 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-800 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Add New Medication</h3>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search medication database..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {searchValue.trim().length > 0 && (
              <ScrollArea className="h-48 rounded-md border bg-card">
                <div className="p-2 space-y-1">
                  {filteredMedications.length > 0 ? (
                    filteredMedications.map(med => {
                      const isAdded = profile.prescriptions.includes(med.label)
                      return (
                        <div key={med.label} className="flex items-center justify-between p-2 hover:bg-secondary/50 rounded-md">
                          <div className="text-sm font-medium">{med.label}</div>
                          <Button
                            variant={isAdded ? "secondary" : "default"}
                            size="sm"
                            className="h-7 text-xs"
                            disabled={isAdded}
                            onClick={() => handleAddMedication(med.label)}
                          >
                            {isAdded ? "Added" : <><Plus className="h-3 w-3 mr-1" /> Add</>}
                          </Button>
                        </div>
                      )
                    })
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No medications found.<br/>
                      <Button variant="link" size="sm" onClick={() => handleAddMedication(searchValue.trim())}>
                        Add "{searchValue}" as custom
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
