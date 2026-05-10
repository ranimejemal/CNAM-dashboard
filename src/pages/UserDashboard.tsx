import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserDashboardData } from "@/hooks/useUserDashboardData";
import { UserDashboardLayout } from "@/components/layout/UserDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, Clock, CheckCircle, FileText, AlertCircle, Shield } from "lucide-react";
import { UserSubmitRequestDialog } from "@/components/user-dashboard/UserSubmitRequestDialog";
import { UserDocumentUploadDialog } from "@/components/user-dashboard/UserDocumentUploadDialog";
import { UserOverviewTab } from "@/components/user-dashboard/UserOverviewTab";

export default function UserDashboard() {
  const { profile } = useAuth();
  const { reimbursements, events, memberRecord, loading, stats, getStatusBadge, fetchData } = useUserDashboardData();
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const accountStatus = memberRecord?.status || "pending";

  return (
    <UserDashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bienvenue, {profile?.first_name || "Assuré"}</h1>
            <p className="text-muted-foreground">Votre espace personnel CNAM – Gérez vos demandes et documents</p>
          </div>
          <Badge variant="outline" className="gap-1.5 py-1.5 px-3 w-fit">
            <Shield className="h-3.5 w-3.5" />
            Statut: {accountStatus === "active" ? "Actif" : accountStatus === "suspended" ? "Suspendu" : "En attente"}
          </Badge>
        </div>

        {accountStatus !== "active" && (
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                <div>
                  <p className="font-medium text-warning">Compte en attente de validation</p>
                  <p className="text-sm text-muted-foreground mt-1">Votre compte est en cours de vérification.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Mes demandes", value: stats.total, icon: Receipt, color: "primary" },
            { label: "En attente", value: stats.pending, icon: Clock, color: "warning" },
            { label: "Approuvées", value: stats.approved, icon: CheckCircle, color: "success" },
            { label: "Documents", value: stats.totalDocs, icon: FileText, color: "info" },
          ].map((s) => (
            <Card key={s.label} className="stat-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg bg-${s.color}/10 flex items-center justify-center`}>
                    <s.icon className={`h-5 w-5 text-${s.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-2xl font-bold">{s.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <UserOverviewTab
          reimbursements={reimbursements}
          events={events}
          loading={loading}
          getStatusBadge={getStatusBadge}
          onNewRequest={() => setShowSubmitDialog(true)}
          onUploadDocument={() => setShowUploadDialog(true)}
        />
      </div>

      <UserSubmitRequestDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog} memberId={memberRecord?.id} onSuccess={fetchData} />
      <UserDocumentUploadDialog open={showUploadDialog} onOpenChange={setShowUploadDialog} memberId={memberRecord?.id} onSuccess={fetchData} />
    </UserDashboardLayout>
  );
}
