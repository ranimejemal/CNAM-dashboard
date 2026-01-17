import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { ReimbursementChart } from "@/components/dashboard/ReimbursementChart";
import { DistributionChart } from "@/components/dashboard/DistributionChart";
import { AlertsList } from "@/components/dashboard/AlertsList";
import { RecentReimbursements } from "@/components/dashboard/RecentReimbursements";
import { KPIIndicators } from "@/components/dashboard/KPIIndicators";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { UserGrowthChart } from "@/components/dashboard/UserGrowthChart";
import { LiveStats } from "@/components/dashboard/LiveStats";
import { RegionalStats } from "@/components/dashboard/RegionalStats";
import { QuickMetrics } from "@/components/dashboard/QuickMetrics";
import { Users, Building2, Receipt, TrendingUp, FileText, CreditCard } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const { stats, chartData, distributionData, alerts, loading } = useDashboardData();

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return num.toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M TND`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K TND`;
    }
    return `${amount.toFixed(0)} TND`;
  };

  // Enhanced stats with higher numbers for demo
  const enhancedStats = {
    totalMembers: stats?.totalMembers ? stats.totalMembers + 81500 : 81500,
    totalProviders: stats?.totalProviders ? stats.totalProviders + 2847 : 2847,
    monthlyReimbursementAmount: stats?.monthlyReimbursementAmount ? stats.monthlyReimbursementAmount + 4250000 : 4250000,
    processingRate: stats?.processingRate || 94.2,
    membersChange: 12.5,
    providersChange: 8.3,
    reimbursementsChange: 15.7,
    totalDocuments: 156847,
    totalTransactions: 892456,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Vue d'ensemble</h1>
          <p className="text-muted-foreground">
            Bienvenue sur le tableau de bord CNAM. Voici un aperçu de l'activité.
          </p>
        </div>

        {/* Quick Metrics Row */}
        <QuickMetrics />

        {/* Main Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {loading ? (
            <>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="stat-card">
                  <Skeleton className="h-20 w-full" />
                </div>
              ))}
            </>
          ) : (
            <>
              <StatCard
                title="Assurés actifs"
                value={formatNumber(enhancedStats.totalMembers)}
                change={enhancedStats.membersChange}
                changeLabel="ce mois"
                icon={Users}
                variant="primary"
              />
              <StatCard
                title="Prestataires"
                value={formatNumber(enhancedStats.totalProviders)}
                change={enhancedStats.providersChange}
                changeLabel="ce mois"
                icon={Building2}
                variant="accent"
              />
              <StatCard
                title="Remboursements"
                value={formatCurrency(enhancedStats.monthlyReimbursementAmount)}
                change={enhancedStats.reimbursementsChange}
                changeLabel="vs mois dernier"
                icon={Receipt}
                variant="success"
              />
              <StatCard
                title="Taux traitement"
                value={`${enhancedStats.processingRate}%`}
                change={2.1}
                changeLabel="vs objectif"
                icon={TrendingUp}
                variant="warning"
              />
              <StatCard
                title="Documents"
                value={formatNumber(enhancedStats.totalDocuments)}
                change={9.4}
                changeLabel="ce mois"
                icon={FileText}
                variant="default"
              />
              <StatCard
                title="Transactions"
                value={formatNumber(enhancedStats.totalTransactions)}
                change={18.2}
                changeLabel="ce mois"
                icon={CreditCard}
                variant="default"
              />
            </>
          )}
        </div>

        {/* Live Stats Section */}
        <LiveStats />

        {/* Charts Row - Main */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ReimbursementChart data={chartData} loading={loading} />
          </div>
          <div>
            <DistributionChart data={distributionData} loading={loading} />
          </div>
        </div>

        {/* Growth and Activity Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <UserGrowthChart loading={loading} />
          <ActivityChart loading={loading} />
        </div>

        {/* Regional Stats and KPIs */}
        <div className="grid gap-6 lg:grid-cols-2">
          <RegionalStats />
          <KPIIndicators />
        </div>

        {/* Alerts */}
        <AlertsList alerts={alerts} loading={loading} />

        {/* Recent Activity Table */}
        <RecentReimbursements />
      </div>
    </DashboardLayout>
  );
};

export default Index;
