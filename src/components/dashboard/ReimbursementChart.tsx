import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartData {
  month: string;
  remboursements: number;
  demandes: number;
}

interface ReimbursementChartProps {
  data?: ChartData[];
  loading?: boolean;
}

export function ReimbursementChart({ data, loading }: ReimbursementChartProps) {
  if (loading) {
    return (
      <div className="stat-card h-[400px]">
        <div className="mb-6">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-[280px] w-full" />
      </div>
    );
  }

  const chartData = data || [];
  const hasData = chartData.some(d => d.demandes > 0 || d.remboursements > 0);

  if (!hasData && chartData.length > 0) {
    return (
      <div className="stat-card h-[400px]">
        <div className="mb-6">
          <h3 className="text-lg font-semibold">Évolution des remboursements</h3>
          <p className="text-sm text-muted-foreground">
            Comparaison demandes vs remboursements (en TND)
          </p>
        </div>
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          <div className="text-center">
            <p className="text-lg font-medium">Aucune donnée disponible</p>
            <p className="text-sm">Les remboursements apparaîtront ici une fois créés</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stat-card h-[400px]">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Évolution des remboursements</h3>
        <p className="text-sm text-muted-foreground">
          Comparaison demandes vs remboursements (en TND)
        </p>
      </div>
      <div className="flex gap-6 mb-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-primary" />
          <span className="text-sm text-muted-foreground">Remboursements</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-accent" />
          <span className="text-sm text-muted-foreground">Demandes</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRemboursements" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(217, 91%, 40%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(217, 91%, 40%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorDemandes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(174, 72%, 40%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(174, 72%, 40%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(215, 16%, 47%)", fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(215, 16%, 47%)", fontSize: 12 }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(0, 0%, 100%)",
              border: "1px solid hsl(214, 32%, 91%)",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
            formatter={(value: number) => [`${value.toLocaleString()} TND`, ""]}
          />
          <Area
            type="monotone"
            dataKey="demandes"
            stroke="hsl(174, 72%, 40%)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorDemandes)"
          />
          <Area
            type="monotone"
            dataKey="remboursements"
            stroke="hsl(217, 91%, 40%)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRemboursements)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
