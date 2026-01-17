import { Progress } from "@/components/ui/progress";

interface KPI {
  label: string;
  value: number;
  target: number;
  unit: string;
}

const kpis: KPI[] = [
  { label: "Taux de couverture", value: 87, target: 90, unit: "%" },
  { label: "Délai moyen de traitement", value: 3.2, target: 5, unit: "jours" },
  { label: "Satisfaction client", value: 92, target: 95, unit: "%" },
  { label: "Taux d'approbation", value: 78, target: 80, unit: "%" },
];

export function KPIIndicators() {
  return (
    <div className="stat-card">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Indicateurs clés de performance</h3>
        <p className="text-sm text-muted-foreground">Objectifs vs réalisations</p>
      </div>
      <div className="space-y-6">
        {kpis.map((kpi) => {
          const percentage = (kpi.value / kpi.target) * 100;
          const isOnTrack = percentage >= 95;
          const isWarning = percentage >= 80 && percentage < 95;
          
          return (
            <div key={kpi.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{kpi.label}</span>
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{kpi.value}</span>
                  {" / "}
                  {kpi.target} {kpi.unit}
                </span>
              </div>
              <Progress
                value={Math.min(percentage, 100)}
                className={`h-2 ${
                  isOnTrack
                    ? "[&>div]:bg-success"
                    : isWarning
                    ? "[&>div]:bg-warning"
                    : "[&>div]:bg-primary"
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
