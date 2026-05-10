import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShieldCheck, ShieldAlert, Loader2, CheckCircle, Send, Mail,
  ArrowLeft, RefreshCw, Upload, FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

type Step = "form" | "verify" | "success";
type InternalAccountType = "admin" | "it_engineer";

const REQUIRED_DOMAIN = "@esprim.tn";

export default function RegisterInternalPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("form");
  const [accountType, setAccountType] = useState<InternalAccountType>("it_engineer");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const emailDomainValid = email.toLowerCase().endsWith(REQUIRED_DOMAIN);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Fichier trop volumineux", description: "La taille maximale est de 10 Mo." });
      return;
    }
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({ variant: "destructive", title: "Type de fichier non supporté", description: "Formats acceptés : PDF, JPEG, PNG." });
      return;
    }
    setDocumentFile(file);
  };

  const uploadDocument = async (): Promise<string | null> => {
    if (!documentFile) return null;
    setIsUploading(true);
    try {
      const ext = documentFile.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `internal/${fileName}`;
      const { error } = await supabase.storage.from("registration-documents").upload(filePath, documentFile);
      if (error) throw error;
      return filePath;
    } catch (error) {
      console.error("Upload error:", error);
      toast({ variant: "destructive", title: "Erreur d'upload", description: "Impossible de télécharger le document." });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailDomainValid) {
      toast({ variant: "destructive", title: "Domaine non autorisé", description: `Seules les adresses ${REQUIRED_DOMAIN} sont acceptées pour ce type de compte.` });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-registration-otp", {
        body: {
          email: email.trim().toLowerCase(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          request_type: accountType,
        },
      });

      if (error) {
        const errAny = error as any;
        const serverMsg = errAny?.context?.body?.error || errAny?.context?.body?.message || errAny?.message || "Erreur lors de l'envoi du code";
        const isApproved = typeof serverMsg === "string" && serverMsg.includes("déjà été approuvé");
        toast({ variant: "destructive", title: "Impossible d'envoyer le code", description: serverMsg });
        if (isApproved) setTimeout(() => navigate("/login"), 0);
        return;
      }

      if (data?.error) {
        toast({ variant: "destructive", title: "Erreur", description: data.error as string });
        return;
      }

      setMaskedEmail(data.masked_email || email);
      setStep("verify");
      toast({ title: "Code envoyé", description: "Vérifiez votre boîte de réception institutionnelle." });
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur", description: error instanceof Error ? error.message : "Impossible d'envoyer le code." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      toast({ variant: "destructive", title: "Code incomplet", description: "Veuillez entrer le code à 6 chiffres." });
      return;
    }
    setIsSubmitting(true);
    try {
      const documentUrl = await uploadDocument();

      const { data, error } = await supabase.functions.invoke("verify-registration-otp", {
        body: {
          email: email.trim().toLowerCase(),
          otp_code: otpCode,
          phone: phone || null,
          message: message || null,
          request_type: accountType,
          document_url: documentUrl,
        },
      });

      if (error) throw new Error(error.message || "Erreur lors de la vérification");
      if (data?.error) {
        toast({ variant: "destructive", title: "Erreur", description: data.error });
        setOtpCode("");
        setIsSubmitting(false);
        return;
      }

      setStep("success");
      toast({ title: "Demande soumise", description: "Votre email a été vérifié et votre demande a été envoyée." });
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur", description: error instanceof Error ? error.message : "Impossible de vérifier le code." });
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
          request_type: accountType,
        },
      });
      if (error || data?.error) {
        const msg = data?.error || (error as any)?.context?.body?.error || error?.message || "Erreur";
        throw new Error(msg);
      }
      setOtpCode("");
      toast({ title: "Code renvoyé", description: "Un nouveau code a été envoyé à votre email institutionnel." });
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur", description: error instanceof Error ? error.message : "Impossible de renvoyer le code." });
    } finally {
      setIsResending(false);
    }
  };

  const accountTypeLabel = accountType === "admin" ? "Administrateur" : "IT Sécurité";
  const documentLabel = accountType === "admin"
    ? "Document de désignation administrative"
    : "Document de désignation IT / Sécurité";

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
              Votre demande de compte {accountTypeLabel} a été transmise à l'Admin Supérieur pour validation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground">
              <p className="mb-2"><strong>Prochaines étapes :</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Vérification de votre identité et documents</li>
                <li>Validation par l'Admin Supérieur</li>
                <li>Comparaison rôle demandé / preuve fournie</li>
                <li>Réception de vos identifiants par email</li>
              </ul>
            </div>
            <div className="text-center">
              <Link to="/login" className="text-primary hover:underline text-sm">Retour à la connexion</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Mail className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Vérifiez votre email</CardTitle>
            <CardDescription>Code envoyé à <strong>{maskedEmail}</strong></CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <Label className="text-sm text-muted-foreground">Entrez le code à 6 chiffres</Label>
              <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} disabled={isSubmitting}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                </InputOTPGroup>
              </InputOTP>
              <p className="text-xs text-muted-foreground">Le code expire dans 10 minutes</p>
            </div>
            <Button onClick={handleVerifyOTP} className="w-full" disabled={isSubmitting || otpCode.length !== 6}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Vérification...</> : <><CheckCircle className="mr-2 h-4 w-4" />Vérifier et soumettre</>}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <Button variant="ghost" size="sm" onClick={() => { setStep("form"); setOtpCode(""); }} disabled={isSubmitting}>
                <ArrowLeft className="mr-2 h-4 w-4" />Retour
              </Button>
              <Button variant="ghost" size="sm" onClick={handleResendOTP} disabled={isResending || isSubmitting}>
                {isResending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Renvoyer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-lg">
        {/* Account type toggle */}
        <div className="flex rounded-t-lg border-b overflow-hidden">
          <button
            type="button"
            onClick={() => setAccountType("it_engineer")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors",
              accountType === "it_engineer"
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-muted/50"
            )}
          >
            <ShieldCheck className="h-4 w-4" />
            IT Sécurité
          </button>
          <button
            type="button"
            onClick={() => setAccountType("admin")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors",
              accountType === "admin"
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-muted/50"
            )}
          >
            <ShieldAlert className="h-4 w-4" />
            Administrateur
          </button>
        </div>

        <CardHeader className="text-center">
          <CardTitle className="text-2xl">CNAM — Demande {accountTypeLabel}</CardTitle>
          <CardDescription>
            Accès réservé au personnel institutionnel. Email <strong>{REQUIRED_DOMAIN}</strong> obligatoire.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom *</Label>
                <Input id="firstName" placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} required disabled={isSubmitting} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom *</Label>
                <Input id="lastName" placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} required disabled={isSubmitting} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email institutionnel *</Label>
              <Input
                id="email"
                type="email"
                placeholder={`prenom.nom${REQUIRED_DOMAIN}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
                className={email && !emailDomainValid ? "border-destructive" : ""}
              />
              {email && !emailDomainValid && (
                <p className="text-xs text-destructive">Seules les adresses {REQUIRED_DOMAIN} sont acceptées.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" type="tel" placeholder="+216 XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isSubmitting} />
            </div>

            <div className="space-y-2">
              <Label>{documentLabel} (PDF ou image) *</Label>
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} className="hidden" />
              <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                {documentFile ? (
                  <><FileText className="h-4 w-4 text-green-600" /><span className="truncate">{documentFile.name}</span></>
                ) : (
                  <><Upload className="h-4 w-4" />Télécharger le document de désignation</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">Formats acceptés : PDF, JPEG, PNG. Max 10 Mo.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message (optionnel)</Label>
              <Textarea id="message" placeholder="Informations supplémentaires..." value={message} onChange={(e) => setMessage(e.target.value)} rows={2} disabled={isSubmitting} />
            </div>

            <div className="bg-muted p-3 rounded-md text-sm flex items-start gap-2">
              {accountType === "it_engineer" ? (
                <ShieldCheck className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              ) : (
                <ShieldAlert className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
              )}
              <div>
                <p className="font-medium">Validation par l'Admin Supérieur</p>
                <p className="text-muted-foreground">
                  Votre demande sera examinée et comparée avec le document fourni. Le rôle sera attribué uniquement après approbation.
                </p>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting || !documentFile || !emailDomainValid}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Envoi du code...</> : <><Send className="mr-2 h-4 w-4" />Recevoir le code de vérification</>}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>Déjà un compte ?{" "}
              <Link to="/login" className="text-primary hover:underline">Se connecter</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
