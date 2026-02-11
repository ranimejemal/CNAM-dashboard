import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SecurityDashboardLayout } from "@/components/layout/SecurityDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Shield, ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, Activity,
  Users, Key, Lock, Search, RefreshCw, Download, Clock, Eye,
  CheckCircle, XCircle, AlertCircle, Globe, Terminal, Bug, Loader2,
  TrendingUp
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar
} from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function SecurityDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const [threats, setThreats] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eventsRes, threatsRes, logsRes] = await Promise.all([
        supabase.from("security_events").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("threats").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
      ]);
      setSecurityEvents(eventsRes.data || []);
      setThreats(threatsRes.data || []);
      setAuditLogs(logsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical": return <Badge className="bg-destructive/20 text-destructive border-destructive/30">CRITIQUE</Badge>;
      case "high": return <Badge className="bg-warning/20 text-warning border-warning/30">ÉLEVÉ</Badge>;
      case "medium": return <Badge className="bg-info/20 text-info border-info/30">MOYEN</Badge>;
      case "low": return <Badge className="bg-success/20 text-success border-success/30">FAIBLE</Badge>;
      default: return <Badge variant="outline">—</Badge>;
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "login_success": return <CheckCircle className="h-4 w-4 text-success" />;
      case "login_failure": return <XCircle className="h-4 w-4 text-destructive" />;
      case "suspicious_activity": return <AlertTriangle className="h-4 w-4 text-warning" />;
      case "access_denied": return <ShieldX className="h-4 w-4 text-destructive" />;
      case "mfa_enabled": return <Key className="h-4 w-4 text-success" />;
      case "password_change": return <Lock className="h-4 w-4 text-info" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const eventStats = {
    total: securityEvents.length,
    failures: securityEvents.filter(e => e.event_type === "login_failure").length,
    suspicious: securityEvents.filter(e => e.event_type === "suspicious_activity").length,
    blocked: securityEvents.filter(e => e.event_type === "ip_blocked" || e.event_type === "access_denied").length,
  };

  const threatStats = {
    open: threats.filter(t => t.status === "open").length,
    investigating: threats.filter(t => t.status === "investigating").length,
    resolved: threats.filter(t => t.status === "resolved" || t.status === "closed").length,
    critical: threats.filter(t => t.severity === "critical").length,
  };

  // Demo chart data
  const threatTimelineData = [
    { time: "00:00", threats: 2, blocked: 5 },
    { time: "04:00", threats: 1, blocked: 3 },
    { time: "08:00", threats: 5, blocked: 12 },
    { time: "12:00", threats: 8, blocked: 18 },
    { time: "16:00", threats: 4, blocked: 9 },
    { time: "20:00", threats: 3, blocked: 7 },
  ];

  const severityData = [
    { name: "Critique", value: threatStats.critical || 3, color: "hsl(0, 72%, 51%)" },
    { name: "Élevé", value: 9, color: "hsl(38, 92%, 50%)" },
    { name: "Moyen", value: 24, color: "hsl(199, 89%, 48%)" },
    { name: "Faible", value: 56, color: "hsl(142, 76%, 45%)" },
  ];

  const filteredEvents = securityEvents.filter(e => {
    if (severityFilter !== "all" && e.severity !== severityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return e.event_type?.toLowerCase().includes(q) || e.ip_address?.toLowerCase().includes(q) || e.location?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <SecurityDashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Security Operations Center</h1>
              <p className="text-muted-foreground">SIEM & Threat Monitoring — Zero Trust Dashboard</p>
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
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />Actualiser
            </Button>
          </div>
        </div>

        {/* Security Score & Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <Card className="stat-card col-span-2 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
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
                    <span className="text-sm text-success">+5 cette semaine</span>
                  </div>
                </div>
                <div className="relative h-24 w-24">
                  <svg className="transform -rotate-90" viewBox="0 0 36 36">
                    <path className="stroke-muted" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="stroke-primary" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="87, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-destructive/20 flex items-center justify-center"><AlertTriangle className="h-5 w-5 text-destructive" /></div><div><p className="text-xs text-muted-foreground">Menaces ouvertes</p><p className="text-2xl font-bold text-destructive">{threatStats.open}</p></div></div></CardContent></Card>
          <Card className="stat-card"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-warning/20 flex items-center justify-center"><Eye className="h-5 w-5 text-warning" /></div><div><p className="text-xs text-muted-foreground">En investigation</p><p className="text-2xl font-bold">{threatStats.investigating}</p></div></div></CardContent></Card>
          <Card className="stat-card"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-destructive/20 flex items-center justify-center"><XCircle className="h-5 w-5 text-destructive" /></div><div><p className="text-xs text-muted-foreground">Échecs connexion</p><p className="text-2xl font-bold">{eventStats.failures}</p></div></div></CardContent></Card>
          <Card className="stat-card"><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center"><ShieldCheck className="h-5 w-5 text-success" /></div><div><p className="text-xs text-muted-foreground">Menaces résolues</p><p className="text-2xl font-bold text-success">{threatStats.resolved}</p></div></div></CardContent></Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="events">Événements</TabsTrigger>
            <TabsTrigger value="threats">Menaces</TabsTrigger>
            <TabsTrigger value="logs">Logs d'audit</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="stat-card">
                <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />Activité des menaces (24h)</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={threatTimelineData}>
                        <defs>
                          <linearGradient id="secThreatGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="secBlockGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(142, 76%, 45%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(142, 76%, 45%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="time" className="text-muted-foreground" tick={{ fontSize: 11 }} />
                        <YAxis className="text-muted-foreground" tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="threats" name="Menaces" stroke="hsl(0, 72%, 51%)" fill="url(#secThreatGrad)" />
                        <Area type="monotone" dataKey="blocked" name="Bloquées" stroke="hsl(142, 76%, 45%)" fill="url(#secBlockGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card className="stat-card">
                <CardHeader><CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-warning" />Distribution par sévérité</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={severityData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                          {severityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-4 justify-center mt-4">
                    {severityData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2 text-sm">
                        <span className="h-3 w-3 rounded-full" style={{ background: d.color }} />
                        {d.name}: {d.value}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Events */}
          <TabsContent value="events" className="space-y-4 mt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Rechercher par IP, type..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Sévérité" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="critical">Critique</SelectItem>
                  <SelectItem value="high">Élevé</SelectItem>
                  <SelectItem value="medium">Moyen</SelectItem>
                  <SelectItem value="low">Faible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : filteredEvents.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">Aucun événement trouvé</div>
                ) : (
                  <div className="space-y-2">
                    {filteredEvents.slice(0, 30).map((e) => (
                      <div key={e.id} className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                        {getEventIcon(e.event_type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{e.event_type?.replace(/_/g, " ")}</p>
                          <p className="text-xs text-muted-foreground">{e.ip_address || "—"} · {e.location || "—"}</p>
                        </div>
                        {getSeverityBadge(e.severity)}
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(e.created_at), "dd/MM HH:mm")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Threats */}
          <TabsContent value="threats" className="space-y-4 mt-6">
            <h2 className="text-lg font-semibold">Gestion des incidents</h2>
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : threats.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">Aucune menace enregistrée</div>
                ) : (
                  <div className="space-y-3">
                    {threats.map((t) => (
                      <div key={t.id} className="p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-sm">{t.title}</p>
                          <div className="flex items-center gap-2">
                            {getSeverityBadge(t.severity)}
                            <Badge variant="outline" className="text-xs">{t.status}</Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{t.description || "—"}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Catégorie: {t.category}</span>
                          <span>Système: {t.affected_system || "—"}</span>
                          <span>Détecté: {format(new Date(t.detected_at), "dd/MM/yyyy HH:mm")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Logs */}
          <TabsContent value="logs" className="space-y-4 mt-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Logs d'audit</h2>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" /> Exporter
              </Button>
            </div>
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">Aucun log d'audit</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="table-header border-y border-border">
                          <th className="px-4 py-3 text-left text-xs">Action</th>
                          <th className="px-4 py-3 text-left text-xs">Table</th>
                          <th className="px-4 py-3 text-left text-xs">IP</th>
                          <th className="px-4 py-3 text-left text-xs">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {auditLogs.slice(0, 30).map((l) => (
                          <tr key={l.id} className="hover:bg-muted/50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium">{l.action}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{l.target_table}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{l.ip_address || "—"}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{format(new Date(l.created_at), "dd/MM/yyyy HH:mm")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SecurityDashboardLayout>
  );
}
