"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

// import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Props {
    message: string
    onDateChange?: (date: Date | undefined) => void
}

export function DatePickerDemo({message, onDateChange}: Props) {
  const [date, setDate] = React.useState<Date>()

  const handleSelect = (d: Date | undefined) => {
    setDate(d)
    onDateChange?.(d)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-empty={!date}
          className="justify-start text-left font-normal data-[empty=true]:text-muted-foreground w-full"
        >
          <CalendarIcon />
          {date ? format(date, "PPP") : <span>{message}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar mode="single" selected={date} onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  )
}