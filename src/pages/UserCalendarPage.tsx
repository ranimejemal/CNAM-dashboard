import { useUserDashboardData } from "@/hooks/useUserDashboardData";
import { UserDashboardLayout } from "@/components/layout/UserDashboardLayout";
import { UserCalendarTab } from "@/components/user-dashboard/UserCalendarTab";

export default function UserCalendarPage() {
  const { events } = useUserDashboardData();

  return (
    <UserDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendrier</h1>
          <p className="text-muted-foreground">Consultez vos rendez-vous et événements</p>
        </div>
        <UserCalendarTab events={events} />
      </div>
    </UserDashboardLayout>
  );
}
