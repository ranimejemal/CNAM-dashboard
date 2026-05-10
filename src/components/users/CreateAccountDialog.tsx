import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Mail,
  User,
  Building2,
  ShieldCheck,
  ShieldAlert,
  Upload,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { normalizeUserCreationError } from "@/lib/errorHandling";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface CreateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type AccountType = "assure" | "prestataire" | "it_engineer" | "admin";

const SUPER_ADMIN_EMAIL = "ranime.jemal@esprim.tn";

function generateSecurePassword(): string {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const special = "!@#$%^&*";
  let password = "CNAM_";
  for (let i = 0; i < 4; i++) password += lowercase[Math.floor(Math.random() * lowercase.length)];
  for (let i = 0; i < 3; i++) password += uppercase[Math.floor(Math.random() * uppercase.length)];
  for (let i = 0; i < 2; i++) password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  return password;
}

const accountTypes: { key: AccountType; label: string; icon: React.ElementType; description: string; adminOnly?: boolean }[] = [
  { key: "assure", label: "Assuré", icon: User, description: "Compte utilisateur CNAM" },
  { key: "prestataire", label: "Prestataire", icon: Building2, description: "Établissement de santé" },
  { key: "it_engineer", label: "IT Sécurité", icon: ShieldCheck, description: "Ingénieur sécurité" },
  { key: "admin", label: "Admin", icon: ShieldAlert, description: "Administrateur", adminOnly: true },
];

