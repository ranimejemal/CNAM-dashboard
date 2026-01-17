import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";

interface GrowthData {
  month: string;
  nouveaux: number;
  actifs: number;
}

const generateGrowthData = (): GrowthData[] => {
  const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
  let baseActifs = 45000;
  
  return months.map((month, index) => {
    const growth = Math.floor(Math.random() * 2000) + 1500;
    baseActifs += growth;
    return {
      month,
      nouveaux: growth,
      actifs: baseActifs,
    };
  });
};

interface UserGrowthChartProps {
  loading?: boolean;
}

export function UserGrowthChart({ loading }: UserGrowthChartProps) {
  const data = generateGrowthData();
  const totalGrowth = data.reduce((sum, d) => sum + d.nouveaux, 0);
  const latestActifs = data[data.length - 1]?.actifs || 0;

  if (loading) {
    return (
      <div className="stat-card h-[350px]">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-[280px] w-full" />
      </div>
    );
  }

  return (
    <div className="stat-card h-[350px]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Croissance des utilisateurs</h3>
          <p className="text-sm text-muted-foreground">Nouveaux assurés par mois</p>
        </div>
        <div className="flex items-center gap-2 text-success">
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm font-medium">+{((totalGrowth / (latestActifs - totalGrowth)) * 100).toFixed(1)}%</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-primary/10 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Total actifs</p>
          <p className="text-xl font-bold text-primary">{(latestActifs / 1000).toFixed(0)}K</p>
        </div>
        <div className="bg-success/10 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Nouveaux (année)</p>
          <p className="text-xl font-bold text-success">+{(totalGrowth / 1000).toFixed(1)}K</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="month" 
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            formatter={(value: number) => [value.toLocaleString(), "Nouveaux"]}
          />
          <Bar dataKey="nouveaux" radius={[4, 4, 0, 0]}>
            {data.map((_, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={index === data.length - 1 ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.6)"} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
