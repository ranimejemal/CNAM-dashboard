import { useAuth } from "@/hooks/useAuth";
import { usePrestataireDashboardData } from "@/hooks/usePrestataireDashboardData";
import { PrestataireDashboardLayout } from "@/components/layout/PrestataireDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Receipt, Clock, CheckCircle, TrendingUp, CreditCard, AlertCircle, Activity, FileText, XCircle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const monthlyData = [
  { name: "Sep", demandes: 18, approuvées: 14, montant: 4200 },
  { name: "Oct", demandes: 24, approuvées: 19, montant: 5800 },
  { name: "Nov", demandes: 31, approuvées: 26, montant: 7200 },
  { name: "Déc", demandes: 22, approuvées: 18, montant: 5100 },
  { name: "Jan", demandes: 28, approuvées: 23, montant: 6400 },
  { name: "Fév", demandes: 15, approuvées: 8, montant: 3200 },
];

const serviceDistribution = [
  { name: "Consultation", value: 35, color: "hsl(var(--primary))" },
  { name: "Radiologie", value: 18, color: "hsl(var(--info))" },
  { name: "Pharmacie", value: 22, color: "hsl(var(--success))" },
  { name: "Analyses", value: 15, color: "hsl(var(--warning))" },
  { name: "Autres", value: 10, color: "hsl(var(--muted-foreground))" },
];

export default function PrestataireDashboard() {
  const { profile } = useAuth();
  const { reimbursements, providerInfo, stats, getStatusBadge } = usePrestataireDashboardData();

  const recentActivity = reimbursements.slice(0, 6);

  return (
    <PrestataireDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tableau de bord Prestataire</h1>
            <p className="text-muted-foreground">
              {providerInfo ? providerInfo.name : profile?.first_name + " " + profile?.last_name} — Gestion des services CNAM
            </p>
          </div>
          {providerInfo && (
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
              <Building2 className="h-3.5 w-3.5" />
              {providerInfo.status === "approved" ? "Agréé" : providerInfo.status === "suspended" ? "Suspendu" : "En attente d'agrément"}
            </Badge>
          )}
        </div>

        {providerInfo && providerInfo.status !== "approved" && (
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                <div>
                  <p className="font-medium text-warning">Compte en attente de validation</p>
                  <p className="text-sm text-muted-foreground mt-1">Votre agrément est en cours de vérification par l'administration CNAM.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Total demandes", value: stats.total, icon: Receipt, color: "primary", trend: "+12%", up: true },
            { label: "En attente", value: stats.pending, icon: Clock, color: "warning", trend: null, up: false },
            { label: "Approuvées", value: stats.approved, icon: CheckCircle, color: "success", trend: "+8%", up: true },
            { label: "Total facturé", value: `${stats.totalAmount.toFixed(0)} TND`, icon: TrendingUp, color: "info", trend: "+15%", up: true },
            { label: "Montant approuvé", value: `${stats.approvedAmount.toFixed(0)} TND`, icon: CreditCard, color: "success", trend: "+6%", up: true },
          ].map((s) => (
            <Card key={s.label} className="stat-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg bg-${s.color}/10 flex items-center justify-center`}>
                      <s.icon className={`h-5 w-5 text-${s.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="text-xl font-bold">{s.value}</p>
                    </div>
                  </div>
                  {s.trend && (
                    <div className={`flex items-center text-xs font-medium ${s.up ? "text-success" : "text-destructive"}`}>
                      {s.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {s.trend}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" /> Activité mensuelle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="demandes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Demandes" />
                  <Bar dataKey="approuvées" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Approuvées" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" /> Répartition services
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={serviceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {serviceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value}%`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 w-full">
                {serviceDistribution.map((s) => (
                  <div key={s.name} className="flex items-center gap-2 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="text-muted-foreground">{s.name}</span>
                    <span className="ml-auto font-medium">{s.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Quick Info */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dernières demandes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-primary">{r.reference_number}</p>
                        {getStatusBadge(r.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {r.insured_member ? `${r.insured_member.first_name} ${r.insured_member.last_name}` : "—"} · {r.service_type}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold">{Number(r.amount_requested).toFixed(0)} TND</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(r.created_at), "dd MMM", { locale: fr })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {/* Provider Quick Info */}
            {providerInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" /> Établissement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Code prestataire</p>
                      <p className="font-semibold text-sm">{providerInfo.provider_code}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Spécialité</p>
                      <p className="font-semibold text-sm">{providerInfo.specialty || "Généraliste"}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Factures traitées</p>
                      <p className="font-semibold text-sm">{providerInfo.invoices_processed?.toLocaleString() || 0}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Taux d'erreur</p>
                      <p className="font-semibold text-sm">{providerInfo.error_rate || 0}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Résumé par statut</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: "Approuvées", count: stats.approved, total: stats.total, color: "bg-success", icon: CheckCircle },
                    { label: "En attente", count: stats.pending, total: stats.total, color: "bg-warning", icon: Clock },
                    { label: "En traitement", count: reimbursements.filter(r => r.status === "processing").length, total: stats.total, color: "bg-info", icon: Activity },
                    { label: "Rejetées", count: reimbursements.filter(r => r.status === "rejected").length, total: stats.total, color: "bg-destructive", icon: XCircle },
                  ].map((item) => {
                    const pct = stats.total > 0 ? (item.count / stats.total) * 100 : 0;
                    return (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 text-sm">
                            <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{item.label}</span>
                          </div>
                          <span className="text-sm font-medium">{item.count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PrestataireDashboardLayout>
  );
}
