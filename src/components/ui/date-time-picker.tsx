import * as React from "react"
import { Calendar as CalendarIcon, Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateTimePickerProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  placeholder?: string
  customTrigger?: React.ReactNode
}

export function DateTimePicker({ date, setDate, placeholder = "Pick a date", customTrigger }: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [localDate, setLocalDate] = React.useState<string>("")
  const [localTime, setLocalTime] = React.useState<string>("")

  React.useEffect(() => {
    if (date && !isNaN(date.getTime())) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      setLocalDate(`${year}-${month}-${day}`)

      const hours = String(date.getHours()).padStart(2, "0")
      const minutes = String(date.getMinutes()).padStart(2, "0")
      setLocalTime(`${hours}:${minutes}`)
    } else {
      setLocalDate("")
      setLocalTime("")
    }
  }, [date])

  const parseLocalParts = (dateStr: string, timeStr: string): Date => {
    const today = new Date()
    let year = today.getFullYear()
    let monthIndex = today.getMonth()
    let day = today.getDate()

    if (dateStr) {
      const parts = dateStr.split("-").map(Number)
      if (parts.length === 3) {
        year = parts[0]
        monthIndex = parts[1] - 1
        day = parts[2]
      }
    }

    let h = 12
    let m = 0
    if (timeStr) {
      const parts = timeStr.split(":").map(Number)
      if (parts.length === 2) {
        h = parts[0]
        m = parts[1]
      }
    }

    return new Date(year, monthIndex, day, h, m, 0)
  }

  const handleDateChange = (newDateStr: string) => {
    setLocalDate(newDateStr)
    if (!newDateStr) {
      setDate(undefined)
      return
    }
    const updated = parseLocalParts(newDateStr, localTime)
    setDate(updated)
  }

  const handleTimeChange = (newTimeStr: string) => {
    setLocalTime(newTimeStr)
    const updated = parseLocalParts(localDate, newTimeStr)
    setDate(updated)
  }

  const handleClear = () => {
    setLocalDate("")
    setLocalTime("")
    setDate(undefined)
    setIsOpen(false)
  }

  const formatDisplayString = (d: Date | undefined): string => {
    if (!d || isNaN(d.getTime())) return placeholder
    const monthsEn = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    const day = d.getDate()
    const month = monthsEn[d.getMonth()]
    const year = d.getFullYear()
    
    let hours = d.getHours()
    const minutes = d.getMinutes().toString().padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    
    hours = hours % 12
    hours = hours ? hours : 12
    
    return `${day} ${month} ${year} | ${hours}:${minutes} ${ampm}`
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {customTrigger ? customTrigger : (
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              (!date || isNaN(date.getTime())) && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDisplayString(date)}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50 shadow-xl border border-border" align="start">
        <div className="p-4 bg-popover rounded-md space-y-4 w-[280px]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary mb-1">
              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Select Date</span>
            </div>
            <Input
              type="date"
              value={localDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full bg-background border-border text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary mb-1">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Select Time</span>
            </div>
            <Input
              type="time"
              value={localTime}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="w-full bg-background border-border text-sm"
            />
          </div>
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button 
              type="button" 
              size="sm" 
              variant="outline"
              className="flex-1 text-xs font-semibold" 
              onClick={() => {
                const now = new Date()
                setDate(now)
                setIsOpen(false)
              }}
            >
              Current
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="px-2.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleClear}
            >
              Clear
            </Button>
            <Button 
              type="button" 
              size="sm" 
              className="flex-1 text-xs font-semibold" 
              onClick={() => setIsOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
