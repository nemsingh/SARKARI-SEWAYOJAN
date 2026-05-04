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
      className={cn("p-4 bg-background/95 backdrop-blur-md rounded-xl border border-border/40 shadow-sm", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center mb-2",
        caption_label: "text-sm font-bold text-primary",
        nav: "space-x-1 flex items-center bg-muted/40 rounded-full px-1 py-1",
        nav_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-7 bg-transparent p-0 opacity-80 hover:opacity-100 hover:bg-primary/10 rounded-full text-primary transition-all cursor-pointer",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1 mx-auto",
        head_row: "flex w-full justify-center mb-2",
        head_cell: "text-muted-foreground w-9 font-bold text-[0.7rem] uppercase tracking-wider mx-0.5",
        row: "flex w-full justify-center mt-1",
        cell: "h-9 w-9 text-center text-sm p-0 m-[1px] relative [&:has([aria-selected].day-range-end)]:rounded-r-lg [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-primary/10 first:[&:has([aria-selected])]:rounded-l-lg last:[&:has([aria-selected])]:rounded-r-lg focus-within:relative focus-within:z-20 rounded-lg transition-all",
        day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-medium aria-selected:opacity-100 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer text-[14px]"),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground shadow flex items-center justify-center hover:bg-primary/90 hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-lg font-bold border-none",
        day_today: "bg-accent/10 text-accent font-bold ring-1 ring-accent/30 rounded-lg",
        day_outside:
          "day-outside text-muted-foreground/40 opacity-40 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-30 cursor-not-allowed",
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
