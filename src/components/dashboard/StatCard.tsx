import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  variant?: "default" | "primary" | "accent" | "success" | "warning";
}

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  variant = "default",
}: StatCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  const cardClasses = {
    default: "stat-card",
    primary: "stat-card-primary",
    accent: "stat-card-accent",
    success: "stat-card-success",
    warning: "stat-card-warning",
  };

  const iconBgClasses = {
    default: "bg-primary/10",
    primary: "bg-white/20",
    accent: "bg-white/20",
    success: "bg-white/20",
    warning: "bg-white/20",
  };

  const iconColorClasses = {
    default: "text-primary",
    primary: "text-white",
    accent: "text-white",
    success: "text-white",
    warning: "text-white",
  };

  return (
    <div className={cn(cardClasses[variant], "animate-fade-in")}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className={cn(
            "text-sm font-medium",
            variant === "default" ? "text-muted-foreground" : "opacity-90"
          )}>
            {title}
          </p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1">
              {isPositive && <TrendingUp className="h-4 w-4 text-success" />}
              {isNegative && <TrendingDown className="h-4 w-4 text-destructive" />}
              <span
                className={cn(
                  "text-sm font-medium",
                  variant === "default" && isPositive && "text-success",
                  variant === "default" && isNegative && "text-destructive",
                  variant !== "default" && "opacity-90"
                )}
              >
                {isPositive && "+"}
                {change}%
              </span>
              {changeLabel && (
                <span className={cn(
                  "text-sm",
                  variant === "default" ? "text-muted-foreground" : "opacity-75"
                )}>
                  {changeLabel}
                </span>
              )}
            </div>
          )}
        </div>
        <div className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl",
          iconBgClasses[variant]
        )}>
          <Icon className={cn("h-6 w-6", iconColorClasses[variant])} />
        </div>
      </div>
    </div>
  );
}
