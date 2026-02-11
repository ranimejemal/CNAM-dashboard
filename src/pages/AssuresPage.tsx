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
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MemberDialog } from "@/components/members/MemberDialog";
import type { Database } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type InsuredMember = Database["public"]["Tables"]["insured_members"]["Row"];

const statusConfig = {
  active: {
    label: "Actif",
    icon: CheckCircle,
    className: "badge-success",
  },
  suspended: {
    label: "Suspendu",
    icon: Clock,
    className: "badge-warning",
  },
  expired: {
    label: "Expiré",
    icon: XCircle,
    className: "badge-destructive",
  },
};

export default function AssuresPage() {
  const [members, setMembers] = useState<InsuredMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<InsuredMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<InsuredMember | null>(null);
  const { toast } = useToast();

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("insured_members")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMembers(data || []);
      setFilteredMembers(data || []);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les assurés." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    let filtered = members;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.first_name.toLowerCase().includes(query) ||
          m.last_name.toLowerCase().includes(query) ||
          m.cin.toLowerCase().includes(query) ||
          m.insurance_number.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((m) => m.status === statusFilter);
    }

    setFilteredMembers(filtered);
  }, [searchQuery, statusFilter, members]);

  const handleEdit = (member: InsuredMember) => {
    setSelectedMember(member);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedMember(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (member: InsuredMember) => {
    if (!confirm(`Supprimer l'assuré ${member.first_name} ${member.last_name} ?`)) return;

    try {
      const { error } = await supabase.from("insured_members").delete().eq("id", member.id);
      if (error) throw error;
      toast({ title: "Succès", description: "Assuré supprimé." });
      fetchMembers();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    }
  };

  const handleExport = () => {
    const csv = [
      ["N° Assurance", "Prénom", "Nom", "CIN", "Date de naissance", "Téléphone", "Email", "Statut"],
      ...filteredMembers.map((m) => [
        m.insurance_number,
        m.first_name,
        m.last_name,
        m.cin,
        m.date_of_birth,
        m.phone || "",
        m.email || "",
        m.status,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assures-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export réussi", description: `${filteredMembers.length} assurés exportés.` });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gestion des assurés</h1>
            <p className="text-muted-foreground">
              Gérez les comptes des assurés et leurs informations
            </p>
          </div>
          <Button className="gap-2" onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            Nouvel assuré
          </Button>
        </div>

        {/* Filters */}
        <div className="stat-card">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, CIN ou numéro d'assurance..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="suspended">Suspendu</SelectItem>
                <SelectItem value="expired">Expiré</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Exporter
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="stat-card">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Aucun assuré trouvé.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-6">
                <table className="w-full">
                  <thead>
                    <tr className="table-header border-y border-border">
                      <th className="px-6 py-3 text-left">N° Assurance</th>
                      <th className="px-6 py-3 text-left">Nom complet</th>
                      <th className="px-6 py-3 text-left">CIN</th>
                      <th className="px-6 py-3 text-left">Date de naissance</th>
                      <th className="px-6 py-3 text-left">Téléphone</th>
                      <th className="px-6 py-3 text-left">Statut</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredMembers.map((member) => {
                      const status = statusConfig[member.status];
                      const StatusIcon = status.icon;
                      return (
                        <tr key={member.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-primary">
                              {member.insurance_number}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-medium text-primary">
                                  {member.first_name[0]}{member.last_name[0]}
                                </span>
                              </div>
                              <span className="text-sm font-medium">
                                {member.first_name} {member.last_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-muted-foreground">{member.cin}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(member.date_of_birth), "dd/MM/yyyy")}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-muted-foreground">
                              {member.phone || "—"}
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
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(member)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(member)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(member)}>
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

              {/* Pagination Info */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Affichage de {filteredMembers.length} assuré{filteredMembers.length > 1 ? "s" : ""}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Dialog */}
        <MemberDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          member={selectedMember}
          onSuccess={fetchMembers}
        />
      </div>
    </DashboardLayout>
  );
}
