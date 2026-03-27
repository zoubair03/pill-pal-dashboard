"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Home, Plus, Pill, X, Search, Check } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
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
      .slice(0, 8)
  }, [searchValue])

  // Reset highlight when results change
  useEffect(() => {
    setHighlightedIndex(-1)
  }, [filteredMedications])

  // Show dropdown when there are results
  useEffect(() => {
    setIsDropdownOpen(searchValue.trim().length > 0)
  }, [searchValue])

  const handleSlotClick = (slotIndex: number) => {
    if (slotIndex === 0) return
    setSelectedSlot(slotIndex)
    setSearchValue("")
    setIsDropdownOpen(false)
  }

  const handleSelectMedication = (medication: Medication) => {
    if (selectedSlot === null) return
    const currentMeds = slotMedicines[selectedSlot] || []
    const medLabel = medication.label
    if (!currentMeds.includes(medLabel)) {
      onUpdateSlotMedicines(selectedSlot, [...currentMeds, medLabel])
    }
    setSearchValue("")
    setIsDropdownOpen(false)
    inputRef.current?.focus()
  }

  const handleAddCustomMedicine = () => {
    if (!searchValue.trim() || selectedSlot === null) return
    const currentMeds = slotMedicines[selectedSlot] || []
    if (!currentMeds.includes(searchValue.trim())) {
      onUpdateSlotMedicines(selectedSlot, [...currentMeds, searchValue.trim()])
    }
    setSearchValue("")
    setIsDropdownOpen(false)
  }

  const handleRemoveMedicine = (medicine: string) => {
    if (selectedSlot === null) return
    const currentMeds = slotMedicines[selectedSlot] || []
    onUpdateSlotMedicines(selectedSlot, currentMeds.filter(m => m !== medicine))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightedIndex(prev => 
        prev < filteredMedications.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0)
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (highlightedIndex >= 0 && highlightedIndex < filteredMedications.length) {
        handleSelectMedication(filteredMedications[highlightedIndex])
      } else if (searchValue.trim()) {
        handleAddCustomMedicine()
      }
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false)
      setSearchValue("")
    }
  }

  const isAlreadyAdded = (medLabel: string) => {
    if (selectedSlot === null) return false
    return slotMedicines[selectedSlot]?.includes(medLabel) || false
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
            
            <div className="space-y-4 pt-2">
              {/* Search input with dropdown */}
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    placeholder="Search medicines..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => searchValue.trim() && setIsDropdownOpen(true)}
                    className="pl-10 pr-20 h-11"
                  />
                  {searchValue && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleAddCustomMedicine}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-3 text-xs font-medium"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add
                    </Button>
                  )}
                </div>

                {/* Dropdown results */}
                {isDropdownOpen && filteredMedications.length > 0 && (
                  <div 
                    ref={dropdownRef}
                    className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg overflow-hidden"
                  >
                    <ScrollArea className="max-h-64">
                      <div className="p-1">
                        {filteredMedications.map((med, index) => {
                          const added = isAlreadyAdded(med.label)
                          return (
                            <button
                              key={`${med.label}-${index}`}
                              onClick={() => !added && handleSelectMedication(med)}
                              disabled={added}
                              className={cn(
                                "w-full text-left px-3 py-2.5 rounded-md transition-colors flex items-start gap-3",
                                highlightedIndex === index && !added && "bg-accent",
                                added 
                                  ? "opacity-50 cursor-not-allowed" 
                                  : "hover:bg-accent cursor-pointer"
                              )}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-foreground truncate">
                                  {med.label}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {med.dci} - {med.form}
                                </p>
                              </div>
                              {added && (
                                <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* No results message */}
                {isDropdownOpen && searchValue.trim() && filteredMedications.length === 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      No medicines found for &quot;{searchValue}&quot;
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click &quot;Add&quot; to add it as a custom medicine
                    </p>
                  </div>
                )}
              </div>

              {/* Current medicines in slot */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Medicines in this slot:
                </p>
                {selectedSlot !== null && (slotMedicines[selectedSlot]?.length || 0) > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {slotMedicines[selectedSlot]?.map((medicine) => (
                      <Badge 
                        key={medicine} 
                        variant="secondary"
                        className="pl-2.5 pr-1 py-1.5 flex items-center gap-1.5 bg-green-100 text-green-800 text-sm"
                      >
                        {medicine}
                        <button
                          onClick={() => handleRemoveMedicine(medicine)}
                          className="rounded-full p-0.5 hover:bg-green-200 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic py-2">
                    No medicines assigned yet. Search above to add medicines.
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
