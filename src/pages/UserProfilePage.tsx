import { useUserDashboardData } from "@/hooks/useUserDashboardData";
import { UserDashboardLayout } from "@/components/layout/UserDashboardLayout";
import { UserProfileTab } from "@/components/user-dashboard/UserProfileTab";

export default function UserProfilePage() {
  const { memberRecord, getStatusBadge, fetchData } = useUserDashboardData();

  return (
    <UserDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mon profil</h1>
          <p className="text-muted-foreground">Gérez vos informations personnelles</p>
        </div>
        <UserProfileTab memberRecord={memberRecord} getStatusBadge={getStatusBadge} onRefresh={fetchData} />
      </div>
    </UserDashboardLayout>
  );
}
