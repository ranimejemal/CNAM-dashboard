import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId?: string;
  onSuccess: () => void;
}

const serviceTypes = [
  "Consultation", "Hospitalisation", "Pharmacie", "Analyse", "Radiologie",
  "Chirurgie", "Soins dentaires", "Optique", "Kinésithérapie", "Autre"
];

export function UserSubmitRequestDialog({ open, onOpenChange, memberId, onSuccess }: Props) {
  const [serviceType, setServiceType] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [providers, setProviders] = useState<{ id: string; name: string }[]>([]);
  const [providerId, setProviderId] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      supabase.from("health_providers").select("id, name").eq("status", "approved").order("name").then(({ data }) => {
        setProviders(data || []);
      });
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!memberId) {
      toast({ variant: "destructive", title: "Erreur", description: "Votre profil CNAM n'est pas encore lié. Contactez l'administration." });
      return;
    }
    if (!serviceType || !amount || !providerId) {
      toast({ variant: "destructive", title: "Champs requis", description: "Veuillez remplir tous les champs obligatoires." });
      return;
    }

    setIsSubmitting(true);
    try {
      const refNumber = `RMB-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from("reimbursements").insert({
        reference_number: refNumber,
        insured_member_id: memberId,
        provider_id: providerId,
        service_type: serviceType,
        amount_requested: parseFloat(amount),
        description: description || null,
        created_by: user?.id,
      });
      if (error) throw error;
      toast({ title: "Demande soumise", description: `Référence: ${refNumber}` });
      onOpenChange(false);
      setServiceType(""); setAmount(""); setDescription(""); setProviderId("");
      onSuccess();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erreur", description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle demande de remboursement</DialogTitle>
          <DialogDescription>Remplissez les informations de votre demande</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type de service *</Label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {serviceTypes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Prestataire *</Label>
            <Select value={providerId} onValueChange={setProviderId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Montant (TND) *</Label>
            <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Détails supplémentaires..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Soumettre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
