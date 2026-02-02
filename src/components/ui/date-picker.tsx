import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    date?: Date
    setDate: (date?: Date) => void
    placeholder?: string
    className?: string
}

export function DatePicker({ date, setDate, placeholder = "Pick a date", className }: DatePickerProps) {
    const isValidDate = date instanceof Date && !isNaN(date.getTime());

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    data-empty={!isValidDate}
                    className={cn(
                        "w-full justify-between text-left font-normal border-border data-[empty=true]:text-muted-foreground",
                        className
                    )}
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <CalendarIcon className="h-4 w-4 opacity-50 shrink-0" />
                        <span className="truncate">
                            {isValidDate ? format(date, "PPP") : <span>{placeholder}</span>}
                        </span>
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" side="bottom">
                <Calendar
                    mode="single"
                    selected={isValidDate ? date : undefined}
                    onSelect={setDate}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    )
}
