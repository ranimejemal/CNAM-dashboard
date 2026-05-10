import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
  Activity,
  Users,
  Globe,
  Server,
  Wifi,
  Key,
  Fingerprint,
  Mail,
  Search,
  Filter,
  RefreshCw,
  Download,
  MoreVertical,
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  Terminal,
  Bug,
  Loader2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
} from "recharts";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// Demo data for security metrics
const securityMetrics = {
  activeUsers: 1247,
  mfaEnabled: 892,
  mfaCoverage: 71.5,
  openThreats: 12,
  resolvedThreats: 847,
  loginAttempts: 3842,
  failedLogins: 156,
  blockedIPs: 23,
  activeRegions: 24,
  suspiciousActivities: 8,
};

const threatData = [
  { time: "00:00", threats: 2, blocked: 5 },
  { time: "04:00", threats: 1, blocked: 3 },
  { time: "08:00", threats: 5, blocked: 12 },
  { time: "12:00", threats: 8, blocked: 18 },
  { time: "16:00", threats: 4, blocked: 9 },
  { time: "20:00", threats: 3, blocked: 7 },
];

const severityDistribution = [
  { name: "Critical", value: 3, color: "hsl(0, 72%, 51%)" },
  { name: "High", value: 9, color: "hsl(38, 92%, 50%)" },
  { name: "Medium", value: 24, color: "hsl(199, 89%, 48%)" },
  { name: "Low", value: 56, color: "hsl(142, 76%, 45%)" },
];

const recentEvents = [
  { id: 1, type: "login_failure", severity: "medium", user: "ahmed.ben@cnam.tn", ip: "196.187.129.202", location: "Tunis, TN", time: "Il y a 2 min", details: "3 tentatives échouées" },
  { id: 2, type: "suspicious_activity", severity: "high", user: "fatma.trabelsi@cnam.tn", ip: "185.234.67.12", location: "Unknown", time: "Il y a 5 min", details: "Connexion depuis un nouvel appareil" },
  { id: 3, type: "login_success", severity: "low", user: "karim.mejri@cnam.tn", ip: "41.228.45.67", location: "Sfax, TN", time: "Il y a 8 min", details: "Authentification réussie" },
  { id: 4, type: "mfa_enabled", severity: "low", user: "salma.hamdi@cnam.tn", ip: "197.15.23.89", location: "Sousse, TN", time: "Il y a 12 min", details: "2FA activé" },
  { id: 5, type: "access_denied", severity: "high", user: "unknown", ip: "45.134.89.23", location: "Moscow, RU", time: "Il y a 15 min", details: "Tentative d'accès bloquée" },
  { id: 6, type: "password_change", severity: "low", user: "nadia.chaabane@cnam.tn", ip: "41.228.12.34", location: "Nabeul, TN", time: "Il y a 20 min", details: "Mot de passe modifié" },
];

const userSecurityList = [
  { id: 1, name: "Ahmed Ben Ali", email: "ahmed.ben@cnam.tn", role: "Admin", mfaStatus: "enabled", lastLogin: "Il y a 5 min", riskLevel: "low" },
  { id: 2, name: "Fatma Trabelsi", email: "fatma.trabelsi@cnam.tn", role: "Agent", mfaStatus: "pending", lastLogin: "Il y a 2h", riskLevel: "medium" },
  { id: 3, name: "Mohamed Jebali", email: "mohamed.jebali@cnam.tn", role: "Validator", mfaStatus: "disabled", lastLogin: "Il y a 1 jour", riskLevel: "high" },
  { id: 4, name: "Salma Hamdi", email: "salma.hamdi@cnam.tn", role: "Agent", mfaStatus: "enabled", lastLogin: "Il y a 30 min", riskLevel: "low" },
  { id: 5, name: "Karim Mejri", email: "karim.mejri@cnam.tn", role: "Admin", mfaStatus: "enforced", lastLogin: "Il y a 10 min", riskLevel: "low" },
];

