"use client"

import { cn } from "@/lib/utils"
import { Home } from "lucide-react"

interface PillWheelProps {
  currentSlot: number
  totalSlots?: number
}

export function PillWheel({ currentSlot, totalSlots = 22 }: PillWheelProps) {
  const slots = Array.from({ length: totalSlots }, (_, i) => i)
  const radius = 140
  const centerX = 180
  const centerY = 180

  return (
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

          return (
            <g key={slot}>
              {/* Slot circle */}
              <circle
                cx={x}
                cy={y}
                r={isCurrent ? 18 : 14}
                fill={isCurrent ? "#2563eb" : isHome ? "#f0f9ff" : "#e0f2fe"}
                stroke={isCurrent ? "#1d4ed8" : isHome ? "#0284c7" : "#7dd3fc"}
                strokeWidth={isCurrent ? 3 : 2}
                className={cn(
                  "transition-all duration-300",
                  isCurrent && "drop-shadow-lg"
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
    </div>
  )
}
