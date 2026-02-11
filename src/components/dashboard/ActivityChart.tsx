import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityData {
  hour: string;
  users: number;
  requests: number;
}

const generateActivityData = (): ActivityData[] => {
  const hours = [];
  for (let i = 0; i < 24; i++) {
    const baseUsers = Math.floor(Math.random() * 500) + 200;
    const peak = i >= 9 && i <= 17 ? 1.8 : 1;
    hours.push({
      hour: `${i.toString().padStart(2, '0')}h`,
      users: Math.floor(baseUsers * peak),
      requests: Math.floor(baseUsers * peak * 0.7),
    });
  }
  return hours;
};

interface ActivityChartProps {
  loading?: boolean;
}

export function ActivityChart({ loading }: ActivityChartProps) {
  const data = generateActivityData();

  if (loading) {
    return (
      <div className="stat-card h-[300px]">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-[220px] w-full" />
      </div>
    );
  }

  return (
    <div className="stat-card h-[300px]">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Activité en temps réel</h3>
        <p className="text-sm text-muted-foreground">Utilisateurs connectés par heure</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="hour" 
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Area
            type="monotone"
            dataKey="users"
            name="Utilisateurs"
            stroke="hsl(var(--primary))"
            fillOpacity={1}
            fill="url(#colorUsers)"
          />
          <Area
            type="monotone"
            dataKey="requests"
            name="Requêtes"
            stroke="hsl(var(--accent))"
            fillOpacity={1}
            fill="url(#colorRequests)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
