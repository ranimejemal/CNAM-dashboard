import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { normalizeUserCreationError } from "@/lib/errorHandling";
import { useAuth } from "@/hooks/useAuth";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const SUPER_ADMIN_EMAIL = "ranime.jemal@esprim.tn";

type AppRole = "admin" | "agent" | "validator";

// Generate a secure password that meets the complexity requirements
function generateSecurePassword(): string {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const special = "!@#$%^&*";
  
  let password = "CNAM_";
  
  // Add random lowercase (4 chars)
  for (let i = 0; i < 4; i++) {
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
  }
  
  // Add random uppercase (3 chars)
  for (let i = 0; i < 3; i++) {
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
  }
  
  // Add random numbers (2 chars)
  for (let i = 0; i < 2; i++) {
    password += numbers[Math.floor(Math.random() * numbers.length)];
  }
  
  // Add special char
  password += special[Math.floor(Math.random() * special.length)];
  
  return password;
}

export function CreateUserDialog({ open, onOpenChange, onSuccess }: CreateUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    roles: [] as AppRole[],
  });
  const { toast } = useToast();
  const { profile: currentProfile } = useAuth();

  const isSuperAdmin = currentProfile?.email === SUPER_ADMIN_EMAIL;

  const handleRoleToggle = (role: AppRole) => {
    setForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  };

  const handleSubmit = async () => {
    // Validate
    if (!form.email || !form.firstName || !form.lastName) {
      toast({
        variant: "destructive",
        title: "Erreur de validation",
        description: "Tous les champs obligatoires doivent être remplis.",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast({
        variant: "destructive",
        title: "Erreur de validation",
        description: "Veuillez entrer une adresse email valide.",
      });
      return;
    }

    if (form.roles.length === 0) {
      toast({
        variant: "destructive",
        title: "Erreur de validation",
        description: "Veuillez sélectionner au moins un rôle.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate a secure password automatically
      const tempPassword = generateSecurePassword();

      // Create the user
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: form.email.trim().toLowerCase(),
          password: tempPassword,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim() || undefined,
          roles: form.roles,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Send welcome email with credentials
      const { error: emailError } = await supabase.functions.invoke("send-welcome-email", {
        body: {
          email: form.email.trim().toLowerCase(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          tempPassword: tempPassword,
          role: form.roles[0], // Primary role for display
        },
      });

      if (emailError) {
        console.error("Welcome email error:", emailError);
        // Don't fail the whole process if email fails, but warn
        toast({
          title: "Utilisateur créé",
          description: `${form.firstName} ${form.lastName} a été créé, mais l'envoi de l'email a échoué. Veuillez lui communiquer ses identifiants manuellement.`,
        });
      } else {
        toast({
          title: "Utilisateur créé",
          description: `${form.firstName} ${form.lastName} a été créé. Un email avec ses identifiants a été envoyé.`,
        });
      }

      // Reset form
      setForm({
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
        roles: [],
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating user:", error);
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
      setForm({
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
        roles: [],
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un utilisateur</DialogTitle>
          <DialogDescription>
            Créez un nouveau compte. Un mot de passe sera généré automatiquement et envoyé par email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-first-name">Prénom *</Label>
              <Input
                id="new-first-name"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                placeholder="Jean"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-last-name">Nom *</Label>
              <Input
                id="new-last-name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                placeholder="Dupont"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-email">Email *</Label>
            <Input
              id="new-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jean.dupont@example.com"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-phone">Téléphone</Label>
            <Input
              id="new-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+216 XX XXX XXX"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label>Rôles *</Label>
            <div className="flex flex-wrap gap-4 pt-1">
              {isSuperAdmin && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={form.roles.includes("admin")}
                    onCheckedChange={() => handleRoleToggle("admin")}
                    disabled={isSubmitting}
                  />
                  <span className="text-sm">Administrateur</span>
                </label>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={form.roles.includes("agent")}
                  onCheckedChange={() => handleRoleToggle("agent")}
                  disabled={isSubmitting}
                />
                <span className="text-sm">Agent</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={form.roles.includes("validator")}
                  onCheckedChange={() => handleRoleToggle("validator")}
                  disabled={isSubmitting}
                />
                <span className="text-sm">Validateur</span>
              </label>
            </div>
          </div>

          <div className="bg-muted p-3 rounded-md text-sm flex items-start gap-2">
            <Mail className="h-4 w-4 mt-0.5 text-primary" />
            <div>
              <p className="font-medium">Mot de passe automatique</p>
              <p className="text-muted-foreground">
                Un mot de passe sécurisé sera généré et envoyé à l'adresse email de l'utilisateur.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Créer et envoyer les identifiants
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
