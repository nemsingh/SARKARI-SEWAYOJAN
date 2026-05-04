import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 bg-background/50", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center mb-2",
        caption_label: "text-[15px] font-bold text-primary",
        nav: "space-x-1 flex items-center bg-muted/30 rounded-full px-1 py-1",
        nav_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 bg-transparent p-0 opacity-80 hover:opacity-100 hover:bg-primary/10 rounded-full text-primary transition-all",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex w-full",
        head_cell: "text-muted-foreground w-9 font-bold text-[0.75rem] uppercase tracking-wider mx-0.5",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 m-0.5 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-primary/20 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 rounded-md transition-all",
        day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-medium aria-selected:opacity-100 rounded-md hover:bg-primary/10 hover:text-primary transition-all"),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-white shadow-md shadow-primary/30 hover:bg-primary hover:text-white focus:bg-primary focus:text-white rounded-md scale-[1.05] font-bold",
        day_today: "bg-accent/10 text-accent font-bold ring-1 ring-accent/30 rounded-md",
        day_outside:
          "day-outside text-muted-foreground/50 opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-primary/20 aria-selected:text-primary",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
