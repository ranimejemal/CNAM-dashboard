import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TwoFactorDialog } from "@/components/auth/TwoFactorDialog";
import { ChangePasswordDialog } from "@/components/auth/ChangePasswordDialog";
import { supabase } from "@/integrations/supabase/client";
import { logSecurityEvent } from "@/lib/securityEvents";
import { normalizeAuthError } from "@/lib/errorHandling";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [showForcePasswordChange, setShowForcePasswordChange] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string>("/");
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

  const checkUserSecurityStatus = async (userId: string) => {
    // Check if user is admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const isAdmin = roles?.some(r => r.role === "admin");
    
    // Get security settings
    const { data: settings } = await supabase
      .from("user_security_settings")
      .select("mfa_status, last_login_at, password_must_change, password_changed_at")
      .eq("user_id", userId)
      .single();

    // Check if password change is required
    if (settings?.password_must_change) {
      return { requires2FA: false, requiresPasswordChange: true };
    }

    // Check if password has expired (30 days)
    if (settings?.password_changed_at) {
      const passwordChangedAt = new Date(settings.password_changed_at);
      const now = new Date();
      const daysDiff = (now.getTime() - passwordChangedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 30) {
        return { requires2FA: false, requiresPasswordChange: true };
      }
    }

    // Always require 2FA verification for admins on every login
    if (isAdmin) {
      return { requires2FA: true, requiresPasswordChange: false };
    }

    return { requires2FA: false, requiresPasswordChange: false };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await signIn(email, password);

    if (error) {
      // Log failed login attempt
      await logSecurityEvent("login_failure", "medium", { 
        email, 
        reason: error.message 
      });
      
      toast({
        variant: "destructive",
        title: "Erreur de connexion",
        description: normalizeAuthError(error),
      });
      setIsSubmitting(false);
    } else {
      // Get current user to check security status
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { requires2FA, requiresPasswordChange } = await checkUserSecurityStatus(user.id);
        
        if (requiresPasswordChange) {
          setPendingNavigation(from);
          setShowForcePasswordChange(true);
          setIsSubmitting(false);
        } else if (requires2FA) {
          setPendingNavigation(from);
          setShow2FA(true);
          setIsSubmitting(false);
        } else {
          toast({
            title: "Connexion réussie",
            description: "Bienvenue sur le tableau de bord CNAM.",
          });
          navigate(from, { replace: true });
        }
      } else {
        toast({
          title: "Connexion réussie",
          description: "Bienvenue sur le tableau de bord CNAM.",
        });
        navigate(from, { replace: true });
      }
    }
  };

  const handle2FAVerified = async () => {
    setShow2FA(false);
    
    // After 2FA, check if password change is still required
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: settings } = await supabase
        .from("user_security_settings")
        .select("password_must_change, password_changed_at")
        .eq("user_id", user.id)
        .single();

      const needsPasswordChange = settings?.password_must_change || 
        (settings?.password_changed_at && 
          (new Date().getTime() - new Date(settings.password_changed_at).getTime()) / (1000 * 60 * 60 * 24) > 30);

      if (needsPasswordChange) {
        setShowForcePasswordChange(true);
        return;
      }
    }
    
    toast({
      title: "Connexion réussie",
      description: "Bienvenue sur le tableau de bord CNAM.",
    });
    navigate(pendingNavigation, { replace: true });
  };

  const handlePasswordChanged = () => {
    setShowForcePasswordChange(false);
    toast({
      title: "Connexion réussie",
      description: "Bienvenue sur le tableau de bord CNAM.",
    });
    navigate(pendingNavigation, { replace: true });
  };

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center ">
    <img
      src="/CNAM.jpg"
      alt="CNAM Logo"
      className="h-30 w-25 "
    />
  </div>

  <CardTitle className="text-2xl">CNAM - Connexion</CardTitle>
  <CardDescription>
    Connectez-vous pour accéder au tableau de bord
  </CardDescription>
</CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
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
              Pas encore de compte ?{" "}
              <Link to="/register" className="text-primary hover:underline">
                Créer un compte
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
        onOpenChange={() => {}} // Don't allow closing
        onSuccess={handlePasswordChanged}
        forceChange={true}
      />
    </>
  );
}