export function CreateAccountDialog({ open, onOpenChange, onSuccess }: CreateAccountDialogProps) {
  const [accountType, setAccountType] = useState<AccountType>("assure");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { profile: currentProfile, isAdminSuperieur } = useAuth();

  const isSuperAdmin = currentProfile?.email === SUPER_ADMIN_EMAIL || isAdminSuperieur;

  // Shared fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Assuré fields
  const [cnamNumber, setCnamNumber] = useState("");

  // Prestataire fields
  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setCnamNumber("");
    setOrganizationName("");
    setOrganizationType("");
    setLicenseNumber("");
    setDocumentFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Fichier trop volumineux", description: "Max 10 Mo." });
      return;
    }
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({ variant: "destructive", title: "Type non supporté", description: "Formats : PDF, JPEG, PNG." });
      return;
    }
    setDocumentFile(file);
  };

  const uploadDocument = async (folder: string): Promise<string | null> => {
    if (!documentFile) return null;
    try {
      const ext = documentFile.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `${folder}/${fileName}`;
      const { error } = await supabase.storage.from("registration-documents").upload(filePath, documentFile);
      if (error) throw error;
      return filePath;
    } catch {
      toast({ variant: "destructive", title: "Erreur d'upload", description: "Impossible de télécharger le document." });
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!firstName || !lastName || !email) {
      toast({ variant: "destructive", title: "Champs requis", description: "Prénom, nom et email sont obligatoires." });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ variant: "destructive", title: "Email invalide", description: "Veuillez entrer une adresse email valide." });
      return;
    }

    // Type-specific validation
    if (accountType === "assure" && (!cnamNumber || !documentFile)) {
      toast({ variant: "destructive", title: "Champs requis", description: "Numéro CNAM et document sont obligatoires pour un assuré." });
      return;
    }
    if (accountType === "prestataire" && (!organizationName || !organizationType || !licenseNumber || !documentFile)) {
      toast({ variant: "destructive", title: "Champs requis", description: "Tous les champs d'établissement et le document d'accréditation sont obligatoires." });
      return;
    }
    if (accountType === "admin" && !isSuperAdmin) {
      toast({ variant: "destructive", title: "Non autorisé", description: "Seul l'Admin Supérieur peut créer des comptes admin." });
      return;
    }
    // IT/Admin require @esprim.tn domain
    if ((accountType === "it_engineer" || accountType === "admin") && !email.toLowerCase().endsWith("@esprim.tn")) {
      toast({ variant: "destructive", title: "Domaine non autorisé", description: "Les comptes IT/Admin nécessitent une adresse email @esprim.tn." });
      return;
    }
    if ((accountType === "it_engineer" || accountType === "admin") && !documentFile) {
      toast({ variant: "destructive", title: "Document requis", description: "Un document de désignation est obligatoire." });
      return;
    }

    setIsSubmitting(true);
    try {
      const folder = accountType === "assure" ? "user" : accountType === "prestataire" ? "prestataire" : "internal";
      const documentUrl = await uploadDocument(folder);

      const requestData = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone || null,
        status: "pending" as const,
        request_type: accountType === "assure" ? "user" : accountType === "prestataire" ? "prestataire" : accountType,
        document_url: documentUrl,
        cnam_number: accountType === "assure" ? cnamNumber : null,
        organization_name: accountType === "prestataire" ? organizationName : null,
        organization_type: accountType === "prestataire" ? organizationType : null,
        license_number: accountType === "prestataire" ? licenseNumber : null,
      };

      const { error } = await supabase.from("registration_requests").insert([requestData]);
      if (error) throw error;

      const typeLabels: Record<AccountType, string> = {
        assure: "assuré",
        prestataire: "prestataire",
        it_engineer: "IT Sécurité",
        admin: "administrateur",
      };

      toast({
        title: "Demande créée",
        description: `Demande d'inscription ${typeLabels[accountType]} créée en attente de validation par l'Admin Supérieur.`,
      });

      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating account:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: normalizeUserCreationError(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onOpenChange(false);
    }
  };

  const visibleTypes = accountTypes.filter((t) => !t.adminOnly || isSuperAdmin);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un compte</DialogTitle>
          <DialogDescription>
            Sélectionnez le type de compte à créer.
          </DialogDescription>
        </DialogHeader>

        {/* Account Type Tabs */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {visibleTypes.map((type) => {
            const Icon = type.icon;
            const isActive = accountType === type.key;
            return (
              <button
                key={type.key}
                type="button"
                onClick={() => { setAccountType(type.key); setDocumentFile(null); }}
                disabled={isSubmitting}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center transition-all",
                  isActive
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted/50"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium leading-tight">{type.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form */}
        <div className="space-y-4 pt-2">
          {/* Shared fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{accountType === "prestataire" ? "Prénom du responsable" : "Prénom"} *</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Prénom" disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label>{accountType === "prestataire" ? "Nom du responsable" : "Nom"} *</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nom" disabled={isSubmitting} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" disabled={isSubmitting} />
          </div>

          <div className="space-y-2">
            <Label>Téléphone</Label>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+216 XX XXX XXX" disabled={isSubmitting} />
          </div>

          {/* Assuré-specific */}
          {accountType === "assure" && (
            <>
              <div className="space-y-2">
                <Label>Numéro CNAM *</Label>
                <Input value={cnamNumber} onChange={(e) => setCnamNumber(e.target.value)} placeholder="Ex: CNAM-123456789" disabled={isSubmitting} />
              </div>
              <div className="space-y-2">
                <Label>Document CNAM (PDF ou image) *</Label>
                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} className="hidden" />
                <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                  {documentFile ? <><FileText className="h-4 w-4 text-primary" /><span className="truncate">{documentFile.name}</span></> : <><Upload className="h-4 w-4" />Télécharger le document CNAM</>}
                </Button>
              </div>
            </>
          )}

          {/* Prestataire-specific */}
          {accountType === "prestataire" && (
            <>
              <div className="space-y-2">
                <Label>Nom de l'établissement *</Label>
                <Input value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="Ex: Clinique El Manar" disabled={isSubmitting} />
              </div>
              <div className="space-y-2">
                <Label>Type d'établissement *</Label>
                <Select value={organizationType} onValueChange={setOrganizationType} disabled={isSubmitting}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hospital">Hôpital</SelectItem>
                    <SelectItem value="doctor">Cabinet médical</SelectItem>
                    <SelectItem value="pharmacy">Pharmacie</SelectItem>
                    <SelectItem value="laboratory">Laboratoire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Numéro de licence *</Label>
                <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="Ex: LIC-2024-XXXX" disabled={isSubmitting} />
              </div>
              <div className="space-y-2">
                <Label>Documents d'accréditation *</Label>
                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} className="hidden" />
                <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                  {documentFile ? <><FileText className="h-4 w-4 text-primary" /><span className="truncate">{documentFile.name}</span></> : <><Upload className="h-4 w-4" />Télécharger les documents</>}
                </Button>
              </div>
            </>
          )}

          {/* IT Engineer fields */}
          {accountType === "it_engineer" && (
            <>
              <div className="space-y-2">
                <Label>Document de désignation IT / Sécurité *</Label>
                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} className="hidden" />
                <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                  {documentFile ? <><FileText className="h-4 w-4 text-primary" /><span className="truncate">{documentFile.name}</span></> : <><Upload className="h-4 w-4" />Télécharger le document</>}
                </Button>
              </div>
              <div className="bg-muted p-3 rounded-md text-sm flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 mt-0.5 text-primary" />
                <div>
                  <p className="font-medium">Demande IT Sécurité</p>
                  <p className="text-muted-foreground">Email @esprim.tn requis. La demande sera soumise à l'Admin Supérieur pour validation. Le rôle sera attribué automatiquement après approbation.</p>
                </div>
              </div>
            </>
          )}

          {/* Admin fields */}
          {accountType === "admin" && (
            <>
              <div className="space-y-2">
                <Label>Document de désignation administrative *</Label>
                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} className="hidden" />
                <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                  {documentFile ? <><FileText className="h-4 w-4 text-primary" /><span className="truncate">{documentFile.name}</span></> : <><Upload className="h-4 w-4" />Télécharger le document</>}
                </Button>
              </div>
              <div className="bg-muted p-3 rounded-md text-sm flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 mt-0.5 text-destructive" />
                <div>
                  <p className="font-medium">Demande Admin</p>
                  <p className="text-muted-foreground">Email @esprim.tn requis. La demande sera soumise à l'Admin Supérieur pour validation.</p>
                </div>
              </div>
            </>
          )}

          {/* Assuré/Prestataire pending info */}
          {(accountType === "assure" || accountType === "prestataire") && (
            <div className="bg-muted p-3 rounded-md text-sm flex items-start gap-2">
              <Mail className="h-4 w-4 mt-0.5 text-primary" />
              <div>
                <p className="font-medium">Vérification requise</p>
                <p className="text-muted-foreground">La demande sera créée en statut « en attente ». Vous pourrez l'approuver depuis la liste des demandes d'inscription.</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Créer la demande
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
