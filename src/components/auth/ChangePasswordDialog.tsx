import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Mail, Smartphone, Eye, EyeOff, Check, X } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { validatePassword, getStrengthColor, getStrengthLabel } from "@/lib/passwordValidation";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  forceChange?: boolean;
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
  onSuccess,
  forceChange = false,
}: ChangePasswordDialogProps) {
  const [step, setStep] = useState<"choose" | "verify" | "newpassword">("choose");
  const [verificationType, setVerificationType] = useState<"otp" | "totp">("otp");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [hasTOTP, setHasTOTP] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      resetForm();
      checkTOTPStatus();
    }
  }, [open]);

  const resetForm = () => {
    setStep("choose");
    setVerificationCode("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setHasTOTP(false);
  };

  const checkTOTPStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase.functions.invoke("check-totp-status", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const enrolled = data?.enrolled === true;
      setHasTOTP(enrolled);
      
      // Auto-select TOTP if user has it enrolled
      if (enrolled) {
        setVerificationType("totp");
        setStep("verify");
      }
    } catch (error) {
      console.error("Error checking TOTP status:", error);
    }
  };


  const sendOTP = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session non trouvée");

      const { data, error } = await supabase.functions.invoke("send-password-change-otp", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setMaskedEmail(data.email || "");
      setVerificationType("otp");
      setStep("verify");

      toast({
        title: "Code envoyé",
        description: `Un code de vérification a été envoyé à ${data.email}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible d'envoyer le code",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const useTOTP = () => {
    setVerificationType("totp");
    setStep("verify");
  };

  const verifyAndProceed = () => {
    if (verificationCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez entrer un code à 6 chiffres",
      });
      return;
    }
    setStep("newpassword");
  };

  const changePassword = async () => {
    // Validate passwords
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      toast({
        variant: "destructive",
        title: "Mot de passe invalide",
        description: validation.error,
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session non trouvée");

      const { data, error } = await supabase.functions.invoke("change-password", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          newPassword,
          verificationCode,
          verificationType,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Mot de passe changé",
        description: "Votre mot de passe a été mis à jour avec succès.",
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de changer le mot de passe",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordValidation = validatePassword(newPassword);

  return (
    <Dialog open={open} onOpenChange={forceChange ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Changer le mot de passe</DialogTitle>
          <DialogDescription>
            {forceChange
              ? "Vous devez changer votre mot de passe pour continuer."
              : "Sécurisez votre compte avec un nouveau mot de passe."}
          </DialogDescription>
        </DialogHeader>

        {step === "choose" && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Choisissez votre méthode de vérification:
            </p>
            <div className="grid gap-3">
              <Button
                variant="outline"
                className="h-auto py-4 justify-start"
                onClick={sendOTP}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                ) : (
                  <Mail className="h-5 w-5 mr-3" />
                )}
                <div className="text-left">
                  <p className="font-medium">Code par email</p>
                  <p className="text-xs text-muted-foreground">
                    Recevoir un code à 6 chiffres par email
                  </p>
                </div>
              </Button>

              {hasTOTP && (
                <Button
                  variant="outline"
                  className="h-auto py-4 justify-start"
                  onClick={useTOTP}
                  disabled={isLoading}
                >
                  <Smartphone className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <p className="font-medium">Microsoft Authenticator</p>
                    <p className="text-xs text-muted-foreground">
                      Utiliser votre application d'authentification
                    </p>
                  </div>
                </Button>
              )}
            </div>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-4 py-4">
            <div className="text-center space-y-2">
              {verificationType === "otp" ? (
                <>
                  <Mail className="h-12 w-12 mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Entrez le code envoyé à <strong>{maskedEmail}</strong>
                  </p>
                </>
              ) : (
                <>
                  <Smartphone className="h-12 w-12 mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Entrez le code de Microsoft Authenticator
                  </p>
                </>
              )}
            </div>

            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={verificationCode}
                onChange={setVerificationCode}
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
            </div>

            {verificationType === "otp" && (
              <div className="text-center">
                <Button variant="link" size="sm" onClick={sendOTP} disabled={isLoading}>
                  Renvoyer le code
                </Button>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("choose")}>
                Retour
              </Button>
              <Button onClick={verifyAndProceed} disabled={verificationCode.length !== 6}>
                Continuer
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "newpassword" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Password strength indicator */}
            {newPassword && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${getStrengthColor(passwordValidation.strength)}`}
                      style={{
                        width:
                          passwordValidation.strength === "strong"
                            ? "100%"
                            : passwordValidation.strength === "medium"
                            ? "66%"
                            : "33%",
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium">
                    {getStrengthLabel(passwordValidation.strength)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div className="flex items-center gap-1">
                    {passwordValidation.requirements.minLength ? (
                      <Check className="h-3 w-3 text-success" />
                    ) : (
                      <X className="h-3 w-3 text-destructive" />
                    )}
                    <span>12+ caractères</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {passwordValidation.requirements.hasUpperCase ? (
                      <Check className="h-3 w-3 text-success" />
                    ) : (
                      <X className="h-3 w-3 text-destructive" />
                    )}
                    <span>Majuscules</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {passwordValidation.requirements.hasLowerCase ? (
                      <Check className="h-3 w-3 text-success" />
                    ) : (
                      <X className="h-3 w-3 text-destructive" />
                    )}
                    <span>Minuscules</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {passwordValidation.requirements.hasNumbers ? (
                      <Check className="h-3 w-3 text-success" />
                    ) : (
                      <X className="h-3 w-3 text-destructive" />
                    )}
                    <span>Chiffres</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {passwordValidation.requirements.hasSpecialChar ? (
                      <Check className="h-3 w-3 text-success" />
                    ) : (
                      <X className="h-3 w-3 text-destructive" />
                    )}
                    <span>Caractères spéciaux</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">
                  Les mots de passe ne correspondent pas
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("verify")} disabled={isLoading}>
                Retour
              </Button>
              <Button
                onClick={changePassword}
                disabled={
                  isLoading ||
                  !passwordValidation.valid ||
                  newPassword !== confirmPassword
                }
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Changer le mot de passe
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
