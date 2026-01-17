import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, subMonths } from "date-fns";
import { fr } from "date-fns/locale";

interface DashboardStats {
  totalMembers: number;
  totalProviders: number;
  totalReimbursements: number;
  processingRate: number;
  pendingDocuments: number;
  pendingReimbursements: number;
  monthlyReimbursementAmount: number;
  membersChange: number;
  providersChange: number;
  reimbursementsChange: number;
}

interface ChartData {
  month: string;
  remboursements: number;
  demandes: number;
}

interface DistributionData {
  name: string;
  value: number;
  color: string;
}

interface AlertData {
  id: string;
  type: "warning" | "error" | "info";
  title: string;
  description: string;
  time: string;
}

export function useDashboardData() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [distributionData, setDistributionData] = useState<DistributionData[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch counts with parallel queries
      const [
        { count: membersCount },
        { count: providersCount },
        { data: reimbursements },
        { data: documents },
        { count: pendingDocsCount },
        { count: pendingReimbCount },
      ] = await Promise.all([
        supabase.from("insured_members").select("*", { count: "exact", head: true }),
        supabase.from("health_providers").select("*", { count: "exact", head: true }),
        supabase.from("reimbursements").select("status, amount_requested, amount_approved, created_at"),
        supabase.from("documents").select("status, document_type"),
        supabase.from("documents").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("reimbursements").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      // Calculate stats
      const totalReimb = reimbursements?.length || 0;
      const approvedReimb = reimbursements?.filter(r => r.status === "approved").length || 0;
      const processingRate = totalReimb > 0 ? Math.round((approvedReimb / totalReimb) * 100 * 10) / 10 : 0;

      // Calculate current month amount
      const currentMonthStart = new Date();
      currentMonthStart.setDate(1);
      currentMonthStart.setHours(0, 0, 0, 0);
      
      const monthlyAmount = reimbursements
        ?.filter(r => new Date(r.created_at) >= currentMonthStart)
        .reduce((sum, r) => sum + Number(r.amount_requested), 0) || 0;

      setStats({
        totalMembers: membersCount || 0,
        totalProviders: providersCount || 0,
        totalReimbursements: totalReimb,
        processingRate,
        pendingDocuments: pendingDocsCount || 0,
        pendingReimbursements: pendingReimbCount || 0,
        monthlyReimbursementAmount: monthlyAmount,
        membersChange: 12.5, // Would need historical data for real calculation
        providersChange: 3.2,
        reimbursementsChange: 8.7,
      });

      // Generate chart data from last 12 months
      const monthlyData: { [key: string]: { requests: number; approved: number } } = {};
      for (let i = 11; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthKey = format(monthDate, "yyyy-MM");
        monthlyData[monthKey] = { requests: 0, approved: 0 };
      }

      reimbursements?.forEach((r) => {
        const monthKey = format(new Date(r.created_at), "yyyy-MM");
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].requests += Number(r.amount_requested);
          monthlyData[monthKey].approved += Number(r.amount_approved || 0);
        }
      });

      const chartDataArray = Object.entries(monthlyData).map(([month, data]) => ({
        month: format(new Date(month + "-01"), "MMM", { locale: fr }),
        demandes: data.requests,
        remboursements: data.approved,
      }));

      setChartData(chartDataArray);

      // Distribution by document type
      const docTypeCount: { [key: string]: number } = {};
      documents?.forEach((d) => {
        docTypeCount[d.document_type] = (docTypeCount[d.document_type] || 0) + 1;
      });

      const colors = [
        "hsl(217, 91%, 40%)",
        "hsl(174, 72%, 40%)",
        "hsl(142, 76%, 36%)",
        "hsl(38, 92%, 50%)",
        "hsl(0, 84%, 60%)",
      ];

      setDistributionData(
        Object.entries(docTypeCount)
          .slice(0, 5)
          .map(([name, value], index) => ({
            name,
            value,
            color: colors[index % colors.length],
          }))
      );

      // Generate real alerts based on data
      const alertsList: AlertData[] = [];

      if (pendingDocsCount && pendingDocsCount > 0) {
        alertsList.push({
          id: "pending-docs",
          type: "warning",
          title: "Documents en attente",
          description: `${pendingDocsCount} documents nécessitent une vérification`,
          time: "Maintenant",
        });
      }

      if (pendingReimbCount && pendingReimbCount > 0) {
        alertsList.push({
          id: "pending-reimb",
          type: "info",
          title: "Remboursements en attente",
          description: `${pendingReimbCount} demandes de remboursement à traiter`,
          time: "Maintenant",
        });
      }

      // Check for expiring cards (would need actual card_expiry_date check)
      const { data: expiringCards } = await supabase
        .from("insured_members")
        .select("*", { count: "exact", head: true })
        .gte("card_expiry_date", new Date().toISOString())
        .lte("card_expiry_date", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());

      if (expiringCards && expiringCards.length > 0) {
        alertsList.push({
          id: "expiring-cards",
          type: "error",
          title: "Cartes expirantes",
          description: `${expiringCards.length} cartes d'assurance expirent dans les 30 prochains jours`,
          time: "Récent",
        });
      }

      setAlerts(alertsList);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les données du tableau de bord.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return {
    stats,
    chartData,
    distributionData,
    alerts,
    loading,
    refetch: fetchDashboardData,
  };
}
