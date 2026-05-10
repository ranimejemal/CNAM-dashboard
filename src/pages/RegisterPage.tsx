import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, Send, Mail, ArrowLeft, RefreshCw, Upload, FileText, Building2 } from "lucide-react";
import cnamIcon from "@/assets/cnam-icon.ico";
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
  const [cnamNumber, setCnamNumber] = useState("");
  const [message, setMessage] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({ variant: "destructive", title: "Fichier trop volumineux", description: "La taille maximale est de 10 Mo." });
      return;
    }
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
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
      const ext = documentFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `user/${fileName}`;
      
      const { error } = await supabase.storage
        .from('registration-documents')
        .upload(filePath, documentFile);
      
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
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-registration-otp", {
        body: { email: email.trim().toLowerCase(), first_name: firstName.trim(), last_name: lastName.trim() },
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
        const msg = data.error as string;
        toast({ variant: "destructive", title: "Erreur", description: msg });
        if (typeof msg === "string" && msg.includes("déjà été approuvé")) setTimeout(() => navigate("/login"), 0);
        return;
      }

      setMaskedEmail(data.masked_email || email);
      setStep("verify");
      toast({ title: "Code envoyé", description: "Vérifiez votre boîte de réception." });
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
      // Upload document first if present
      const documentUrl = await uploadDocument();

      const { data, error } = await supabase.functions.invoke("verify-registration-otp", {
        body: {
          email: email.trim().toLowerCase(),
          otp_code: otpCode,
          phone: phone || null,
          message: message || null,
          request_type: "user",
          cnam_number: cnamNumber || null,
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
        body: { email: email.trim().toLowerCase(), first_name: firstName.trim(), last_name: lastName.trim() },
      });
      if (error || data?.error) {
        const msg = data?.error || (error as any)?.context?.body?.error || error?.message || "Erreur";
        if (typeof msg === "string" && msg.includes("déjà été approuvé")) setTimeout(() => navigate("/login"), 0);
        throw new Error(msg);
      }
      setOtpCode("");
      toast({ title: "Code renvoyé", description: "Un nouveau code a été envoyé à votre email." });
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur", description: error instanceof Error ? error.message : "Impossible de renvoyer le code." });
    } finally {
      setIsResending(false);
    }
  };

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
              Votre demande de création de compte a été transmise. Un administrateur vérifiera vos documents et votre identité.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground">
              <p className="mb-2"><strong>Prochaines étapes :</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Vérification de votre identité et documents CNAM</li>
                <li>Approbation par un administrateur</li>
                <li>Réception de vos identifiants par email</li>
                <li>Délai habituel : 24-48h</li>
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
                  {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
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
          <div className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-medium text-sm">
            <img src={cnamIcon} alt="CNAM" className="h-4 w-4" />
            Assuré
          </div>
          <Link to="/register/prestataire" className="flex-1 flex items-center justify-center gap-2 py-3 text-muted-foreground hover:bg-muted/50 transition-colors text-sm">
            <Building2 className="h-4 w-4" />
            Prestataire
          </Link>
        </div>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">CNAM — Inscription Assuré</CardTitle>
          <CardDescription>Créez votre compte en fournissant vos informations et votre document CNAM.</CardDescription>
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
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" placeholder="votre@email.tn" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" type="tel" placeholder="+216 XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnamNumber">Numéro d'identification CNAM *</Label>
              <Input id="cnamNumber" placeholder="Ex: CNAM-123456789" value={cnamNumber} onChange={(e) => setCnamNumber(e.target.value)} required disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label>Document CNAM (PDF ou image) *</Label>
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} className="hidden" />
              <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                {documentFile ? (
                  <><FileText className="h-4 w-4 text-green-600" /><span className="truncate">{documentFile.name}</span></>
                ) : (
                  <><Upload className="h-4 w-4" />Télécharger votre document CNAM</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">Formats acceptés : PDF, JPEG, PNG. Max 10 Mo.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message (optionnel)</Label>
              <Textarea id="message" placeholder="Informations supplémentaires..." value={message} onChange={(e) => setMessage(e.target.value)} rows={2} disabled={isSubmitting} />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting || !documentFile || !cnamNumber}>
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
