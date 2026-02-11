import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import cnamIcon from "@/assets/cnam-icon.ico";
import { useToast } from "@/hooks/use-toast";
import { TwoFactorDialog } from "@/components/auth/TwoFactorDialog";
import { ChangePasswordDialog } from "@/components/auth/ChangePasswordDialog";
import { supabase } from "@/integrations/supabase/client";
import { logSecurityEvent } from "@/lib/securityEvents";
import { lovable } from "@/integrations/lovable/index";

async function callSecurityLogin(params: {
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  status: string;
  email?: string;
}) {
  try {
    const resp = await supabase.functions.invoke("security-login", { body: params });
    return resp.data;
  } catch (e) {
    console.error("security-login error:", e);
    return null;
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [showForcePasswordChange, setShowForcePasswordChange] = useState(false);
  const [pendingSecurityCheck, setPendingSecurityCheck] = useState(false);
  const { signIn, user, roles, isLoading, getDashboardRoute } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && user && roles.length > 0 && !pendingSecurityCheck && !show2FA && !showForcePasswordChange) {
      navigate(getDashboardRoute(), { replace: true });
    }
  }, [isLoading, user, roles, pendingSecurityCheck, show2FA, showForcePasswordChange]);

  const checkUserSecurityStatus = async (userId: string) => {
    const { data: settings } = await supabase
      .from("user_security_settings")
      .select("mfa_status, last_login_at, password_must_change, password_changed_at")
      .eq("user_id", userId)
      .single();

    if (settings?.password_must_change) {
      return { requires2FA: false, requiresPasswordChange: true };
    }

    if (settings?.password_changed_at) {
      const daysDiff = (Date.now() - new Date(settings.password_changed_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 30) {
        return { requires2FA: false, requiresPasswordChange: true };
      }
    }

    return { requires2FA: true, requiresPasswordChange: false };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Check IP block before attempting login
    const preCheck = await callSecurityLogin({
      status: "check",
      email,
      ip_address: "client",
      user_agent: navigator.userAgent,
    });

    if (preCheck?.blocked) {
      toast({
        variant: "destructive",
        title: "Accès bloqué",
        description: preCheck.message || "Votre adresse IP est temporairement bloquée.",
      });
      setIsSubmitting(false);
      return;
    }

    const { error } = await signIn(email, password);

    if (error) {
      await logSecurityEvent("login_failure", "medium", { email, reason: "invalid_credentials" });
      // Record failure for brute-force tracking
      await callSecurityLogin({
        status: "failure",
        email,
        ip_address: "client",
        user_agent: navigator.userAgent,
      });

      toast({
        variant: "destructive",
        title: "Échec de connexion",
        description: "Identifiants incorrects. Veuillez réessayer.",
      });
      setIsSubmitting(false);
      return;
    }

    // Block auto-redirect while we check security status
    setPendingSecurityCheck(true);

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      setPendingSecurityCheck(false);
      setIsSubmitting(false);
      return;
    }

    // Record successful login for history & new device detection
    await callSecurityLogin({
      user_id: currentUser.id,
      status: "success",
      email,
      ip_address: "client",
      user_agent: navigator.userAgent,
    });

    const { requires2FA, requiresPasswordChange } = await checkUserSecurityStatus(currentUser.id);

    if (requiresPasswordChange) {
      setShowForcePasswordChange(true);
      setIsSubmitting(false);
    } else if (requires2FA) {
      setShow2FA(true);
      setIsSubmitting(false);
    } else {
      setPendingSecurityCheck(false);
      await logSecurityEvent("login_success", "low", { email });
    }
  };

  const handle2FAVerified = async () => {
    setShow2FA(false);
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      const { data: settings } = await supabase
        .from("user_security_settings")
        .select("password_must_change, password_changed_at")
        .eq("user_id", currentUser.id)
        .single();

      const needsPasswordChange = settings?.password_must_change ||
        (settings?.password_changed_at &&
          (Date.now() - new Date(settings.password_changed_at).getTime()) / (1000 * 60 * 60 * 24) > 30);

      if (needsPasswordChange) {
        setShowForcePasswordChange(true);
        return;
      }
    }
    setPendingSecurityCheck(false);
    await logSecurityEvent("login_success", "low", { email });
  };

  const handlePasswordChanged = async () => {
    setShowForcePasswordChange(false);
    setPendingSecurityCheck(false);
    await logSecurityEvent("login_success", "low", { email });
  };

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
              <img src={cnamIcon} alt="CNAM" className="h-12 w-12" />
            </div>
            <CardTitle className="text-2xl">CNAM — Espace sécurisé</CardTitle>
            <CardDescription>
              Connectez-vous pour accéder à votre espace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Adresse email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.tn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  "Se connecter"
                )}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Demander un accès ?{" "}
              <Link to="/register" className="text-primary hover:underline">
                Soumettre une demande
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <TwoFactorDialog
        open={show2FA}
        onVerified={handle2FAVerified}
        userEmail={email}
      />

      <ChangePasswordDialog
        open={showForcePasswordChange}
        onOpenChange={() => {}}
        onSuccess={handlePasswordChanged}
        forceChange={true}
      />
    </>
  );
}
