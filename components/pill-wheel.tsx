"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { motion } from "framer-motion"
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
  dispensedSlots?: number[]
  isDispensing?: boolean
}

export function PillWheel({ 
  currentSlot, 
  dispensedSlots = [],
  totalSlots = 22,
  slotMedicines,
  onUpdateSlotMedicines,
  isDispensing = false
}: PillWheelProps) {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [searchValue, setSearchValue] = useState("")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const slots = Array.from({ length: totalSlots }, (_, i) => i)
  
  // Responsive sizing
  const size = 460
  const radius = size * 0.42
  const centerX = size / 2
  const centerY = size / 2

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
      <div className="relative flex items-center justify-center w-full max-w-sm sm:max-w-md mx-auto pb-4">
        <svg 
          viewBox={`0 0 ${size} ${size}`} 
          className="w-full h-auto drop-shadow-xl"
          style={{ maxWidth: size, maxHeight: size }}
          role="img"
          aria-label="Interactive pill wheel"
        >
          {/* Outer glow */}
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <linearGradient id="wheelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="currentColor" className="text-primary/10" />
              <stop offset="100%" stopColor="currentColor" className="text-primary/5" />
            </linearGradient>
          </defs>
          
          {/* Background circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius + 30}
            fill="url(#wheelGradient)"
            className="dark:opacity-50"
          />
          
          {/* Outer ring */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius + 18}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-border"
          />
          
          {/* Inner circle background */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius - 22}
            fill="currentColor"
            className="text-secondary/50 dark:text-secondary/30"
          />

          {/* Dispensing Loading Status Overlay */}
          <motion.circle
            cx={centerX}
            cy={centerY}
            r={radius + 30}
            fill="currentColor"
            className="text-blue-500 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: isDispensing ? 0.2 : 0,
              scale: isDispensing ? [1, 1.05, 1] : 1
            }}
            transition={{ 
              opacity: { duration: 0.3 },
              scale: { repeat: Infinity, duration: 2, ease: "easeInOut" }
            }}
          />
          
          {/* Slots Group */}
          <motion.g
            animate={{ rotate: -(currentSlot) * (360 / totalSlots) }}
            transition={{ type: "spring", stiffness: 45, damping: 15, mass: 1 }}
            style={{ originX: "50%", originY: "50%" }}
          >
            {/* 
              This transparent rect forces the <g> bounding box to exactly match the 460x460 SVG canvas perfectly.
              This prevents Framer Motion's `originX/Y` calculation from shifting when inner slots resize symmetrically! 
            */}
            <rect x="0" y="0" width={size} height={size} fill="transparent" pointerEvents="none" />
            
          {slots.map((slot, index) => {
            const angle = (index / totalSlots) * 2 * Math.PI - Math.PI / 2
            const x = centerX + radius * Math.cos(angle)
            const y = centerY + radius * Math.sin(angle)
            const isHome = index === 0
            const isCurrent = index === currentSlot
            const hasMedicines = (slotMedicines[index]?.length || 0) > 0
            const isDispensed = dispensedSlots.includes(index)
            const slotRadius = isCurrent ? 22 : 16

            const slotElement = (
              <g 
                key={slot} 
                onClick={() => handleSlotClick(index)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    handleSlotClick(index)
                  }
                }}
                className={cn(
                  !isHome && "cursor-pointer",
                  "transition-transform",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
                  !isHome && isDispensed && "opacity-80"
                )}
                {...(!isHome && {
                  role: "button",
                  tabIndex: 0,
                  "aria-label": `Slot ${index}`
                })}
              >
                {/* Slot circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={slotRadius}
                  fill={
                    isCurrent 
                      ? "currentColor" 
                      : isHome 
                        ? "currentColor"
                        : hasMedicines 
                          ? "currentColor"
                          : "currentColor"
                  }
                  stroke={
                    isCurrent 
                      ? "currentColor"
                      : isHome 
                        ? "currentColor"
                        : hasMedicines 
                          ? "currentColor"
                          : "currentColor"
                  }
                  strokeWidth={isCurrent ? 2.5 : 1.5}
                  className={cn(
                    "transition-all duration-300",
                    isCurrent 
                      ? "fill-primary stroke-primary drop-shadow-lg" 
                      : isHome 
                        ? "fill-secondary stroke-primary/50"
                        : isDispensed
                          ? "fill-emerald-500/80 stroke-emerald-600"
                          : hasMedicines 
                            ? "fill-emerald-100 stroke-emerald-500 dark:fill-emerald-950 dark:stroke-emerald-500"
                            : "fill-card stroke-border hover:stroke-primary/50"
                  )}
                  filter={isCurrent ? "url(#glow)" : undefined}
                />
                
                {/* Slot content */}
                <motion.g
                  animate={{ rotate: currentSlot * (360 / totalSlots) }}
                  transition={{ type: "spring", stiffness: 45, damping: 15, mass: 1 }}
                  style={{ originX: "50%", originY: "50%" }}
                >
                  {isHome ? (
                    <Home
                      x={x - 10}
                      y={y - 10}
                      width={20}
                      height={20}
                      className="text-primary"
                    />
                  ) : isDispensed ? (
                    <Check
                      x={x - 8}
                      y={y - 8}
                      width={16}
                      height={16}
                      className="text-white"
                    />
                  ) : hasMedicines ? (
                    <Pill
                      x={x - 8}
                      y={y - 8}
                      width={16}
                      height={16}
                      className={isCurrent ? "text-primary-foreground" : "text-emerald-600 dark:text-emerald-400"}
                    />
                  ) : (
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={isCurrent ? 14 : 12}
                      fontWeight={isCurrent ? 700 : 600}
                      fill="currentColor"
                      className={isCurrent ? "fill-primary-foreground" : "fill-muted-foreground"}
                    >
                      {index}
                    </text>
                  )}
                </motion.g>
                
                {/* Current indicator glow */}
                {isCurrent && (
                  <circle
                    cx={x}
                    cy={y}
                    r={24}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-primary/40 animate-pulse"
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
                    className="max-w-64 bg-popover border border-border"
                  >
                    <div className="space-y-1.5">
                      <p className="font-medium text-popover-foreground text-sm">Slot {index}</p>
                      <div className="flex flex-wrap gap-1">
                        {slotMedicines[index]?.map((med) => (
                          <Badge 
                            key={med} 
                            variant="secondary" 
                            className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
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
          </motion.g>
          
          {/* Center hub */}
          <circle
            cx={centerX}
            cy={centerY}
            r={48}
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="2"
            className="fill-card stroke-border"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={38}
            fill="currentColor"
            className="fill-primary"
          />
          <text
            x={centerX}
            y={centerY - 10}
            textAnchor="middle"
            fontSize="10"
            fill="currentColor"
            fontWeight="600"
            className="fill-primary-foreground/80 tracking-wider"
          >
            SLOT
          </text>
          <text
            x={centerX}
            y={centerY + 12}
            textAnchor="middle"
            fontSize="24"
            fill="currentColor"
            fontWeight="700"
            className="fill-primary-foreground"
          >
            {currentSlot}
          </text>
        </svg>

        {/* Medicine Assignment Dialog */}
        <Dialog open={selectedSlot !== null} onOpenChange={(open: boolean) => !open && setSelectedSlot(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-primary" />
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
                    className="pl-10 pr-20 h-11 bg-secondary/30 border-border focus:bg-background"
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
                    className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-popover border border-border rounded-xl shadow-xl overflow-hidden"
                  >
                    <ScrollArea className="max-h-64">
                      <div className="p-1.5">
                        {filteredMedications.map((med, index) => {
                          const added = isAlreadyAdded(med.label)
                          return (
                            <button
                              key={`${med.label}-${index}`}
                              onClick={() => !added && handleSelectMedication(med)}
                              disabled={added}
                              className={cn(
                                "w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-start gap-3",
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
                                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
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
                  <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-popover border border-border rounded-xl shadow-xl p-4 text-center">
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
                        className="pl-2.5 pr-1 py-1.5 flex items-center gap-1.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 text-sm"
                      >
                        {medicine}
                        <button
                          onClick={() => handleRemoveMedicine(medicine)}
                          className="rounded-full p-0.5 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors"
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
