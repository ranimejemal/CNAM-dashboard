import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Monitor, Smartphone, Globe, Clock, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface LoginEntry {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  location: string | null;
  login_at: string;
  status: string;
  device_fingerprint: string | null;
}

function getDeviceIcon(userAgent: string | null) {
  if (!userAgent) return <Monitor className="h-4 w-4" />;
  const ua = userAgent.toLowerCase();
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
    return <Smartphone className="h-4 w-4" />;
  }
  return <Monitor className="h-4 w-4" />;
}

function getBrowserName(userAgent: string | null) {
  if (!userAgent) return "Inconnu";
  const ua = userAgent.toLowerCase();
  if (ua.includes("chrome") && !ua.includes("edg")) return "Chrome";
  if (ua.includes("firefox")) return "Firefox";
  if (ua.includes("safari") && !ua.includes("chrome")) return "Safari";
  if (ua.includes("edg")) return "Edge";
  if (ua.includes("opera") || ua.includes("opr")) return "Opera";
  return "Autre";
}

function getOSName(userAgent: string | null) {
  if (!userAgent) return "";
  const ua = userAgent.toLowerCase();
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("mac os")) return "macOS";
  if (ua.includes("linux")) return "Linux";
  if (ua.includes("android")) return "Android";
  if (ua.includes("iphone") || ua.includes("ipad")) return "iOS";
  return "";
}

export function ActivityJournal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LoginEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadHistory();
  }, [user]);

  const loadHistory = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("user_login_history")
      .select("*")
      .eq("user_id", user!.id)
      .order("login_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error loading login history:", error);
    } else {
      setEntries(data || []);
    }
    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Journal d'activité
        </CardTitle>
        <CardDescription>
          Vos 50 dernières connexions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucune activité enregistrée
          </p>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    entry.status === "success" 
                      ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" 
                      : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                  }`}>
                    {entry.status === "success" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        {entry.status === "success" ? "Connexion réussie" : "Échec de connexion"}
                      </span>
                      <Badge variant={entry.status === "success" ? "default" : "destructive"} className="text-xs">
                        {entry.status === "success" ? "Succès" : "Échec"}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(entry.login_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                      </span>
                      {entry.ip_address && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {entry.ip_address}
                        </span>
                      )}
                      {entry.user_agent && (
                        <span className="flex items-center gap-1">
                          {getDeviceIcon(entry.user_agent)}
                          {getBrowserName(entry.user_agent)} • {getOSName(entry.user_agent)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
