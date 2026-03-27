"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Home, Plus, Pill, X, Search } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import medications from "@/data/medications.json"

interface Medication {
  dci: string
  brand: string
  dose: string
  form: string
  presentation: string
  classe: string
  sousclasse: string
  laboratoire: string
  tableau: string
  indication: string
  label: string
  full: string
}

interface PillWheelProps {
  currentSlot: number
  totalSlots?: number
  slotMedicines: Record<number, string[]>
  onUpdateSlotMedicines: (slot: number, medicines: string[]) => void
}

export function PillWheel({ 
  currentSlot, 
  totalSlots = 22,
  slotMedicines,
  onUpdateSlotMedicines
}: PillWheelProps) {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [searchValue, setSearchValue] = useState("")
  
  const slots = Array.from({ length: totalSlots }, (_, i) => i)
  const radius = 140
  const centerX = 180
  const centerY = 180

  // Filter medications based on search
  const filteredMedications = useMemo(() => {
    if (!searchValue.trim()) return []
    const query = searchValue.toLowerCase()
    return (medications as Medication[])
      .filter(med => 
        med.brand.toLowerCase().includes(query) ||
        med.dci.toLowerCase().includes(query) ||
        med.label.toLowerCase().includes(query)
      )
      .slice(0, 10) // Limit to 10 results for performance
  }, [searchValue])

  const handleSlotClick = (slotIndex: number) => {
    if (slotIndex === 0) return // Home slot is not clickable
    setSelectedSlot(slotIndex)
    setSearchValue("")
  }

  const handleSelectMedication = (medication: Medication) => {
    if (selectedSlot === null) return
    const currentMeds = slotMedicines[selectedSlot] || []
    const medLabel = medication.label
    if (!currentMeds.includes(medLabel)) {
      onUpdateSlotMedicines(selectedSlot, [...currentMeds, medLabel])
    }
    setSearchValue("")
  }

  const handleAddCustomMedicine = () => {
    if (!searchValue.trim() || selectedSlot === null) return
    const currentMeds = slotMedicines[selectedSlot] || []
    if (!currentMeds.includes(searchValue.trim())) {
      onUpdateSlotMedicines(selectedSlot, [...currentMeds, searchValue.trim()])
    }
    setSearchValue("")
  }

  const handleRemoveMedicine = (medicine: string) => {
    if (selectedSlot === null) return
    const currentMeds = slotMedicines[selectedSlot] || []
    onUpdateSlotMedicines(selectedSlot, currentMeds.filter(m => m !== medicine))
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative flex items-center justify-center">
        <svg width="360" height="360" viewBox="0 0 360 360" className="drop-shadow-lg">
          {/* Outer ring */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius + 20}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-blue-200"
          />
          
          {/* Inner circle background */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius - 30}
            fill="currentColor"
            className="text-blue-50"
          />
          
          {/* Slots */}
          {slots.map((slot, index) => {
            const angle = (index / totalSlots) * 2 * Math.PI - Math.PI / 2
            const x = centerX + radius * Math.cos(angle)
            const y = centerY + radius * Math.sin(angle)
            const isHome = index === 0
            const isCurrent = index === currentSlot
            const hasMedicines = (slotMedicines[index]?.length || 0) > 0

            const slotElement = (
              <g 
                key={slot} 
                onClick={() => handleSlotClick(index)}
                className={cn(
                  !isHome && "cursor-pointer",
                  "transition-transform"
                )}
              >
                {/* Slot circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={isCurrent ? 18 : 14}
                  fill={
                    isCurrent 
                      ? "#2563eb" 
                      : isHome 
                        ? "#f0f9ff" 
                        : hasMedicines 
                          ? "#dcfce7" 
                          : "#e0f2fe"
                  }
                  stroke={
                    isCurrent 
                      ? "#1d4ed8" 
                      : isHome 
                        ? "#0284c7" 
                        : hasMedicines 
                          ? "#22c55e" 
                          : "#7dd3fc"
                  }
                  strokeWidth={isCurrent ? 3 : 2}
                  className={cn(
                    "transition-all duration-300",
                    isCurrent && "drop-shadow-lg",
                    !isHome && "hover:opacity-80"
                  )}
                />
                
                {/* Slot content */}
                {isHome ? (
                  <Home
                    x={x - 8}
                    y={y - 8}
                    width={16}
                    height={16}
                    className="text-sky-600"
                  />
                ) : hasMedicines ? (
                  <Pill
                    x={x - 6}
                    y={y - 6}
                    width={12}
                    height={12}
                    className={isCurrent ? "text-white" : "text-green-600"}
                  />
                ) : (
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={isCurrent ? 11 : 9}
                    fontWeight={isCurrent ? 700 : 500}
                    fill={isCurrent ? "white" : "#0369a1"}
                  >
                    {index}
                  </text>
                )}
                
                {/* Current indicator glow */}
                {isCurrent && (
                  <circle
                    cx={x}
                    cy={y}
                    r={22}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    opacity="0.5"
                    className="animate-pulse"
                  />
                )}
              </g>
            )

            // Wrap non-home slots with tooltip if they have medicines
            if (!isHome && hasMedicines) {
              return (
                <Tooltip key={slot}>
                  <TooltipTrigger asChild>
                    {slotElement}
                  </TooltipTrigger>
                  <TooltipContent 
                    side="top" 
                    className="max-w-64 bg-background border border-border"
                  >
                    <div className="space-y-1.5">
                      <p className="font-medium text-foreground text-sm">Slot {index}</p>
                      <div className="flex flex-wrap gap-1">
                        {slotMedicines[index]?.map((med) => (
                          <Badge 
                            key={med} 
                            variant="secondary" 
                            className="text-xs bg-green-100 text-green-800"
                          >
                            {med}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )
            }

            return slotElement
          })}
          
          {/* Center hub */}
          <circle
            cx={centerX}
            cy={centerY}
            r={45}
            fill="white"
            stroke="#bfdbfe"
            strokeWidth="3"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={35}
            fill="#2563eb"
          />
          <text
            x={centerX}
            y={centerY - 8}
            textAnchor="middle"
            fontSize="10"
            fill="white"
            fontWeight="500"
          >
            SLOT
          </text>
          <text
            x={centerX}
            y={centerY + 10}
            textAnchor="middle"
            fontSize="18"
            fill="white"
            fontWeight="700"
          >
            {currentSlot}
          </text>
        </svg>

        {/* Medicine Assignment Dialog */}
        <Dialog open={selectedSlot !== null} onOpenChange={(open) => !open && setSelectedSlot(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-blue-600" />
                Slot {selectedSlot} - Assign Medicines
              </DialogTitle>
              <DialogDescription>
                Search and add medicines to this slot. They will be dispensed when the wheel rotates to this position.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Search with autocomplete */}
              <Command className="rounded-lg border shadow-md">
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <input
                    placeholder="Search medicines..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  {searchValue && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAddCustomMedicine}
                      className="h-8 px-2 text-xs"
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add
                    </Button>
                  )}
                </div>
                <CommandList className="max-h-48">
                  {searchValue.trim() && filteredMedications.length === 0 && (
                    <CommandEmpty className="py-4 text-center text-sm">
                      No medicines found. Press &quot;Add&quot; to add custom medicine.
                    </CommandEmpty>
                  )}
                  {filteredMedications.length > 0 && (
                    <CommandGroup heading="Medicines">
                      {filteredMedications.map((med, index) => (
                        <CommandItem
                          key={`${med.label}-${index}`}
                          onSelect={() => handleSelectMedication(med)}
                          className="cursor-pointer"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{med.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {med.dci} - {med.form}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>

              {/* Current medicines in slot */}
              {selectedSlot !== null && (slotMedicines[selectedSlot]?.length || 0) > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Medicines in this slot:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {slotMedicines[selectedSlot]?.map((medicine) => (
                      <Badge 
                        key={medicine} 
                        variant="secondary"
                        className="pl-2 pr-1 py-1 flex items-center gap-1 bg-green-100 text-green-800"
                      >
                        {medicine}
                        <button
                          onClick={() => handleRemoveMedicine(medicine)}
                          className="ml-1 rounded-full p-0.5 hover:bg-green-200 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedSlot !== null && (!slotMedicines[selectedSlot] || slotMedicines[selectedSlot].length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No medicines assigned to this slot yet.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
