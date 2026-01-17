import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Metric {
  label: string;
  value: string;
  change: number;
  period: string;
}

const metrics: Metric[] = [
  { label: "Transactions", value: "156,847", change: 23.5, period: "ce mois" },
  { label: "Volume traité", value: "12.4M TND", change: 18.2, period: "ce mois" },
  { label: "Dossiers clos", value: "8,234", change: 5.7, period: "cette semaine" },
  { label: "Tickets support", value: "342", change: -12.3, period: "ce mois" },
  { label: "Temps moyen", value: "2.4 jours", change: -8.5, period: "amélioration" },
  { label: "Satisfaction", value: "94.2%", change: 2.1, period: "vs trimestre" },
];

export function QuickMetrics() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {metrics.map((metric) => (
        <div 
          key={metric.label} 
          className="stat-card p-4 hover:shadow-lg transition-shadow"
        >
          <p className="text-xs text-muted-foreground mb-1">{metric.label}</p>
          <p className="text-xl font-bold mb-2">{metric.value}</p>
          <div className="flex items-center gap-1">
            {metric.change > 0 ? (
              <ArrowUpRight className="h-3 w-3 text-success" />
            ) : metric.change < 0 ? (
              <ArrowDownRight className="h-3 w-3 text-destructive" />
            ) : (
              <Minus className="h-3 w-3 text-muted-foreground" />
            )}
            <span className={cn(
              "text-xs font-medium",
              metric.change > 0 ? "text-success" : 
              metric.change < 0 ? "text-destructive" : "text-muted-foreground"
            )}>
              {metric.change > 0 ? "+" : ""}{metric.change}%
            </span>
            <span className="text-xs text-muted-foreground">{metric.period}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
