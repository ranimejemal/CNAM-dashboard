import { useState, useEffect } from "react";
import { Users, Activity, Clock, Zap, Globe, Server } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveStat {
  label: string;
  value: number;
  icon: React.ElementType;
  suffix?: string;
  color: string;
  change: number;
}

export function LiveStats() {
  const [stats, setStats] = useState<LiveStat[]>([
    { label: "Utilisateurs en ligne", value: 1247, icon: Users, color: "text-success", change: 23 },
    { label: "Requêtes/min", value: 3842, icon: Activity, suffix: "/min", color: "text-primary", change: 156 },
    { label: "Temps de réponse", value: 142, icon: Clock, suffix: "ms", color: "text-accent", change: -12 },
    { label: "Taux de succès", value: 99.7, icon: Zap, suffix: "%", color: "text-success", change: 0.2 },
    { label: "Régions actives", value: 24, icon: Globe, color: "text-warning", change: 2 },
    { label: "Serveurs actifs", value: 12, icon: Server, color: "text-primary", change: 0 },
  ]);

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => prev.map(stat => ({
        ...stat,
        value: stat.label === "Taux de succès" 
          ? Math.min(100, Math.max(99, stat.value + (Math.random() - 0.5) * 0.2))
          : stat.label === "Temps de réponse"
          ? Math.max(80, stat.value + Math.floor((Math.random() - 0.5) * 20))
          : stat.label === "Utilisateurs en ligne"
          ? Math.max(800, stat.value + Math.floor((Math.random() - 0.5) * 50))
          : stat.label === "Requêtes/min"
          ? Math.max(2000, stat.value + Math.floor((Math.random() - 0.5) * 200))
          : stat.value,
        change: stat.label === "Utilisateurs en ligne" 
          ? Math.floor((Math.random() - 0.3) * 30)
          : stat.change,
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Statistiques en direct</h3>
          <p className="text-sm text-muted-foreground">Mise à jour en temps réel</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
          </span>
          <span className="text-xs text-success font-medium">LIVE</span>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div 
            key={stat.label} 
            className="bg-muted/50 rounded-lg p-3 transition-all duration-300 hover:bg-muted"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={cn("h-4 w-4", stat.color)} />
              <span className="text-xs text-muted-foreground truncate">{stat.label}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold">
                {stat.label === "Taux de succès" 
                  ? stat.value.toFixed(1) 
                  : stat.value.toLocaleString()}
              </span>
              {stat.suffix && (
                <span className="text-xs text-muted-foreground">{stat.suffix}</span>
              )}
            </div>
            {stat.change !== 0 && (
              <span className={cn(
                "text-xs",
                stat.change > 0 ? "text-success" : "text-destructive"
              )}>
                {stat.change > 0 ? "+" : ""}{stat.change}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
