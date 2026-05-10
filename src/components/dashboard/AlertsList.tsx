import { AlertTriangle, AlertCircle, Info, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface Alert {
  id: string;
  type: "warning" | "error" | "info";
  title: string;
  description: string;
  time: string;
}

interface AlertsListProps {
  alerts?: Alert[];
  loading?: boolean;
}

const alertIcons = {
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
};

const alertClasses = {
  warning: "alert-card-warning",
  error: "alert-card-destructive",
  info: "alert-card-info",
};

const iconClasses = {
  warning: "text-warning",
  error: "text-destructive",
  info: "text-info",
};

export function AlertsList({ alerts = [], loading }: AlertsListProps) {
  if (loading) {
    return (
      <div className="stat-card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Alertes importantes</h3>
          <p className="text-sm text-muted-foreground">Nécessitent votre attention</p>
        </div>
        {alerts.length > 0 && (
          <span className="badge-warning">{alerts.length} actives</span>
        )}
      </div>
      {alerts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Aucune alerte pour le moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const Icon = alertIcons[alert.type];
            return (
              <div
                key={alert.id}
                className={cn(alertClasses[alert.type], "animate-fade-in cursor-pointer hover:shadow-md transition-shadow")}
              >
                <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", iconClasses[alert.type])} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{alert.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{alert.description}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {alert.time}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
