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

type InsuredMember = Database["public"]["Tables"]["insured_members"]["Row"];
type MemberStatus = Database["public"]["Enums"]["member_status"];

interface MemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: InsuredMember | null;
  onSuccess: () => void;
}

export function MemberDialog({ open, onOpenChange, member, onSuccess }: MemberDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    cin: "",
    first_name: "",
    last_name: "",
    date_of_birth: "",
    insurance_number: "",
    email: "",
    phone: "",
    address: "",
    status: "active" as MemberStatus,
    card_expiry_date: "",
  });
  const { toast } = useToast();
  const isEditing = !!member;

  useEffect(() => {
    if (member) {
      setForm({
        cin: member.cin,
        first_name: member.first_name,
        last_name: member.last_name,
        date_of_birth: member.date_of_birth,
        insurance_number: member.insurance_number,
        email: member.email || "",
        phone: member.phone || "",
        address: member.address || "",
        status: member.status,
        card_expiry_date: member.card_expiry_date || "",
      });
    } else {
      setForm({
        cin: "",
        first_name: "",
        last_name: "",
        date_of_birth: "",
        insurance_number: `CNAM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`,
        email: "",
        phone: "",
        address: "",
        status: "active",
        card_expiry_date: "",
      });
    }
  }, [member, open]);

  const handleSubmit = async () => {
    if (!form.cin || !form.first_name || !form.last_name || !form.date_of_birth) {
      toast({
        variant: "destructive",
        title: "Erreur de validation",
        description: "CIN, prénom, nom et date de naissance sont obligatoires.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && member) {
        const { error } = await supabase
          .from("insured_members")
          .update({
            cin: form.cin,
            first_name: form.first_name,
            last_name: form.last_name,
            date_of_birth: form.date_of_birth,
            email: form.email || null,
            phone: form.phone || null,
            address: form.address || null,
            status: form.status,
            card_expiry_date: form.card_expiry_date || null,
          })
          .eq("id", member.id);

        if (error) throw error;
        toast({ title: "Succès", description: "Assuré mis à jour avec succès." });
      } else {
        const { error } = await supabase.from("insured_members").insert({
          cin: form.cin,
          first_name: form.first_name,
          last_name: form.last_name,
          date_of_birth: form.date_of_birth,
          insurance_number: form.insurance_number,
          email: form.email || null,
          phone: form.phone || null,
          address: form.address || null,
          status: form.status,
          card_expiry_date: form.card_expiry_date || null,
        });

        if (error) throw error;
        toast({ title: "Succès", description: "Assuré créé avec succès." });
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
          <DialogTitle>{isEditing ? "Modifier l'assuré" : "Nouvel assuré"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifiez les informations de l'assuré." : "Créez un nouveau compte assuré."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Prénom *</Label>
              <Input
                id="first_name"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Nom *</Label>
              <Input
                id="last_name"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cin">CIN *</Label>
              <Input
                id="cin"
                value={form.cin}
                onChange={(e) => setForm({ ...form, cin: e.target.value })}
                placeholder="12345678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date de naissance *</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={form.date_of_birth}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="insurance_number">N° Assurance</Label>
            <Input
              id="insurance_number"
              value={form.insurance_number}
              onChange={(e) => setForm({ ...form, insurance_number: e.target.value })}
              disabled={isEditing}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+216 XX XXX XXX"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as MemberStatus })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="suspended">Suspendu</SelectItem>
                  <SelectItem value="expired">Expiré</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="card_expiry_date">Expiration carte</Label>
              <Input
                id="card_expiry_date"
                type="date"
                value={form.card_expiry_date}
                onChange={(e) => setForm({ ...form, card_expiry_date: e.target.value })}
              />
            </div>
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
