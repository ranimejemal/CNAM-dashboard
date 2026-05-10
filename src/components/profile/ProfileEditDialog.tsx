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
import { Loader2 } from "lucide-react";
import { AvatarUpload } from "./AvatarUpload";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
}

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  onSuccess: () => void;
  isAdmin?: boolean;
}

export function ProfileEditDialog({
  open,
  onOpenChange,
  profile,
  onSuccess,
  isAdmin = false,
}: ProfileEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    avatar_url: null as string | null,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      setForm({
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone: profile.phone || "",
        avatar_url: profile.avatar_url,
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast({
        variant: "destructive",
        title: "Erreur de validation",
        description: "Le prénom et le nom sont obligatoires.",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast({
        variant: "destructive",
        title: "Erreur de validation",
        description: "Veuillez entrer une adresse email valide.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Use Edge Function for update to handle admin operations properly
      const { data, error } = await supabase.functions.invoke("update-user", {
        body: {
          userId: profile.user_id,
          firstName: form.first_name.trim(),
          lastName: form.last_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          avatarUrl: form.avatar_url,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Profil mis à jour",
        description: "Les informations ont été sauvegardées avec succès.",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder les modifications.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAvatarChange = (url: string | null) => {
    setForm((prev) => ({ ...prev, avatar_url: url }));
  };

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le profil</DialogTitle>
          <DialogDescription>
            Modifiez les informations du profil utilisateur.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar Upload */}
          <AvatarUpload
            userId={profile.user_id}
            currentAvatarUrl={form.avatar_url}
            firstName={form.first_name}
            lastName={form.last_name}
            onAvatarChange={handleAvatarChange}
            size="lg"
          />

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-first-name">Prénom *</Label>
              <Input
                id="edit-first-name"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                placeholder="Jean"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-last-name">Nom *</Label>
              <Input
                id="edit-last-name"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                placeholder="Dupont"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Email *</Label>
            <Input
              id="edit-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jean.dupont@example.com"
            />
            {isAdmin && form.email !== profile.email && (
              <p className="text-xs text-muted-foreground">
                Le changement d'email sera enregistré dans le profil.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-phone">Téléphone</Label>
            <Input
              id="edit-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+216 XX XXX XXX"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
