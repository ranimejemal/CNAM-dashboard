import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Props {
  events: any[];
}

const eventTypeColors: Record<string, string> = {
  "rendez-vous": "bg-primary/10 text-primary border-primary/30",
  "rappel": "bg-warning/10 text-warning border-warning/30",
  "réunion": "bg-info/10 text-info border-info/30",
  "audit": "bg-destructive/10 text-destructive border-destructive/30",
  "autre": "bg-muted text-muted-foreground border-border",
};

export function UserCalendarTab({ events }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const eventsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    events.forEach((e) => {
      const key = format(new Date(e.start_date), "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [events]);

  const selectedEvents = selectedDate
    ? eventsByDate[format(selectedDate, "yyyy-MM-dd")] || []
    : [];

  const upcomingEvents = events
    .filter((e) => new Date(e.start_date) >= new Date())
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Calendrier des événements</h2>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar Grid */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: fr })}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">{day}</div>
              ))}
            </div>
            {/* Day Cells */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const dateKey = format(day, "yyyy-MM-dd");
                const dayEvents = eventsByDate[dateKey] || [];
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "relative h-12 md:h-16 rounded-lg text-sm transition-colors flex flex-col items-center justify-start pt-1",
                      isCurrentMonth ? "hover:bg-muted/80" : "text-muted-foreground/40",
                      isSelected && "bg-primary/10 ring-1 ring-primary/30",
                      isToday(day) && "font-bold"
                    )}
                  >
                    <span className={cn(
                      "h-6 w-6 flex items-center justify-center rounded-full text-xs",
                      isToday(day) && "bg-primary text-primary-foreground"
                    )}>
                      {format(day, "d")}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayEvents.slice(0, 3).map((_, i) => (
                          <div key={i} className="h-1.5 w-1.5 rounded-full bg-primary" />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar: Selected Date Events + Upcoming */}
        <div className="space-y-4">
          {selectedDate && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  {format(selectedDate, "EEEE dd MMMM yyyy", { locale: fr })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun événement ce jour</p>
                ) : (
                  <div className="space-y-3">
                    {selectedEvents.map((e) => (
                      <div key={e.id} className="p-3 rounded-lg border border-border/50">
                        <p className="text-sm font-medium">{e.title}</p>
                        {e.description && <p className="text-xs text-muted-foreground mt-1">{e.description}</p>}
                        <Badge variant="outline" className={cn("mt-2 text-xs", eventTypeColors[e.event_type?.toLowerCase()] || eventTypeColors.autre)}>
                          {e.event_type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Prochains événements</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun événement à venir</p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((e) => (
                    <div key={e.id} className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">{format(new Date(e.start_date), "dd")}</span>
                        <span className="text-[10px] text-primary uppercase">{format(new Date(e.start_date), "MMM", { locale: fr })}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{e.title}</p>
                        <Badge variant="outline" className="mt-1 text-xs">{e.event_type}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
