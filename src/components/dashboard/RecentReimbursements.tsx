import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal, Eye, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Reimbursement {
  id: string;
  reference_number: string;
  insured_member: {
    first_name: string;
    last_name: string;
  } | null;
  service_type: string;
  amount_requested: number;
  created_at: string;
  status: "approved" | "pending" | "rejected" | "processing";
}

const statusConfig = {
  approved: {
    label: "Approuvé",
    icon: CheckCircle,
    className: "badge-success",
  },
  pending: {
    label: "En attente",
    icon: Clock,
    className: "badge-warning",
  },
  processing: {
    label: "En cours",
    icon: Clock,
    className: "badge-info",
  },
  rejected: {
    label: "Rejeté",
    icon: XCircle,
    className: "badge-destructive",
  },
};

export function RecentReimbursements() {
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReimbursements = async () => {
      try {
        const { data, error } = await supabase
          .from("reimbursements")
          .select(`
            id,
            reference_number,
            service_type,
            amount_requested,
            created_at,
            status,
            insured_member:insured_members(first_name, last_name)
          `)
          .order("created_at", { ascending: false })
          .limit(5);

        if (error) throw error;
        
        setReimbursements((data || []).map(r => ({
          ...r,
          status: r.status as "approved" | "pending" | "rejected" | "processing"
        })));
      } catch (error) {
        console.error("Error fetching reimbursements:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReimbursements();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("recent_reimbursements")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reimbursements" },
        () => {
          fetchReimbursements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="stat-card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Derniers remboursements</h3>
          <p className="text-sm text-muted-foreground">5 dernières demandes</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/remboursements")}>
          Voir tout
        </Button>
      </div>
      {reimbursements.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Aucun remboursement récent
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6">
          <table className="w-full">
            <thead>
              <tr className="table-header border-y border-border">
                <th className="px-6 py-3 text-left">Référence</th>
                <th className="px-6 py-3 text-left">Assuré</th>
                <th className="px-6 py-3 text-left">Type</th>
                <th className="px-6 py-3 text-right">Montant</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Statut</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reimbursements.map((item) => {
                const status = statusConfig[item.status] || statusConfig.pending;
                const StatusIcon = status.icon;
                return (
                  <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-primary">{item.reference_number}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium">
                        {item.insured_member
                          ? `${item.insured_member.first_name} ${item.insured_member.last_name}`
                          : "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">{item.service_type}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-semibold">
                        {Number(item.amount_requested).toFixed(2)} TND
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(item.created_at), "d MMM yyyy", { locale: fr })}
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
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
