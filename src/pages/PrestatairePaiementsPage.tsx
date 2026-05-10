import { usePrestataireDashboardData } from "@/hooks/usePrestataireDashboardData";
import { PrestataireDashboardLayout } from "@/components/layout/PrestataireDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function PrestatairePaiementsPage() {
  const { reimbursements, loading, getStatusBadge } = usePrestataireDashboardData();
  const approved = reimbursements.filter(r => r.status === "approved");

  return (
    <PrestataireDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Paiements</h1>
          <p className="text-muted-foreground">Historique des paiements reçus</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : approved.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Aucun paiement enregistré</div>
            ) : (
              <div className="space-y-3">
                {approved.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{r.reference_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.insured_member ? `${r.insured_member.first_name} ${r.insured_member.last_name}` : "—"} · {r.service_type}
                      </p>
                    </div>
                    <p className="font-semibold text-success">{Number(r.amount_approved || 0).toFixed(2)} TND</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PrestataireDashboardLayout>
  );
}
