import { useState } from "react";
import { useUserDashboardData } from "@/hooks/useUserDashboardData";
import { UserDashboardLayout } from "@/components/layout/UserDashboardLayout";
import { UserDocumentsTab } from "@/components/user-dashboard/UserDocumentsTab";
import { UserDocumentUploadDialog } from "@/components/user-dashboard/UserDocumentUploadDialog";

export default function UserDocumentsPage() {
  const { documents, memberRecord, loading, getStatusBadge, fetchData } = useUserDashboardData();
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  return (
    <UserDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mes documents</h1>
          <p className="text-muted-foreground">Gérez et soumettez vos documents</p>
        </div>
        <UserDocumentsTab
          documents={documents}
          loading={loading}
          getStatusBadge={getStatusBadge}
          onUpload={() => setShowUploadDialog(true)}
        />
      </div>
      <UserDocumentUploadDialog open={showUploadDialog} onOpenChange={setShowUploadDialog} memberId={memberRecord?.id} onSuccess={fetchData} />
    </UserDashboardLayout>
  );
}
