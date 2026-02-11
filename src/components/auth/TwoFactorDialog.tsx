import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, Shield, CheckCircle2, Smartphone, Copy, Check, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

interface TwoFactorDialogProps {
  open: boolean;
  onVerified: () => void;
  userEmail?: string;
}

type SetupState = "loading" | "setup" | "verify" | "already_enrolled";

export function TwoFactorDialog({ open, onVerified, userEmail }: TwoFactorDialogProps) {
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [setupState, setSetupState] = useState<SetupState>("loading");
  const [totpUri, setTotpUri] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [secretCopied, setSecretCopied] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      checkTOTPStatus();
    }
  }, [open]);

  const checkTOTPStatus = async () => {
    setSetupState("loading");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée");

      const response = await supabase.functions.invoke("check-totp-status", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data.requires_2fa) {
        // 2FA not required (edge case)
        onVerified();
        return;
      }

      // Since needs_verification is always true now, we skip the grace period check
      if (response.data.enrolled) {
        // Already enrolled, go directly to code verification
        setSetupState("verify");
        setShowQrCode(false);
      } else if (response.data.pending) {
        // Pending setup - go to verification but allow showing QR
        setSetupState("verify");
        setShowQrCode(false);
        // Load the pending secret for QR display if needed
        await loadPendingSetup();
      } else {
        // Need to set up TOTP for the first time
        await initiateSetup();
      }
    } catch (error: any) {
      console.error("Error checking TOTP status:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de vérifier le statut 2FA",
      });
    }
  };

  const loadPendingSetup = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke("setup-totp", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.data?.totp_uri && response.data?.secret) {
        setTotpUri(response.data.totp_uri);
        setTotpSecret(response.data.secret);
      }
    } catch (error) {
      console.error("Error loading pending setup:", error);
    }
  };

  const initiateSetup = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée");

      const response = await supabase.functions.invoke("setup-totp", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      if (response.data.already_enrolled) {
        setSetupState("verify");
        return;
      }

      setTotpUri(response.data.totp_uri);
      setTotpSecret(response.data.secret);
      setSetupState("setup");
    } catch (error: any) {
      console.error("Error setting up TOTP:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de configurer l'authentification",
      });
    }
  };

  const showQrCodeHandler = async () => {
    if (!totpUri) {
      await loadPendingSetup();
    }
    setShowQrCode(true);
  };

  const verifyTOTP = async (isSetup: boolean = false) => {
    if (otp.length !== 6) return;

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée");

      const response = await supabase.functions.invoke("verify-totp", {
        body: { code: otp, is_setup: isSetup },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      // verify-totp returns 200 even for expected failures.
      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        if (response.data.remainingAttempts !== undefined) {
          setRemainingAttempts(response.data.remainingAttempts);
        }
        throw new Error(response.data.error);
      }

      toast({
        title: isSetup ? "2FA activé" : "Vérification réussie",
        description: isSetup
          ? "L'authentification à deux facteurs est maintenant active"
          : "Bienvenue sur votre tableau de bord",
      });
      onVerified();
    } catch (error: any) {
      console.error("Error verifying TOTP:", error);
      toast({
        variant: "destructive",
        title: "Erreur de vérification",
        description: error.message,
      });
      setOtp("");
    } finally {
      setIsLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(totpSecret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
    toast({
      title: "Copié",
      description: "Clé secrète copiée dans le presse-papiers",
    });
  };

  const proceedToVerify = () => {
    setSetupState("verify");
  };

  const resetAndRestart = async () => {
    const confirmed = window.confirm(
      "Réinitialiser la 2FA et recommencer la configuration ?"
    );
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée");

      const res = await supabase.functions.invoke("reset-totp", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      setOtp("");
      setRemainingAttempts(5);
      setTotpSecret("");
      setTotpUri("");

      await initiateSetup();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: e.message || "Impossible de réinitialiser la 2FA",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">
            {setupState === "setup" ? "Configuration 2FA" : "Vérification en deux étapes"}
          </DialogTitle>
          <DialogDescription>
            {setupState === "loading" && "Chargement..."}
            {setupState === "setup" && "Scannez le QR code avec votre application d'authentification"}
            {setupState === "verify" && "Entrez le code à 6 chiffres de votre application"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-4">
          {setupState === "loading" && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Vérification du statut...</p>
            </div>
          )}

          {setupState === "setup" && (
            <>
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Microsoft Authenticator, Google Authenticator, etc.</span>
              </div>

              {/* QR Code */}
              <div className="rounded-lg border bg-white p-4">
                <QRCodeSVG 
                  value={totpUri} 
                  size={200}
                  level="M"
                  includeMargin={true}
                />
              </div>

              {/* Manual entry option */}
              <div className="w-full space-y-2">
                <p className="text-xs text-center text-muted-foreground">
                  Ou entrez cette clé manuellement :
                </p>
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                  <code className="flex-1 text-xs font-mono break-all">
                    {totpSecret}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={copySecret}
                  >
                    {secretCopied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button onClick={proceedToVerify} className="w-full">
                J'ai scanné le QR code
              </Button>
            </>
          )}

          {setupState === "verify" && (
            <>
              {showQrCode && totpUri ? (
                <>
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Scannez avec Microsoft Authenticator</span>
                  </div>

                  <div className="rounded-lg border bg-white p-4">
                    <QRCodeSVG 
                      value={totpUri} 
                      size={180}
                      level="M"
                      includeMargin={true}
                    />
                  </div>

                  {totpSecret && (
                    <div className="w-full space-y-2">
                      <p className="text-xs text-center text-muted-foreground">
                        Ou entrez cette clé manuellement :
                      </p>
                      <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                        <code className="flex-1 text-xs font-mono break-all">
                          {totpSecret}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={copySecret}
                        >
                          {secretCopied ? (
                            <Check className="h-4 w-4 text-success" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  <Button onClick={() => setShowQrCode(false)} className="w-full">
                    J'ai scanné le QR code
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Code de Microsoft Authenticator</span>
                  </div>

                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                    disabled={isLoading}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>

                  {remainingAttempts < 5 && (
                    <p className="text-sm text-destructive">
                      {remainingAttempts} tentative{remainingAttempts > 1 ? "s" : ""} restante{remainingAttempts > 1 ? "s" : ""}
                    </p>
                  )}

                  <Button
                    onClick={() => verifyTOTP(totpSecret !== "")}
                    disabled={otp.length !== 6 || isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Vérification...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Vérifier le code
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={showQrCodeHandler}
                    disabled={isLoading}
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    Afficher le QR code
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Le code se renouvelle toutes les 30 secondes
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
