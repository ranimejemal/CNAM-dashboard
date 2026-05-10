import { useState } from "react";
import { usePrestataireDashboardData } from "@/hooks/usePrestataireDashboardData";
import { PrestataireDashboardLayout } from "@/components/layout/PrestataireDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function PrestataireDemandesPage() {
  const { reimbursements, loading, getStatusBadge } = usePrestataireDashboardData();
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = reimbursements.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.reference_number?.toLowerCase().includes(q) || r.insured_member?.first_name?.toLowerCase().includes(q) || r.insured_member?.last_name?.toLowerCase().includes(q) || r.insured_member?.insurance_number?.toLowerCase().includes(q);
  });

  const handleExportCSV = () => {
    const csv = [
      ["Référence", "Patient", "N° Assurance", "Type", "Montant", "Statut", "Date"],
      ...filtered.map(r => [r.reference_number, r.insured_member ? `${r.insured_member.first_name} ${r.insured_member.last_name}` : "", r.insured_member?.insurance_number || "", r.service_type, r.amount_requested, r.status, format(new Date(r.created_at), "dd/MM/yyyy")]),
    ].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `remboursements-prestataire-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PrestataireDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Demandes</h1>
          <p className="text-muted-foreground">Gérez les demandes de remboursement</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher par patient, référence..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" /> Exporter CSV
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Aucune demande trouvée</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="table-header border-y border-border">
                      <th className="px-4 py-3 text-left text-xs">Référence</th>
                      <th className="px-4 py-3 text-left text-xs">Patient</th>
                      <th className="px-4 py-3 text-left text-xs">N° Assurance</th>
                      <th className="px-4 py-3 text-left text-xs">Service</th>
                      <th className="px-4 py-3 text-right text-xs">Montant</th>
                      <th className="px-4 py-3 text-left text-xs">Statut</th>
                      <th className="px-4 py-3 text-left text-xs">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-primary">{r.reference_number}</td>
                        <td className="px-4 py-3 text-sm">{r.insured_member ? `${r.insured_member.first_name} ${r.insured_member.last_name}` : "—"}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{r.insured_member?.insurance_number || "—"}</td>
                        <td className="px-4 py-3 text-sm">{r.service_type}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{Number(r.amount_requested).toFixed(2)} TND</td>
                        <td className="px-4 py-3">{getStatusBadge(r.status)}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{format(new Date(r.created_at), "dd/MM/yyyy")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PrestataireDashboardLayout>
  );
}
