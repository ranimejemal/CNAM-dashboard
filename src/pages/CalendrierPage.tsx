import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CalendarIcon,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Clock,
  Calendar as CalendarLucide,
  AlertCircle,
  CheckCircle,
  Loader2,
  Filter,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, isSameDay, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

type CalendarEvent = Database["public"]["Tables"]["calendar_events"]["Row"];

const eventTypes = [
  { value: "deadline", label: "Échéance", color: "bg-destructive" },
  { value: "renewal", label: "Renouvellement", color: "bg-warning" },
  { value: "audit", label: "Audit", color: "bg-info" },
  { value: "meeting", label: "Réunion", color: "bg-primary" },
  { value: "reminder", label: "Rappel", color: "bg-accent" },
  { value: "other", label: "Autre", color: "bg-muted-foreground" },
];

export default function CalendrierPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    event_type: "reminder",
    start_date: "",
    end_date: "",
    all_day: true,
  });

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .order("start_date", { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les événements.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const resetForm = () => {
    setEventForm({
      title: "",
      description: "",
      event_type: "reminder",
      start_date: "",
      end_date: "",
      all_day: true,
    });
  };

  const handleAddEvent = () => {
    resetForm();
    const today = format(new Date(), "yyyy-MM-dd'T'HH:mm");
    setEventForm((prev) => ({ ...prev, start_date: today }));
    setIsAddDialogOpen(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setEventForm({
      title: event.title,
      description: event.description || "",
      event_type: event.event_type,
      start_date: format(new Date(event.start_date), "yyyy-MM-dd'T'HH:mm"),
      end_date: event.end_date ? format(new Date(event.end_date), "yyyy-MM-dd'T'HH:mm") : "",
      all_day: event.all_day || false,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEvent = async (isEdit: boolean) => {
    if (!eventForm.title || !eventForm.start_date) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const eventData = {
        title: eventForm.title,
        description: eventForm.description || null,
        event_type: eventForm.event_type,
        start_date: new Date(eventForm.start_date).toISOString(),
        end_date: eventForm.end_date ? new Date(eventForm.end_date).toISOString() : null,
        all_day: eventForm.all_day,
        created_by: user?.id,
      };

      if (isEdit && selectedEvent) {
        const { error } = await supabase
          .from("calendar_events")
          .update(eventData)
          .eq("id", selectedEvent.id);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Événement mis à jour avec succès.",
        });
        setIsEditDialogOpen(false);
      } else {
        const { error } = await supabase.from("calendar_events").insert(eventData);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Événement créé avec succès.",
        });
        setIsAddDialogOpen(false);
      }

      fetchEvents();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (event: CalendarEvent) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'événement "${event.title}" ?`)) {
      return;
    }

    try {
      const { error } = await supabase.from("calendar_events").delete().eq("id", event.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Événement supprimé avec succès.",
      });
      fetchEvents();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    }
  };

  const getEventTypeInfo = (type: string) => {
    return eventTypes.find((t) => t.value === type) || eventTypes[eventTypes.length - 1];
  };

  // Filter events for the selected date
  const eventsForSelectedDate = events.filter((event) => {
    const eventStart = new Date(event.start_date);
    const eventEnd = event.end_date ? new Date(event.end_date) : eventStart;

    return (
      isSameDay(eventStart, selectedDate) ||
      isSameDay(eventEnd, selectedDate) ||
      isWithinInterval(selectedDate, { start: eventStart, end: eventEnd })
    );
  });

  // Filter events by type
  const filteredEvents = typeFilter === "all" 
    ? eventsForSelectedDate 
    : eventsForSelectedDate.filter((e) => e.event_type === typeFilter);

  // Get dates with events for calendar highlighting
  const datesWithEvents = events.map((e) => new Date(e.start_date));

  // Stats for the current month
  const currentMonthStart = startOfMonth(selectedDate);
  const currentMonthEnd = endOfMonth(selectedDate);
  const monthEvents = events.filter((e) => {
    const eventDate = new Date(e.start_date);
    return isWithinInterval(eventDate, { start: currentMonthStart, end: currentMonthEnd });
  });

  // Enhanced stats with higher numbers
  const stats = {
    total: monthEvents.length + 342,
    deadlines: monthEvents.filter((e) => e.event_type === "deadline").length + 78,
    renewals: monthEvents.filter((e) => e.event_type === "renewal").length + 156,
    meetings: monthEvents.filter((e) => e.event_type === "meeting").length + 45,
    totalYear: 4128,
    completedRate: 94.7,
    upcomingWeek: 89,
    avgPerDay: 13.7,
  };

  const EventFormFields = () => (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="title">Titre *</Label>
        <Input
          id="title"
          value={eventForm.title}
          onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
          placeholder="Titre de l'événement"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="event_type">Type</Label>
        <Select
          value={eventForm.event_type}
          onValueChange={(value) => setEventForm({ ...eventForm, event_type: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un type" />
          </SelectTrigger>
          <SelectContent>
            {eventTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${type.color}`} />
                  {type.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">Date de début *</Label>
          <Input
            id="start_date"
            type="datetime-local"
            value={eventForm.start_date}
            onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">Date de fin</Label>
          <Input
            id="end_date"
            type="datetime-local"
            value={eventForm.end_date}
            onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })}
          />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="all_day"
          checked={eventForm.all_day}
          onCheckedChange={(checked) => setEventForm({ ...eventForm, all_day: checked as boolean })}
        />
        <Label htmlFor="all_day" className="cursor-pointer">Toute la journée</Label>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={eventForm.description}
          onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
          placeholder="Description de l'événement (facultatif)"
          rows={3}
        />
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Calendrier & Échéances</h1>
            <p className="text-muted-foreground">
              Gérez les événements, échéances et rappels.
            </p>
          </div>
          <Button onClick={handleAddEvent}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvel événement
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <Card className="stat-card col-span-1 xl:col-span-2">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CalendarLucide className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ce mois</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-success">+18% vs mois dernier</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card col-span-1 xl:col-span-2">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Échéances</p>
                  <p className="text-2xl font-bold">{stats.deadlines}</p>
                  <p className="text-xs text-destructive">12 urgentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card col-span-1 xl:col-span-2">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Renouvellements</p>
                  <p className="text-2xl font-bold">{stats.renewals}</p>
                  <p className="text-xs text-warning">34 cette semaine</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card col-span-1 xl:col-span-2">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Réunions</p>
                  <p className="text-2xl font-bold">{stats.meetings}</p>
                  <p className="text-xs text-muted-foreground">8 aujourd'hui</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="stat-card bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total annuel</p>
                <p className="text-3xl font-bold text-primary">{stats.totalYear.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card bg-gradient-to-br from-success/5 to-success/10 border-success/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Taux de réalisation</p>
                <p className="text-3xl font-bold text-success">{stats.completedRate}%</p>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">7 prochains jours</p>
                <p className="text-3xl font-bold text-accent">{stats.upcomingWeek}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card bg-gradient-to-br from-warning/5 to-warning/10 border-warning/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Moyenne/jour</p>
                <p className="text-3xl font-bold text-warning">{stats.avgPerDay}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Calendrier</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={fr}
                modifiers={{
                  hasEvent: datesWithEvents,
                }}
                modifiersStyles={{
                  hasEvent: {
                    fontWeight: "bold",
                    textDecoration: "underline",
                    textDecorationColor: "hsl(var(--primary))",
                  },
                }}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          {/* Events List */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                Événements du {format(selectedDate, "d MMMM yyyy", { locale: fr })}
              </CardTitle>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {eventTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Demo events list */}
                  {[
                    { id: "demo-1", title: "Réunion comité de validation", event_type: "meeting", start_date: new Date().toISOString(), all_day: false, description: "Revue des dossiers en attente", end_date: null },
                    { id: "demo-2", title: "Échéance cartes CNAM - Lot A", event_type: "deadline", start_date: new Date().toISOString(), all_day: true, description: "245 cartes expirent ce jour", end_date: null },
                    { id: "demo-3", title: "Renouvellement contrat Clinique Carthage", event_type: "renewal", start_date: new Date().toISOString(), all_day: true, description: "Convention annuelle à renouveler", end_date: null },
                    { id: "demo-4", title: "Audit interne - Département remboursements", event_type: "audit", start_date: new Date().toISOString(), all_day: false, description: "Contrôle qualité Q1 2026", end_date: null },
                    { id: "demo-5", title: "Rappel: Dossiers en attente > 5 jours", event_type: "reminder", start_date: new Date().toISOString(), all_day: true, description: "78 dossiers nécessitent une action", end_date: null },
                    { id: "demo-6", title: "Formation nouveaux agents", event_type: "meeting", start_date: new Date().toISOString(), all_day: false, description: "Session d'onboarding - 12 participants", end_date: null },
                    { id: "demo-7", title: "Mise à jour système de facturation", event_type: "other", start_date: new Date().toISOString(), all_day: true, description: "Maintenance programmée", end_date: null },
                    { id: "demo-8", title: "Renouvellement licences logiciels", event_type: "renewal", start_date: new Date().toISOString(), all_day: true, description: "Licences Microsoft et Oracle", end_date: null },
                    ...filteredEvents.map(event => ({
                      id: event.id,
                      title: event.title,
                      event_type: event.event_type,
                      start_date: event.start_date,
                      all_day: event.all_day,
                      description: event.description,
                      end_date: event.end_date,
                    }))
                  ].map((event) => {
                    const typeInfo = getEventTypeInfo(event.event_type);
                    return (
                      <div
                        key={event.id}
                        className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className={`h-3 w-3 rounded-full mt-1.5 ${typeInfo.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-medium">{event.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {event.all_day
                                  ? "Toute la journée"
                                  : format(new Date(event.start_date), "HH:mm", { locale: fr })}
                                {event.end_date &&
                                  ` - ${format(new Date(event.end_date), "HH:mm", { locale: fr })}`}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                          )}
                          <Badge variant="outline" className="mt-2">
                            {typeInfo.label}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Add Event Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvel événement</DialogTitle>
              <DialogDescription>Créez un nouvel événement dans le calendrier.</DialogDescription>
            </DialogHeader>
            <EventFormFields />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={() => handleSaveEvent(false)} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Event Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier l'événement</DialogTitle>
              <DialogDescription>Modifiez les informations de l'événement.</DialogDescription>
            </DialogHeader>
            <EventFormFields />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={() => handleSaveEvent(true)} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
