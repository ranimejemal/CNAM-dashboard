import { MapPin } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Region {
  name: string;
  users: number;
  percentage: number;
  growth: number;
}

const regions: Region[] = [
  { name: "Tunis", users: 28450, percentage: 35, growth: 12.3 },
  { name: "Sfax", users: 18200, percentage: 22, growth: 8.7 },
  { name: "Sousse", users: 12800, percentage: 16, growth: 15.2 },
  { name: "Nabeul", users: 8500, percentage: 10, growth: 6.4 },
  { name: "Bizerte", users: 6200, percentage: 8, growth: 9.1 },
  { name: "Autres", users: 7350, percentage: 9, growth: 11.8 },
];

export function RegionalStats() {
  const totalUsers = regions.reduce((sum, r) => sum + r.users, 0);

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Répartition régionale</h3>
          <p className="text-sm text-muted-foreground">
            {totalUsers.toLocaleString()} assurés au total
          </p>
        </div>
        <MapPin className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="space-y-4">
        {regions.map((region) => (
          <div key={region.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{region.name}</span>
                <span className="text-xs text-success bg-success/10 px-1.5 py-0.5 rounded">
                  +{region.growth}%
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {region.users.toLocaleString()} ({region.percentage}%)
              </span>
            </div>
            <Progress 
              value={region.percentage} 
              className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-accent"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
