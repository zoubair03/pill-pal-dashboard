"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts"
import { Download, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"

const mockData = [
  { week: "Week 1", rate: 85, taken: 18, missed: 3 },
  { week: "Week 2", rate: 95, taken: 20, missed: 1 },
  { week: "Week 3", rate: 100, taken: 21, missed: 0 },
  { week: "Week 4", rate: 90, taken: 19, missed: 2 },
]

export function MonthlyReport() {
  const averageRate = Math.round(mockData.reduce((acc, curr) => acc + curr.rate, 0) / mockData.length)

  const handleExportPDF = () => {
    // A simple print invocation will open the native PDF dialog in modern browsers
    window.print()
  }

  return (
    <Card className="flex flex-col h-full border-border/50 bg-card/80 shadow-xl shadow-black/5 backdrop-blur-sm print:shadow-none print:border-none print:bg-transparent overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-4 border-b border-border/10 bg-muted/20 print:bg-transparent">
        <div className="space-y-1.5">
          <CardTitle className="text-xl flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Monthly Adherence
          </CardTitle>
          <CardDescription className="text-sm">
            Total average: <span className="font-bold text-emerald-600 dark:text-emerald-400">{averageRate}%</span>
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportPDF} className="hidden sm:flex print:hidden gap-1.5 h-8">
          <Download className="h-4 w-4" />
          Export PDF
        </Button>
      </CardHeader>
      <CardContent className="flex-1 p-0 sm:p-6 sm:pt-4">
        <div className="h-[250px] w-full pt-4 pr-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
              <XAxis dataKey="week" tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" tickMargin={10} />
              <YAxis tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" tickFormatter={(value) => `${value}%`} />
              <Tooltip 
                cursor={{ fill: 'currentColor', opacity: 0.05 }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-xl border border-border bg-card p-3 shadow-2xl">
                        <p className="mb-2 text-sm font-medium text-muted-foreground">{label}</p>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-2.5 w-2.5 rounded-full" 
                              style={{ backgroundColor: payload[0].color }} 
                            />
                            <span className="text-sm font-semibold text-foreground">
                              Adherence Rate:
                            </span>
                            <span className="text-sm font-bold" style={{ color: payload[0].color }}>
                              {payload[0].value}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="rate" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {mockData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.rate >= 90 ? '#10b981' : entry.rate >= 75 ? '#f59e0b' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
