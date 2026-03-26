import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

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
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date)
  const [hours, setHours] = React.useState<string>(date ? format(date, "hh") : "12")
  const [minutes, setMinutes] = React.useState<string>(date ? format(date, "mm") : "00")
  const [ampm, setAmpm] = React.useState<string>(date ? format(date, "a") : "AM")

  React.useEffect(() => {
    if (date) {
      setSelectedDate(date)
      setHours(format(date, "hh"))
      setMinutes(format(date, "mm"))
      setAmpm(format(date, "a"))
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

  return (
    <Popover>
      <PopoverTrigger asChild>
        {customTrigger ? customTrigger : (
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "dd MMMM yyyy | hh:mm a") : <span>{placeholder}</span>}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          initialFocus
        />
        <div className="p-3 border-t border-border flex items-center gap-2 justify-center">
          <Select value={hours} onValueChange={(v) => handleTimeChange("hours", v)}>
            <SelectTrigger className="w-[70px]">
              <SelectValue placeholder="HH" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => {
                const val = h.toString().padStart(2, "0")
                return <SelectItem key={val} value={val}>{val}</SelectItem>
              })}
            </SelectContent>
          </Select>
          <span>:</span>
          <Select value={minutes} onValueChange={(v) => handleTimeChange("minutes", v)}>
            <SelectTrigger className="w-[70px]">
              <SelectValue placeholder="MM" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 60 }, (_, i) => i).map((m) => {
                const val = m.toString().padStart(2, "0")
                return <SelectItem key={val} value={val}>{val}</SelectItem>
              })}
            </SelectContent>
          </Select>
          <Select value={ampm} onValueChange={(v) => handleTimeChange("ampm", v)}>
            <SelectTrigger className="w-[70px]">
              <SelectValue placeholder="AM/PM" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AM">AM</SelectItem>
              <SelectItem value="PM">PM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  )
}
