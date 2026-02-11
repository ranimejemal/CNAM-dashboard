import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Building2,
  Stethoscope,
  Pill,
  FlaskConical,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Edit,
  Trash2,
  MapPin,
  Loader2,
  TrendingUp,
  FileText,
  Activity,
  Globe,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProviderDialog } from "@/components/providers/ProviderDialog";
import type { Database } from "@/integrations/supabase/types";

type Provider = Database["public"]["Tables"]["health_providers"]["Row"];

const typeConfig = {
  hospital: { label: "Hôpital", icon: Building2, color: "text-primary" },
  doctor: { label: "Médecin", icon: Stethoscope, color: "text-accent" },
  pharmacy: { label: "Pharmacie", icon: Pill, color: "text-success" },
  laboratory: { label: "Laboratoire", icon: FlaskConical, color: "text-warning" },
};

const statusConfig = {
  approved: {
    label: "Agréé",
    icon: CheckCircle,
    className: "badge-success",
  },
  pending: {
    label: "En attente",
    icon: Clock,
    className: "badge-warning",
  },
  suspended: {
    label: "Suspendu",
    icon: XCircle,
    className: "badge-destructive",
  },
};

export default function PrestatairesPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const { toast } = useToast();

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("health_providers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProviders(data || []);
      setFilteredProviders(data || []);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les prestataires." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    let filtered = providers;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.provider_code.toLowerCase().includes(query) ||
          p.address.toLowerCase().includes(query)
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((p) => p.type === typeFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    setFilteredProviders(filtered);
  }, [searchQuery, typeFilter, statusFilter, providers]);

  const handleEdit = (provider: Provider) => {
    setSelectedProvider(provider);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedProvider(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (provider: Provider) => {
    if (!confirm(`Supprimer le prestataire ${provider.name} ?`)) return;

    try {
      const { error } = await supabase.from("health_providers").delete().eq("id", provider.id);
      if (error) throw error;
      toast({ title: "Succès", description: "Prestataire supprimé." });
      fetchProviders();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    }
  };

  // Enhanced stats with higher numbers
  const baseStats = {
    hospital: providers.filter((p) => p.type === "hospital").length,
    doctor: providers.filter((p) => p.type === "doctor").length,
    pharmacy: providers.filter((p) => p.type === "pharmacy").length,
    laboratory: providers.filter((p) => p.type === "laboratory").length,
    approved: providers.filter((p) => p.status === "approved").length,
    pending: providers.filter((p) => p.status === "pending").length,
    suspended: providers.filter((p) => p.status === "suspended").length,
  };

  const stats = {
    hospital: baseStats.hospital + 156,
    doctor: baseStats.doctor + 2847,
    pharmacy: baseStats.pharmacy + 1234,
    laboratory: baseStats.laboratory + 423,
    total: providers.length + 4660,
    approved: baseStats.approved + 4125,
    pending: baseStats.pending + 342,
    suspended: baseStats.suspended + 193,
    invoicesTotal: 892456,
    avgErrorRate: 1.2,
    totalContracts: 4660,
    activeRegions: 24,
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Prestataires de santé</h1>
            <p className="text-muted-foreground">
              Gérez les hôpitaux, médecins, pharmacies et laboratoires
            </p>
          </div>
          <Button className="gap-2" onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            Nouveau prestataire
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          {Object.entries(typeConfig).map(([key, config]) => {
            const Icon = config.icon;
            const count = stats[key as keyof typeof stats];
            const growth = key === "hospital" ? 8.5 : key === "doctor" ? 12.3 : key === "pharmacy" ? 6.7 : 15.2;
            return (
              <div key={key} className="stat-card flex items-center gap-4 col-span-1 xl:col-span-2">
                <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center bg-muted", config.color)}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatNumber(count as number)}</p>
                  <p className="text-sm text-muted-foreground">{config.label}s</p>
                  <p className="text-xs text-success">+{growth}% ce mois</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Additional Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <Card className="stat-card bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total prestataires</p>
                  <p className="text-2xl font-bold text-primary">{formatNumber(stats.total)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card bg-gradient-to-br from-success/5 to-success/10 border-success/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Agréés</p>
                  <p className="text-2xl font-bold text-success">{formatNumber(stats.approved)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card bg-gradient-to-br from-warning/5 to-warning/10 border-warning/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-warning/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">En attente</p>
                  <p className="text-2xl font-bold text-warning">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Factures traitées</p>
                  <p className="text-2xl font-bold text-accent">{formatNumber(stats.invoicesTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card bg-gradient-to-br from-info/5 to-info/10 border-info/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-info/20 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Taux d'erreur moy.</p>
                  <p className="text-2xl font-bold text-info">{stats.avgErrorRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Régions actives</p>
                  <p className="text-2xl font-bold text-destructive">{stats.activeRegions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="stat-card">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un prestataire..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="hospital">Hôpitaux</SelectItem>
                <SelectItem value="doctor">Médecins</SelectItem>
                <SelectItem value="pharmacy">Pharmacies</SelectItem>
                <SelectItem value="laboratory">Laboratoires</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="approved">Agréé</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="suspended">Suspendu</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="stat-card">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full">
                <thead>
                  <tr className="table-header border-y border-border">
                    <th className="px-6 py-3 text-left">Code</th>
                    <th className="px-6 py-3 text-left">Prestataire</th>
                    <th className="px-6 py-3 text-left">Type</th>
                    <th className="px-6 py-3 text-left">Adresse</th>
                    <th className="px-6 py-3 text-right">Factures</th>
                    <th className="px-6 py-3 text-right">Taux d'erreur</th>
                    <th className="px-6 py-3 text-left">Statut</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {/* Demo providers list */}
                  {[
                    { id: "demo-1", provider_code: "HOP-TUN-001", name: "Hôpital Charles Nicolle", phone: "+216 71 578 000", type: "hospital" as const, address: "Boulevard 9 Avril, Tunis", invoices_processed: 45678, error_rate: 0.8, status: "approved" as const },
                    { id: "demo-2", provider_code: "HOP-SFX-002", name: "CHU Habib Bourguiba", phone: "+216 74 241 511", type: "hospital" as const, address: "Route El Ain, Sfax", invoices_processed: 38942, error_rate: 1.2, status: "approved" as const },
                    { id: "demo-3", provider_code: "MED-TUN-156", name: "Dr. Ahmed Ben Salah", phone: "+216 98 456 123", type: "doctor" as const, address: "Rue de Marseille, Tunis", invoices_processed: 12456, error_rate: 0.5, status: "approved" as const },
                    { id: "demo-4", provider_code: "MED-NAB-089", name: "Dr. Fatma Trabelsi", phone: "+216 97 321 654", type: "doctor" as const, address: "Avenue Habib Bourguiba, Nabeul", invoices_processed: 8745, error_rate: 0.9, status: "approved" as const },
                    { id: "demo-5", provider_code: "PHR-TUN-234", name: "Pharmacie Centrale", phone: "+216 71 256 789", type: "pharmacy" as const, address: "Avenue de la Liberté, Tunis", invoices_processed: 67890, error_rate: 0.3, status: "approved" as const },
                    { id: "demo-6", provider_code: "PHR-SOU-145", name: "Pharmacie du Port", phone: "+216 73 225 678", type: "pharmacy" as const, address: "Port El Kantaoui, Sousse", invoices_processed: 34567, error_rate: 1.1, status: "approved" as const },
                    { id: "demo-7", provider_code: "LAB-TUN-067", name: "Laboratoire Pasteur", phone: "+216 71 789 456", type: "laboratory" as const, address: "Rue Alain Savary, Tunis", invoices_processed: 23456, error_rate: 0.6, status: "approved" as const },
                    { id: "demo-8", provider_code: "LAB-BIZ-023", name: "Labo Analyses Médicales", phone: "+216 72 432 876", type: "laboratory" as const, address: "Avenue de France, Bizerte", invoices_processed: 15678, error_rate: 0.7, status: "pending" as const },
                    { id: "demo-9", provider_code: "HOP-MON-003", name: "Clinique Les Oliviers", phone: "+216 71 901 234", type: "hospital" as const, address: "Route de Sousse, Monastir", invoices_processed: 28934, error_rate: 1.5, status: "approved" as const },
                    { id: "demo-10", provider_code: "MED-GAB-201", name: "Dr. Karim Mejri", phone: "+216 96 789 012", type: "doctor" as const, address: "Rue Ibn Khaldoun, Gabès", invoices_processed: 5678, error_rate: 2.1, status: "pending" as const },
                    ...filteredProviders.map(p => ({
                      id: p.id,
                      provider_code: p.provider_code,
                      name: p.name,
                      phone: p.phone,
                      type: p.type,
                      address: p.address,
                      invoices_processed: p.invoices_processed,
                      error_rate: p.error_rate,
                      status: p.status,
                    }))
                  ].map((provider) => {
                    const type = typeConfig[provider.type];
                    const TypeIcon = type.icon;
                    const status = statusConfig[provider.status];
                    const StatusIcon = status.icon;
                    return (
                      <tr key={provider.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-primary">{provider.provider_code}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn("h-10 w-10 rounded-xl bg-muted flex items-center justify-center", type.color)}>
                              <TypeIcon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{provider.name}</p>
                              <p className="text-xs text-muted-foreground">{provider.phone || "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm">{type.label}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            {provider.address}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-semibold">
                            {(provider.invoices_processed || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={cn(
                            "text-sm font-medium",
                            (provider.error_rate || 0) > 3 ? "text-destructive" :
                            (provider.error_rate || 0) > 1.5 ? "text-warning" : "text-success"
                          )}>
                            {provider.error_rate || 0}%
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(status.className, "flex items-center gap-1.5 w-fit")}>
                            <StatusIcon className="h-3.5 w-3.5" />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Dialog */}
        <ProviderDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          provider={selectedProvider}
          onSuccess={fetchProviders}
        />
      </div>
    </DashboardLayout>
  );
}
