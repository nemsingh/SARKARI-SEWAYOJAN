import * as React from "react"
import { Calendar as CalendarIcon, Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DateTimePickerProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  placeholder?: string
  customTrigger?: React.ReactNode
}

export function DateTimePicker({ date, setDate, placeholder = "Pick a date", customTrigger }: DateTimePickerProps) {
  const isValidDate = (d: any) => d instanceof Date && !isNaN(d.getTime());
  
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(isValidDate(date) ? date : undefined)
  const [hours, setHours] = React.useState<string>("12")
  const [minutes, setMinutes] = React.useState<string>("00")
  const [ampm, setAmpm] = React.useState<string>("AM")

  React.useEffect(() => {
    if (isValidDate(date)) {
      setSelectedDate(date!)
      let h = date!.getHours()
      const m = date!.getMinutes()
      const isPm = h >= 12
      
      setAmpm(isPm ? "PM" : "AM")
      h = h % 12
      h = h === 0 ? 12 : h
      
      setHours(h.toString().padStart(2, "0"))
      setMinutes(m.toString().padStart(2, "0"))
    } else {
      setSelectedDate(undefined)
    }
  }, [date])

  const handleDateSelect = (newDate: Date | undefined) => {
    if (!newDate) {
      setSelectedDate(undefined)
      setDate(undefined)
      return
    }
    
    const updatedDate = new Date(newDate)
    
    let h = parseInt(hours, 10)
    if (ampm === "PM" && h < 12) h += 12
    if (ampm === "AM" && h === 12) h = 0
    
    updatedDate.setHours(h)
    updatedDate.setMinutes(parseInt(minutes, 10))
    updatedDate.setSeconds(0)
    
    setSelectedDate(updatedDate)
    setDate(updatedDate)
  }

  const handleTimeChange = (type: "hours" | "minutes" | "ampm", value: string) => {
    if (!selectedDate) return

    const newDate = new Date(selectedDate)
    const currentHours = newDate.getHours()
    
    if (type === "hours") {
      setHours(value)
      let h = parseInt(value, 10)
      if (ampm === "PM" && h < 12) h += 12
      if (ampm === "AM" && h === 12) h = 0
      newDate.setHours(h)
    } else if (type === "minutes") {
      setMinutes(value)
      newDate.setMinutes(parseInt(value, 10))
    } else if (type === "ampm") {
      setAmpm(value)
      if (value === "PM" && currentHours < 12) {
        newDate.setHours(currentHours + 12)
      } else if (value === "AM" && currentHours >= 12) {
        newDate.setHours(currentHours - 12)
      }
    }
    
    setSelectedDate(newDate)
    setDate(newDate)
  }

  // Format date helper to replace date-fns
  const formatDisplay = (d: Date) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const day = d.getDate().toString().padStart(2, '0')
    const month = months[d.getMonth()]
    const year = d.getFullYear()
    let hr = d.getHours()
    const min = d.getMinutes().toString().padStart(2, '0')
    const ap = hr >= 12 ? 'PM' : 'AM'
    hr = hr % 12
    hr = hr === 0 ? 12 : hr
    const hrStr = hr.toString().padStart(2, '0')
    return `${day} ${month} ${year} | ${hrStr}:${min} ${ap}`
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {customTrigger ? customTrigger : (
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal border-border/60 hover:bg-muted/50 rounded-lg shadow-sm transition-all",
              !isValidDate(date) && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
            {isValidDate(date) ? formatDisplay(date!) : <span>{placeholder}</span>}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-xl shadow-lg border-muted/30" align="start">
        <div className="bg-background/95 backdrop-blur-sm rounded-xl overflow-hidden">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            className="p-3 pointer-events-auto"
          />
          <div className="px-4 py-3 border-t border-border/40 bg-muted/20 flex flex-col gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase font-semibold tracking-wider font-sans mb-1">
              <Clock className="w-3.5 h-3.5" /> Time
            </div>
            <div className="flex items-center gap-1.5 justify-between">
              <Select value={hours} onValueChange={(v) => handleTimeChange("hours", v)}>
                <SelectTrigger className="w-[65px] h-8 text-sm bg-background border-border/50 rounded-md shadow-sm">
                  <SelectValue placeholder="HH" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => {
                    const val = h.toString().padStart(2, "0")
                    return <SelectItem key={val} value={val}>{val}</SelectItem>
                  })}
                </SelectContent>
              </Select>
              <span className="text-xl font-bold text-muted-foreground/50 pb-1">:</span>
              <Select value={minutes} onValueChange={(v) => handleTimeChange("minutes", v)}>
                <SelectTrigger className="w-[65px] h-8 text-sm bg-background border-border/50 rounded-md shadow-sm">
                  <SelectValue placeholder="MM" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {Array.from({ length: 60 }, (_, i) => i).map((m) => {
                    const val = m.toString().padStart(2, "0")
                    return <SelectItem key={val} value={val}>{val}</SelectItem>
                  })}
                </SelectContent>
              </Select>
              <Select value={ampm} onValueChange={(v) => handleTimeChange("ampm", v)}>
                <SelectTrigger className="w-[65px] h-8 text-sm bg-background border-border/50 rounded-md shadow-sm ml-1">
                  <SelectValue placeholder="AM/PM" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AM">AM</SelectItem>
                  <SelectItem value="PM">PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

