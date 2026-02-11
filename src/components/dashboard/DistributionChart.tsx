import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface DistributionData {
  name: string;
  value: number;
  color: string;
}

interface DistributionChartProps {
  data?: DistributionData[];
  loading?: boolean;
}

export function DistributionChart({ data, loading }: DistributionChartProps) {
  if (loading) {
    return (
      <div className="stat-card h-[400px]">
        <div className="mb-6">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-[300px] w-full rounded-full mx-auto" style={{ maxWidth: 200 }} />
      </div>
    );
  }

  const chartData = data && data.length > 0 ? data : [
    { name: "Aucune donnée", value: 1, color: "hsl(var(--muted))" },
  ];

  return (
    <div className="stat-card h-[400px]">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Répartition des documents</h3>
        <p className="text-sm text-muted-foreground">Par type de document</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={4}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(0, 0%, 100%)",
              border: "1px solid hsl(214, 32%, 91%)",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
            formatter={(value: number) => [value, "Documents"]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span className="text-sm text-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
