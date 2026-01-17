import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Loader2, CheckCircle, Send, Mail, ArrowLeft, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type Step = "form" | "verify" | "success";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-registration-otp", {
        body: {
          email: email.trim().toLowerCase(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      });

      // Supabase returns a FunctionsError for non-2xx responses
      if (error) {
        const errAny = error as any;
        const serverMsg =
          errAny?.context?.body?.error ||
          errAny?.context?.body?.message ||
          errAny?.message ||
          "Erreur lors de l'envoi du code";

        // If the account is already approved, guide the user to login
        const isApproved = typeof serverMsg === "string" && serverMsg.includes("déjà été approuvé");

        toast({
          variant: "destructive",
          title: "Impossible d'envoyer le code",
          description: serverMsg,
        });

        if (isApproved) {
          // Avoid rendering router Links in toast content; redirect directly.
          setTimeout(() => navigate("/login"), 0);
        }

        return;
      }

      if (data?.error) {
        const msg = data.error as string;
        const isApproved = typeof msg === "string" && msg.includes("déjà été approuvé");

        toast({
          variant: "destructive",
          title: "Erreur",
          description: msg,
        });

        if (isApproved) setTimeout(() => navigate("/login"), 0);
        return;
      }

      setMaskedEmail(data.masked_email || email);
      setStep("verify");
      toast({
        title: "Code envoyé",
        description: "Vérifiez votre boîte de réception.",
      });
    } catch (error) {
      console.error("Error sending OTP:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'envoyer le code.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Code incomplet",
        description: "Veuillez entrer le code à 6 chiffres.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("verify-registration-otp", {
        body: {
          email: email.trim().toLowerCase(),
          otp_code: otpCode,
          phone: phone || null,
          message: message || null,
        },
      });

      if (error) {
        throw new Error(error.message || "Erreur lors de la vérification");
      }

      if (data?.error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: data.error,
        });
        setOtpCode("");
        setIsSubmitting(false);
        return;
      }

      setStep("success");
      toast({
        title: "Demande soumise",
        description: "Votre email a été vérifié et votre demande a été envoyée.",
      });
    } catch (error) {
      console.error("Error verifying OTP:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de vérifier le code.",
      });
      setOtpCode("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    setIsResending(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-registration-otp", {
        body: {
          email: email.trim().toLowerCase(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      });

       if (error || data?.error) {
         const msg = data?.error || (error as any)?.context?.body?.error || error?.message || "Erreur";
         const isApproved = typeof msg === "string" && msg.includes("déjà été approuvé");
         if (isApproved) setTimeout(() => navigate("/login"), 0);
         throw new Error(msg);
       }

      setOtpCode("");
      toast({
        title: "Code renvoyé",
        description: "Un nouveau code a été envoyé à votre email.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de renvoyer le code.",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleBack = () => {
    setStep("form");
    setOtpCode("");
  };

  // Success screen
  if (step === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-700">Demande envoyée !</CardTitle>
            <CardDescription className="text-base mt-2">
              Votre email a été vérifié et votre demande de création de compte a été transmise aux administrateurs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground">
              <p className="mb-2">
                <strong>Que se passe-t-il ensuite ?</strong>
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Un administrateur examinera votre demande</li>
                <li>Vous recevrez un email avec vos identifiants</li>
                <li>Délai de traitement habituel : 24-48h</li>
              </ul>
            </div>
            <div className="text-center">
              <Link to="/login" className="text-primary hover:underline text-sm">
                Retour à la connexion
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // OTP verification screen
  if (step === "verify") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Mail className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Vérifiez votre email</CardTitle>
            <CardDescription>
              Un code de vérification a été envoyé à <strong>{maskedEmail}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <Label htmlFor="otp" className="text-sm text-muted-foreground">
                Entrez le code à 6 chiffres
              </Label>
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={setOtpCode}
                disabled={isSubmitting}
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
              <p className="text-xs text-muted-foreground">
                Le code expire dans 10 minutes
              </p>
            </div>

            <Button
              onClick={handleVerifyOTP}
              className="w-full"
              disabled={isSubmitting || otpCode.length !== 6}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Vérification...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Vérifier et soumettre
                </>
              )}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResendOTP}
                disabled={isResending || isSubmitting}
              >
                {isResending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Renvoyer le code
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form screen
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Heart className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">CNAM - Demande d'accès</CardTitle>
          <CardDescription>
            Soumettez une demande pour obtenir un compte. Un code de vérification sera envoyé à votre email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom *</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Prénom"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom *</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Nom"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email professionnel *</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.tn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+216 XX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message (optionnel)</Label>
              <Textarea
                id="message"
                placeholder="Précisez votre rôle ou le motif de votre demande..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                disabled={isSubmitting}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi du code...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Recevoir le code de vérification
                </>
              )}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Se connecter
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