const threatsList = [
  { id: 1, title: "Tentative d'intrusion détectée", severity: "critical", category: "Intrusion", status: "open", detectedAt: "Il y a 15 min", affectedSystem: "Auth Server" },
  { id: 2, title: "Activité de bot suspecte", severity: "high", category: "Bot", status: "investigating", detectedAt: "Il y a 45 min", affectedSystem: "API Gateway" },
  { id: 3, title: "Tentatives de brute force", severity: "high", category: "Brute Force", status: "open", detectedAt: "Il y a 1h", affectedSystem: "Login Portal" },
  { id: 4, title: "Connexion depuis IP blacklistée", severity: "medium", category: "Suspicious IP", status: "resolved", detectedAt: "Il y a 2h", affectedSystem: "VPN" },
  { id: 5, title: "Tentative de SQL injection", severity: "critical", category: "Injection", status: "blocked", detectedAt: "Il y a 3h", affectedSystem: "Database" },
];

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">CRITICAL</Badge>;
      case "high":
        return <Badge className="bg-warning/20 text-warning border-warning/30">HIGH</Badge>;
      case "medium":
        return <Badge className="bg-info/20 text-info border-info/30">MEDIUM</Badge>;
      case "low":
        return <Badge className="bg-success/20 text-success border-success/30">LOW</Badge>;
      default:
        return <Badge variant="outline">UNKNOWN</Badge>;
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "login_success":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "login_failure":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "suspicious_activity":
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case "access_denied":
        return <ShieldX className="h-4 w-4 text-destructive" />;
      case "mfa_enabled":
        return <Key className="h-4 w-4 text-success" />;
      case "password_change":
        return <Lock className="h-4 w-4 text-info" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getMfaStatusBadge = (status: string) => {
    switch (status) {
      case "enabled":
        return <Badge className="bg-success/20 text-success">Activé</Badge>;
      case "enforced":
        return <Badge className="bg-primary/20 text-primary">Obligatoire</Badge>;
      case "pending":
        return <Badge className="bg-warning/20 text-warning">En attente</Badge>;
      case "disabled":
        return <Badge className="bg-destructive/20 text-destructive">Désactivé</Badge>;
      default:
        return <Badge variant="outline">—</Badge>;
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "low":
        return <span className="flex items-center gap-1 text-success text-xs"><ShieldCheck className="h-3 w-3" />Faible</span>;
      case "medium":
        return <span className="flex items-center gap-1 text-warning text-xs"><ShieldAlert className="h-3 w-3" />Moyen</span>;
      case "high":
        return <span className="flex items-center gap-1 text-destructive text-xs"><ShieldX className="h-3 w-3" />Élevé</span>;
      default:
        return <span className="text-muted-foreground text-xs">—</span>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Security Operations Center</h1>
                <p className="text-muted-foreground">
                  Zero Trust Security Dashboard - SIEM & Threat Monitoring
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              <span className="text-xs font-medium text-success">SYSTÈME SÉCURISÉ</span>
            </div>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Security Score & Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {/* Security Score Card */}
          <Card className="stat-card col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-2 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Score de sécurité global</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-primary">87</span>
                    <span className="text-xl text-muted-foreground">/100</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span className="text-sm text-success">+5 depuis la semaine dernière</span>
                  </div>
                </div>
                <div className="relative h-24 w-24">
                  <svg className="transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="stroke-muted"
                      strokeWidth="3"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="stroke-primary"
                      strokeWidth="3"
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray="87, 100"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Utilisateurs actifs</p>
                  <p className="text-2xl font-bold">{securityMetrics.activeUsers.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Couverture 2FA</p>
                  <p className="text-2xl font-bold">{securityMetrics.mfaCoverage}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Menaces actives</p>
                  <p className="text-2xl font-bold text-destructive">{securityMetrics.openThreats}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-warning/20 flex items-center justify-center">
                  <ShieldX className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">IPs bloquées</p>
                  <p className="text-2xl font-bold">{securityMetrics.blockedIPs}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="events">Événements</TabsTrigger>
            <TabsTrigger value="threats">Menaces</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="2fa">2FA & Authentification</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Threat Timeline */}
              <Card className="stat-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Activité des menaces (24h)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={threatData}>
                        <defs>
                          <linearGradient id="threatGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="blockedGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(142, 76%, 45%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(142, 76%, 45%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" />
                        <XAxis dataKey="time" tick={{ fill: "hsl(215, 20%, 65%)", fontSize: 11 }} />
                        <YAxis tick={{ fill: "hsl(215, 20%, 65%)", fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(222, 47%, 9%)",
                            border: "1px solid hsl(217, 33%, 17%)",
                            borderRadius: "8px",
                          }}
                        />
                        <Area type="monotone" dataKey="threats" name="Menaces" stroke="hsl(0, 72%, 51%)" fill="url(#threatGradient)" />
                        <Area type="monotone" dataKey="blocked" name="Bloquées" stroke="hsl(142, 76%, 45%)" fill="url(#blockedGradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Severity Distribution */}
              <Card className="stat-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-warning" />
                    Distribution par sévérité
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={severityDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {severityDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(222, 47%, 9%)",
                            border: "1px solid hsl(217, 33%, 17%)",
                            borderRadius: "8px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-6 mt-4">
                    {severityDistribution.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-muted-foreground">{item.name}: {item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Events */}
            <Card className="stat-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-primary" />
                  Événements de sécurité récents
                </CardTitle>
                <Button variant="ghost" size="sm">Voir tout</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentEvents.slice(0, 5).map((event) => (
                    <div key={event.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                        {getEventIcon(event.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{event.user}</span>
                          {getSeverityBadge(event.severity)}
                        </div>
                        <p className="text-xs text-muted-foreground">{event.details}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{event.ip}</p>
                        <p className="text-xs text-muted-foreground">{event.location}</p>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">{event.time}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-6 mt-6">
            <Card className="stat-card">
              <CardHeader>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <CardTitle>Journal des événements de sécurité</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher..."
                        className="pl-9 w-64"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <Select value={severityFilter} onValueChange={setSeverityFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Sévérité" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="table-header">
                        <th className="text-left py-3 px-4">Type</th>
                        <th className="text-left py-3 px-4">Utilisateur</th>
                        <th className="text-left py-3 px-4">IP</th>
                        <th className="text-left py-3 px-4">Localisation</th>
                        <th className="text-left py-3 px-4">Détails</th>
                        <th className="text-left py-3 px-4">Sévérité</th>
                        <th className="text-left py-3 px-4">Heure</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {recentEvents.map((event) => (
                        <tr key={event.id} className="hover:bg-muted/30">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {getEventIcon(event.type)}
                              <span className="text-sm">{event.type.replace(/_/g, " ")}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm">{event.user}</td>
                          <td className="py-3 px-4 text-sm font-mono text-muted-foreground">{event.ip}</td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">{event.location}</td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">{event.details}</td>
                          <td className="py-3 px-4">{getSeverityBadge(event.severity)}</td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">{event.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Threats Tab */}
          <TabsContent value="threats" className="space-y-6 mt-6">
            <Card className="stat-card">
              <CardHeader>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Bug className="h-5 w-5 text-destructive" />
                    Menaces et vulnérabilités détectées
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-destructive/20 text-destructive">{threatsList.filter(t => t.status === "open").length} ouvertes</Badge>
                    <Badge className="bg-warning/20 text-warning">{threatsList.filter(t => t.status === "investigating").length} en investigation</Badge>
                    <Badge className="bg-success/20 text-success">{threatsList.filter(t => t.status === "resolved" || t.status === "blocked").length} résolues</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {threatsList.map((threat) => (
                    <div key={threat.id} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "h-10 w-10 rounded-lg flex items-center justify-center",
                            threat.severity === "critical" ? "bg-destructive/20" : 
                            threat.severity === "high" ? "bg-warning/20" : "bg-info/20"
                          )}>
                            <AlertTriangle className={cn(
                              "h-5 w-5",
                              threat.severity === "critical" ? "text-destructive" : 
                              threat.severity === "high" ? "text-warning" : "text-info"
                            )} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{threat.title}</h4>
                              {getSeverityBadge(threat.severity)}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span>{threat.category}</span>
                              <span>•</span>
                              <span>{threat.affectedSystem}</span>
                              <span>•</span>
                              <span>{threat.detectedAt}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn(
                            threat.status === "open" ? "border-destructive text-destructive" :
                            threat.status === "investigating" ? "border-warning text-warning" :
                            "border-success text-success"
                          )}>
                            {threat.status === "open" ? "Ouverte" :
                             threat.status === "investigating" ? "En investigation" :
                             threat.status === "blocked" ? "Bloquée" : "Résolue"}
                          </Badge>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6 mt-6">
            <Card className="stat-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Sécurité des utilisateurs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="table-header">
                        <th className="text-left py-3 px-4">Utilisateur</th>
                        <th className="text-left py-3 px-4">Rôle</th>
                        <th className="text-left py-3 px-4">Statut 2FA</th>
                        <th className="text-left py-3 px-4">Dernière connexion</th>
                        <th className="text-left py-3 px-4">Niveau de risque</th>
                        <th className="text-right py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {userSecurityList.map((user) => (
                        <tr key={user.id} className="hover:bg-muted/30">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline">{user.role}</Badge>
                          </td>
                          <td className="py-3 px-4">{getMfaStatusBadge(user.mfaStatus)}</td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">{user.lastLogin}</td>
                          <td className="py-3 px-4">{getRiskBadge(user.riskLevel)}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Lock className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 2FA Tab */}
          <TabsContent value="2fa" className="space-y-6 mt-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="stat-card bg-gradient-to-br from-success/10 to-success/5 border-success/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">2FA Activé</p>
                      <p className="text-4xl font-bold text-success">{securityMetrics.mfaEnabled}</p>
                      <p className="text-xs text-muted-foreground mt-1">{securityMetrics.mfaCoverage}% de couverture</p>
                    </div>
                    <Fingerprint className="h-12 w-12 text-success/30" />
                  </div>
                  <Progress value={securityMetrics.mfaCoverage} className="mt-4 h-2 [&>div]:bg-success" />
                </CardContent>
              </Card>

              <Card className="stat-card bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">En attente d'activation</p>
                      <p className="text-4xl font-bold text-warning">{securityMetrics.activeUsers - securityMetrics.mfaEnabled}</p>
                      <p className="text-xs text-muted-foreground mt-1">Utilisateurs sans 2FA</p>
                    </div>
                    <Clock className="h-12 w-12 text-warning/30" />
                  </div>
                </CardContent>
              </Card>

              <Card className="stat-card bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Méthodes supportées</p>
                      <div className="flex gap-4 mt-3">
                        <div className="flex items-center gap-2">
                          <Mail className="h-5 w-5 text-primary" />
                          <span className="text-sm">Email OTP</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Key className="h-5 w-5 text-primary" />
                          <span className="text-sm">Authenticator</span>
                        </div>
                      </div>
                    </div>
                    <Shield className="h-12 w-12 text-primary/30" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="stat-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Configuration 2FA par rôle</CardTitle>
                  <Button size="sm">
                    <Shield className="h-4 w-4 mr-2" />
                    Forcer 2FA pour tous
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { role: "Administrateurs", total: 5, enabled: 5, enforced: true },
                    { role: "Agents", total: 45, enabled: 38, enforced: false },
                    { role: "Validateurs", total: 12, enabled: 8, enforced: false },
                  ].map((item) => (
                    <div key={item.role} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{item.role}</p>
                          <p className="text-sm text-muted-foreground">{item.enabled}/{item.total} utilisateurs avec 2FA</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-32">
                          <Progress value={(item.enabled / item.total) * 100} className="h-2" />
                        </div>
                        <Badge className={item.enforced ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}>
                          {item.enforced ? "Obligatoire" : "Optionnel"}
                        </Badge>
                        <Button variant="outline" size="sm">Configurer</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
