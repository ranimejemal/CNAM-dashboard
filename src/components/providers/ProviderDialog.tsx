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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Provider = Database["public"]["Tables"]["health_providers"]["Row"];
type ProviderType = Database["public"]["Enums"]["provider_type"];
type ProviderStatus = Database["public"]["Enums"]["provider_status"];

interface ProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider?: Provider | null;
  onSuccess: () => void;
}

export function ProviderDialog({ open, onOpenChange, provider, onSuccess }: ProviderDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    provider_code: "",
    name: "",
    type: "doctor" as ProviderType,
    specialty: "",
    address: "",
    phone: "",
    email: "",
    status: "pending" as ProviderStatus,
  });
  const { toast } = useToast();
  const isEditing = !!provider;

  useEffect(() => {
    if (provider) {
      setForm({
        provider_code: provider.provider_code,
        name: provider.name,
        type: provider.type,
        specialty: provider.specialty || "",
        address: provider.address,
        phone: provider.phone || "",
        email: provider.email || "",
        status: provider.status,
      });
    } else {
      setForm({
        provider_code: `PROV-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
        name: "",
        type: "doctor",
        specialty: "",
        address: "",
        phone: "",
        email: "",
        status: "pending",
      });
    }
  }, [provider, open]);

  const handleSubmit = async () => {
    if (!form.name || !form.address) {
      toast({
        variant: "destructive",
        title: "Erreur de validation",
        description: "Nom et adresse sont obligatoires.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && provider) {
        const { error } = await supabase
          .from("health_providers")
          .update({
            name: form.name,
            type: form.type,
            specialty: form.specialty || null,
            address: form.address,
            phone: form.phone || null,
            email: form.email || null,
            status: form.status,
            approval_date: form.status === "approved" && !provider.approval_date ? new Date().toISOString().split("T")[0] : provider.approval_date,
          })
          .eq("id", provider.id);

        if (error) throw error;
        toast({ title: "Succès", description: "Prestataire mis à jour avec succès." });
      } else {
        const { error } = await supabase.from("health_providers").insert({
          provider_code: form.provider_code,
          name: form.name,
          type: form.type,
          specialty: form.specialty || null,
          address: form.address,
          phone: form.phone || null,
          email: form.email || null,
          status: form.status,
          approval_date: form.status === "approved" ? new Date().toISOString().split("T")[0] : null,
        });

        if (error) throw error;
        toast({ title: "Succès", description: "Prestataire créé avec succès." });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifier le prestataire" : "Nouveau prestataire"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifiez les informations du prestataire." : "Ajoutez un nouveau prestataire de santé."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nom du prestataire"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as ProviderType })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hospital">Hôpital</SelectItem>
                  <SelectItem value="doctor">Médecin</SelectItem>
                  <SelectItem value="pharmacy">Pharmacie</SelectItem>
                  <SelectItem value="laboratory">Laboratoire</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialty">Spécialité</Label>
              <Input
                id="specialty"
                value={form.specialty}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                placeholder="Cardiologie, etc."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse *</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+216 XX XXX XXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Statut</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ProviderStatus })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="approved">Agréé</SelectItem>
                <SelectItem value="suspended">Suspendu</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
