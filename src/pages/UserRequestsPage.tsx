import { useState } from "react";
import { useUserDashboardData } from "@/hooks/useUserDashboardData";
import { UserDashboardLayout } from "@/components/layout/UserDashboardLayout";
import { UserRequestsTab } from "@/components/user-dashboard/UserRequestsTab";
import { UserSubmitRequestDialog } from "@/components/user-dashboard/UserSubmitRequestDialog";

export default function UserRequestsPage() {
  const { reimbursements, memberRecord, loading, getStatusBadge, fetchData } = useUserDashboardData();
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  return (
    <UserDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mes demandes</h1>
          <p className="text-muted-foreground">Suivez vos demandes de remboursement</p>
        </div>
        <UserRequestsTab
          reimbursements={reimbursements}
          loading={loading}
          getStatusBadge={getStatusBadge}
          onNewRequest={() => setShowSubmitDialog(true)}
        />
      </div>
      <UserSubmitRequestDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog} memberId={memberRecord?.id} onSuccess={fetchData} />
    </UserDashboardLayout>
  );
}
