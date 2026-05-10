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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Plus,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  FileCheck,
  FileX,
  Receipt,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ReimbursementDialog } from "@/components/reimbursements/ReimbursementDialog";
import type { Database } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type Reimbursement = Database["public"]["Tables"]["reimbursements"]["Row"] & {
  insured_member?: { first_name: string; last_name: string } | null;
  provider?: { name: string } | null;
};

const statusConfig = {
  approved: {
    label: "Approuvé",
    icon: CheckCircle,
    className: "badge-success",
  },
  pending: {
    label: "En attente",
    icon: Clock,
    className: "badge-warning",
  },
  processing: {
    label: "En traitement",
    icon: AlertCircle,
    className: "badge-info",
  },
  rejected: {
    label: "Rejeté",
    icon: XCircle,
    className: "badge-destructive",
  },
};

export default function RemboursementsPage() {
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [filteredReimbursements, setFilteredReimbursements] = useState<Reimbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedReimbursement, setSelectedReimbursement] = useState<Reimbursement | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "approve" | "reject">("create");
  const [members, setMembers] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [providers, setProviders] = useState<{ id: string; name: string }[]>([]);
  const { toast } = useToast();

  const fetchReimbursements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("reimbursements")
        .select(`
          *,
          insured_member:insured_members(first_name, last_name),
          provider:health_providers(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReimbursements(data || []);
      setFilteredReimbursements(data || []);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les remboursements." });
    } finally {
      setLoading(false);
    }
  };

  const fetchLookupData = async () => {
    const [membersRes, providersRes] = await Promise.all([
      supabase.from("insured_members").select("id, first_name, last_name").order("last_name"),
      supabase.from("health_providers").select("id, name").eq("status", "approved").order("name"),
    ]);
    setMembers(membersRes.data || []);
    setProviders(providersRes.data || []);
  };

  useEffect(() => {
    fetchReimbursements();
    fetchLookupData();
  }, []);

  useEffect(() => {
    let filtered = reimbursements;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.reference_number.toLowerCase().includes(query) ||
          r.insured_member?.first_name.toLowerCase().includes(query) ||
          r.insured_member?.last_name.toLowerCase().includes(query) ||
          r.provider?.name.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    setFilteredReimbursements(filtered);
  }, [searchQuery, statusFilter, reimbursements]);

  const handleCreate = () => {
    setSelectedReimbursement(null);
    setDialogMode("create");
    setIsDialogOpen(true);
  };

  const handleApprove = (reimbursement: Reimbursement) => {
    setSelectedReimbursement(reimbursement);
    setDialogMode("approve");
    setIsDialogOpen(true);
  };

  const handleReject = (reimbursement: Reimbursement) => {
    setSelectedReimbursement(reimbursement);
    setDialogMode("reject");
    setIsDialogOpen(true);
  };

  const handleView = (reimbursement: Reimbursement) => {
    setSelectedReimbursement(reimbursement);
    setDialogMode("edit");
    setIsDialogOpen(true);
  };

  const handleExport = () => {
    const csv = [
      ["Référence", "Assuré", "Prestataire", "Type", "Montant demandé", "Montant approuvé", "Statut", "Date"],
      ...filteredReimbursements.map((r) => [
        r.reference_number,
        r.insured_member ? `${r.insured_member.first_name} ${r.insured_member.last_name}` : "",
        r.provider?.name || "",
        r.service_type,
        r.amount_requested,
        r.amount_approved || "",
        r.status,
        format(new Date(r.created_at), "dd/MM/yyyy"),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `remboursements-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export réussi", description: `${filteredReimbursements.length} remboursements exportés.` });
  };

  const stats = {
    total: reimbursements.length,
    pending: reimbursements.filter((r) => r.status === "pending").length,
    approved: reimbursements.filter((r) => r.status === "approved").length,
    rejected: reimbursements.filter((r) => r.status === "rejected").length,
  };

  const handleTabChange = (value: string) => {
    setStatusFilter(value);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Suivi des remboursements</h1>
            <p className="text-muted-foreground">
              Gérez et suivez les demandes de remboursement
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Exporter
            </Button>
            <Button className="gap-2" onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              Nouvelle demande
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="stat-card flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total demandes</p>
            </div>
          </div>
          <div className="stat-card flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">En attente</p>
            </div>
          </div>
          <div className="stat-card flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
              <FileCheck className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.approved}</p>
              <p className="text-sm text-muted-foreground">Approuvés</p>
            </div>
          </div>
          <div className="stat-card flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <FileX className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.rejected}</p>
              <p className="text-sm text-muted-foreground">Rejetés</p>
            </div>
          </div>
        </div>

        {/* Tabs and Filters */}
        <Tabs value={statusFilter} onValueChange={handleTabChange} className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="all">Tous</TabsTrigger>
              <TabsTrigger value="pending">En attente</TabsTrigger>
              <TabsTrigger value="processing">En traitement</TabsTrigger>
              <TabsTrigger value="approved">Approuvés</TabsTrigger>
              <TabsTrigger value="rejected">Rejetés</TabsTrigger>
            </TabsList>
          </div>

          <div className="stat-card">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par ID, assuré ou prestataire..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredReimbursements.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Aucun remboursement trouvé.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6">
                <table className="w-full">
                  <thead>
                    <tr className="table-header border-y border-border">
                      <th className="px-6 py-3 text-left">Référence</th>
                      <th className="px-6 py-3 text-left">Assuré</th>
                      <th className="px-6 py-3 text-left">Type</th>
                      <th className="px-6 py-3 text-left">Prestataire</th>
                      <th className="px-6 py-3 text-right">Demandé</th>
                      <th className="px-6 py-3 text-right">Approuvé</th>
                      <th className="px-6 py-3 text-left">Date</th>
                      <th className="px-6 py-3 text-left">Statut</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredReimbursements.map((item) => {
                      const status = statusConfig[item.status];
                      const StatusIcon = status.icon;
                      return (
                        <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-primary">{item.reference_number}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium">
                              {item.insured_member
                                ? `${item.insured_member.first_name} ${item.insured_member.last_name}`
                                : "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm">{item.service_type}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-muted-foreground">{item.provider?.name || "—"}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-medium">
                              {Number(item.amount_requested).toFixed(2)} TND
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={cn(
                              "text-sm font-semibold",
                              Number(item.amount_approved) > 0 ? "text-success" : "text-muted-foreground"
                            )}>
                              {Number(item.amount_approved) > 0 ? `${Number(item.amount_approved).toFixed(2)} TND` : "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(item.created_at), "dd MMM yyyy", { locale: fr })}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <span className={cn(status.className, "flex items-center gap-1.5 w-fit")}>
                                <StatusIcon className="h-3.5 w-3.5" />
                                {status.label}
                              </span>
                              {item.rejection_reason && (
                                <p className="text-xs text-destructive max-w-[200px] truncate" title={item.rejection_reason}>
                                  {item.rejection_reason}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(item)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {(item.status === "pending" || item.status === "processing") && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-success" onClick={() => handleApprove(item)}>
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleReject(item)}>
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
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
        </Tabs>

        {/* Dialog */}
        <ReimbursementDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          reimbursement={selectedReimbursement}
          members={members}
          providers={providers}
          onSuccess={fetchReimbursements}
          mode={dialogMode}
        />
      </div>
    </DashboardLayout>
  );
}
