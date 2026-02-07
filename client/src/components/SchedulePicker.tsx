import { useState, useEffect } from "react";
import { Clock, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { HabitSchedule } from "@shared/schema";

interface SchedulePickerProps {
  value?: HabitSchedule;
  onChange: (schedule: HabitSchedule) => void;
}

const DAYS = [
  { key: "monday", label: "M", full: "Monday", short: "Mon" },
  { key: "tuesday", label: "T", full: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "W", full: "Wednesday", short: "Wed" },
  { key: "thursday", label: "T", full: "Thursday", short: "Thu" },
  { key: "friday", label: "F", full: "Friday", short: "Fri" },
  { key: "saturday", label: "S", full: "Saturday", short: "Sat" },
  { key: "sunday", label: "S", full: "Sunday", short: "Sun" },
];

function generateAllHours(): { value: string; label: string }[] {
  const hours: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    const value = `${h.toString().padStart(2, "0")}:00`;
    const period = h < 12 ? "AM" : "PM";
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const label = h === 0 ? "12:00 AM" : h === 12 ? "12:00 PM" : `${displayHour}:00 ${period}`;
    hours.push({ value, label });
  }
  return hours;
}

const ALL_HOURS = generateAllHours();

function formatTime(time: string): string {
  const match = ALL_HOURS.find(h => h.value === time);
  return match?.label || time;
}

export function SchedulePicker({ value, onChange }: SchedulePickerProps) {
  const [schedule, setSchedule] = useState<HabitSchedule>(
    value || { days: [], time: "08:00", reminder: true }
  );
  const [perDayMode, setPerDayMode] = useState(
    !!(value?.dayTimes && Object.keys(value.dayTimes).length > 0)
  );

  useEffect(() => {
    if (value) {
      setSchedule(value);
      setPerDayMode(!!(value.dayTimes && Object.keys(value.dayTimes).length > 0));
    }
  }, [value]);

  const update = (newSchedule: HabitSchedule) => {
    setSchedule(newSchedule);
    onChange(newSchedule);
  };

  const toggleDay = (day: string) => {
    const newDays = schedule.days.includes(day)
      ? schedule.days.filter((d) => d !== day)
      : [...schedule.days, day];

    const newDayTimes = { ...(schedule.dayTimes || {}) };
    if (!newDays.includes(day)) {
      delete newDayTimes[day];
    } else if (perDayMode && !newDayTimes[day]) {
      newDayTimes[day] = schedule.time;
    }

    update({ ...schedule, days: newDays, dayTimes: perDayMode ? newDayTimes : schedule.dayTimes });
  };

  const selectAllDays = () => {
    const allDays = DAYS.map((d) => d.key);
    const newDayTimes = perDayMode
      ? Object.fromEntries(allDays.map(d => [d, schedule.dayTimes?.[d] || schedule.time]))
      : undefined;
    update({ ...schedule, days: allDays, dayTimes: newDayTimes });
  };

  const selectWeekdays = () => {
    const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    const newDayTimes = perDayMode
      ? Object.fromEntries(weekdays.map(d => [d, schedule.dayTimes?.[d] || schedule.time]))
      : undefined;
    update({ ...schedule, days: weekdays, dayTimes: newDayTimes });
  };

  const setDefaultTime = (time: string) => {
    if (perDayMode) {
      const newDayTimes: Record<string, string> = {};
      schedule.days.forEach(d => {
        newDayTimes[d] = time;
      });
      update({ ...schedule, time, dayTimes: newDayTimes });
    } else {
      update({ ...schedule, time });
    }
  };

  const setDayTime = (day: string, time: string) => {
    const newDayTimes = { ...(schedule.dayTimes || {}) };
    newDayTimes[day] = time;
    update({ ...schedule, dayTimes: newDayTimes });
  };

  const togglePerDayMode = () => {
    const newMode = !perDayMode;
    setPerDayMode(newMode);
    if (newMode) {
      const newDayTimes: Record<string, string> = {};
      schedule.days.forEach(d => {
        newDayTimes[d] = schedule.dayTimes?.[d] || schedule.time;
      });
      update({ ...schedule, dayTimes: newDayTimes });
    } else {
      update({ ...schedule, dayTimes: undefined });
    }
  };

  const selectedDays = DAYS.filter(d => schedule.days.includes(d.key));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Days</Label>
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={selectWeekdays} data-testid="button-select-weekdays">
              Weekdays
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={selectAllDays} data-testid="button-select-all-days">
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
                "flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium transition-all",
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

      {schedule.days.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Time
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={togglePerDayMode}
              className={cn(perDayMode && "text-primary")}
              data-testid="button-toggle-per-day"
            >
              {perDayMode ? "Use same time" : "Different times per day"}
            </Button>
          </div>

          {!perDayMode ? (
            <Select value={schedule.time} onValueChange={setDefaultTime}>
              <SelectTrigger data-testid="select-default-time">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent className="max-h-[240px]">
                {ALL_HOURS.map((hour) => (
                  <SelectItem key={hour.value} value={hour.value} data-testid={`option-time-${hour.value}`}>
                    {hour.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="space-y-2">
              {selectedDays.map((day) => (
                <div key={day.key} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-10 shrink-0">{day.short}</span>
                  <Select
                    value={schedule.dayTimes?.[day.key] || schedule.time}
                    onValueChange={(time) => setDayTime(day.key, time)}
                  >
                    <SelectTrigger className="flex-1" data-testid={`select-time-${day.key}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[240px]">
                      {ALL_HOURS.map((hour) => (
                        <SelectItem key={hour.value} value={hour.value}>
                          {hour.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {schedule.days.length > 0 && (
        <div className="text-xs text-muted-foreground space-y-0.5" data-testid="text-schedule-summary">
          {!perDayMode ? (
            <p>
              {schedule.days.length} day{schedule.days.length > 1 ? "s" : ""} at {formatTime(schedule.time)}
            </p>
          ) : (
            selectedDays.map(day => (
              <p key={day.key}>
                {day.full}: {formatTime(schedule.dayTimes?.[day.key] || schedule.time)}
              </p>
            ))
          )}
        </div>
      )}
    </div>
  );
}
