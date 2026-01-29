import { useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { HabitSchedule } from "@shared/schema";

interface SchedulePickerProps {
  value?: HabitSchedule;
  onChange: (schedule: HabitSchedule) => void;
}

const DAYS = [
  { key: "monday", label: "M", full: "Monday" },
  { key: "tuesday", label: "T", full: "Tuesday" },
  { key: "wednesday", label: "W", full: "Wednesday" },
  { key: "thursday", label: "T", full: "Thursday" },
  { key: "friday", label: "F", full: "Friday" },
  { key: "saturday", label: "S", full: "Saturday" },
  { key: "sunday", label: "S", full: "Sunday" },
];

const TIME_PRESETS = [
  { value: "06:00", label: "6 AM" },
  { value: "08:00", label: "8 AM" },
  { value: "12:00", label: "Noon" },
  { value: "17:00", label: "5 PM" },
  { value: "20:00", label: "8 PM" },
];

export function SchedulePicker({ value, onChange }: SchedulePickerProps) {
  const [schedule, setSchedule] = useState<HabitSchedule>(
    value || { days: [], time: "08:00", reminder: true }
  );

  const toggleDay = (day: string) => {
    const newDays = schedule.days.includes(day)
      ? schedule.days.filter((d) => d !== day)
      : [...schedule.days, day];
    
    const newSchedule = { ...schedule, days: newDays };
    setSchedule(newSchedule);
    onChange(newSchedule);
  };

  const selectAllDays = () => {
    const allDays = DAYS.map((d) => d.key);
    const newSchedule = { ...schedule, days: allDays };
    setSchedule(newSchedule);
    onChange(newSchedule);
  };

  const selectWeekdays = () => {
    const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    const newSchedule = { ...schedule, days: weekdays };
    setSchedule(newSchedule);
    onChange(newSchedule);
  };

  const setTime = (time: string) => {
    const newSchedule = { ...schedule, time };
    setSchedule(newSchedule);
    onChange(newSchedule);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Days</Label>
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={selectWeekdays} className="text-xs h-6 px-2">
              Weekdays
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={selectAllDays} className="text-xs h-6 px-2">
              All
            </Button>
          </div>
        </div>
        <div className="flex gap-1.5">
          {DAYS.map((day) => (
            <button
              key={day.key}
              type="button"
              onClick={() => toggleDay(day.key)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-all",
                schedule.days.includes(day.key)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
              data-testid={`button-day-${day.key}`}
              title={day.full}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" />
          Time
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {TIME_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setTime(preset.value)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                schedule.time === preset.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
              data-testid={`button-time-${preset.value}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {schedule.days.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {schedule.days.length} day{schedule.days.length > 1 ? "s" : ""} at{" "}
          {new Date(`2000-01-01T${schedule.time}`).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}
