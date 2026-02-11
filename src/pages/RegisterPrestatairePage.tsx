import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Loader2, CheckCircle, Send, Mail, ArrowLeft, RefreshCw, Upload, FileText, User } from "lucide-react";
import cnamIcon from "@/assets/cnam-icon.ico";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type Step = "form" | "verify" | "success";

export default function RegisterPrestatairePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [message, setMessage] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Fichier trop volumineux", description: "Max 10 Mo." });
      return;
    }
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({ variant: "destructive", title: "Type non supporté", description: "Formats : PDF, JPEG, PNG." });
      return;
    }
    setDocumentFile(file);
  };

  const uploadDocument = async (): Promise<string | null> => {
    if (!documentFile) return null;
    try {
      const ext = documentFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `prestataire/${fileName}`;
      const { error } = await supabase.storage.from('registration-documents').upload(filePath, documentFile);
      if (error) throw error;
      return filePath;
    } catch (error) {
      console.error("Upload error:", error);
      toast({ variant: "destructive", title: "Erreur d'upload", description: "Impossible de télécharger le document." });
      return null;
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
        const serverMsg = errAny?.context?.body?.error || errAny?.message || "Erreur";
        toast({ variant: "destructive", title: "Erreur", description: serverMsg });
        if (typeof serverMsg === "string" && serverMsg.includes("déjà été approuvé")) setTimeout(() => navigate("/login"), 0);
        return;
      }
      if (data?.error) {
        toast({ variant: "destructive", title: "Erreur", description: data.error });
        return;
      }
      setMaskedEmail(data.masked_email || email);
      setStep("verify");
      toast({ title: "Code envoyé", description: "Vérifiez votre boîte de réception." });
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur", description: error instanceof Error ? error.message : "Erreur inconnue." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) return;
    setIsSubmitting(true);
    try {
      const documentUrl = await uploadDocument();
      const { data, error } = await supabase.functions.invoke("verify-registration-otp", {
        body: {
          email: email.trim().toLowerCase(),
          otp_code: otpCode,
          phone: phone || null,
          message: message || null,
          request_type: "prestataire",
          organization_name: organizationName,
          organization_type: organizationType,
          license_number: licenseNumber,
          document_url: documentUrl,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) {
        toast({ variant: "destructive", title: "Erreur", description: data.error });
        setOtpCode("");
        setIsSubmitting(false);
        return;
      }
      setStep("success");
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur", description: error instanceof Error ? error.message : "Erreur." });
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
      if (error || data?.error) throw new Error(data?.error || (error as any)?.message || "Erreur");
      setOtpCode("");
      toast({ title: "Code renvoyé" });
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur", description: error instanceof Error ? error.message : "Erreur." });
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
            <CardTitle className="text-2xl text-green-700">Demande soumise !</CardTitle>
            <CardDescription className="text-base mt-2">
              Votre demande d'inscription prestataire a été transmise. Un administrateur vérifiera vos documents d'accréditation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground">
              <p className="mb-2"><strong>Prochaines étapes :</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Vérification de vos documents d'accréditation</li>
                <li>Validation de votre numéro de licence</li>
                <li>Approbation par un administrateur</li>
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
              <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} disabled={isSubmitting}>
                <InputOTPGroup>
                  {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={handleVerifyOTP} className="w-full" disabled={isSubmitting || otpCode.length !== 6}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Vérification...</> : <><CheckCircle className="mr-2 h-4 w-4" />Vérifier et soumettre</>}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <Button variant="ghost" size="sm" onClick={() => { setStep("form"); setOtpCode(""); }}>
                <ArrowLeft className="mr-2 h-4 w-4" />Retour
              </Button>
              <Button variant="ghost" size="sm" onClick={handleResendOTP} disabled={isResending}>
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
          <Link to="/register" className="flex-1 flex items-center justify-center gap-2 py-3 text-muted-foreground hover:bg-muted/50 transition-colors text-sm">
            <img src={cnamIcon} alt="CNAM" className="h-4 w-4" />
            Assuré
          </Link>
          <div className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-medium text-sm">
            <Building2 className="h-4 w-4" />
            Prestataire
          </div>
        </div>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">CNAM — Inscription Prestataire</CardTitle>
          <CardDescription>Inscrivez votre établissement de santé auprès de la CNAM.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prénom du responsable *</Label>
                <Input placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} required disabled={isSubmitting} />
              </div>
              <div className="space-y-2">
                <Label>Nom du responsable *</Label>
                <Input placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} required disabled={isSubmitting} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nom de l'établissement *</Label>
              <Input placeholder="Ex: Clinique El Manar" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} required disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label>Type d'établissement *</Label>
              <Select value={organizationType} onValueChange={setOrganizationType} disabled={isSubmitting}>
                <SelectTrigger><SelectValue placeholder="Sélectionner le type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hospital">Hôpital</SelectItem>
                  <SelectItem value="doctor">Cabinet médical</SelectItem>
                  <SelectItem value="pharmacy">Pharmacie</SelectItem>
                  <SelectItem value="laboratory">Laboratoire</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Numéro de licence / agrément *</Label>
              <Input placeholder="Ex: LIC-2024-XXXX" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} required disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label>Email professionnel *</Label>
              <Input type="email" placeholder="contact@etablissement.tn" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input type="tel" placeholder="+216 XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label>Documents d'accréditation (PDF ou image) *</Label>
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} className="hidden" />
              <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                {documentFile ? (
                  <><FileText className="h-4 w-4 text-green-600" /><span className="truncate">{documentFile.name}</span></>
                ) : (
                  <><Upload className="h-4 w-4" />Télécharger les documents</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">Formats : PDF, JPEG, PNG. Max 10 Mo.</p>
            </div>
            <div className="space-y-2">
              <Label>Message (optionnel)</Label>
              <Textarea placeholder="Informations complémentaires..." value={message} onChange={(e) => setMessage(e.target.value)} rows={2} disabled={isSubmitting} />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting || !documentFile || !organizationType || !licenseNumber}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Envoi...</> : <><Send className="mr-2 h-4 w-4" />Recevoir le code de vérification</>}
            </Button>
          </form>
          <div className="mt-4 space-y-2 text-center text-sm text-muted-foreground">
            <p>Déjà un compte ?{" "}
              <Link to="/login" className="text-primary hover:underline">Se connecter</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
