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
import { Textarea } from "@/components/ui/textarea";
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

type Reimbursement = Database["public"]["Tables"]["reimbursements"]["Row"];
type ReimbursementStatus = Database["public"]["Enums"]["reimbursement_status"];

interface ReimbursementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reimbursement?: Reimbursement | null;
  members: { id: string; first_name: string; last_name: string }[];
  providers: { id: string; name: string }[];
  onSuccess: () => void;
  mode?: "create" | "edit" | "approve" | "reject";
}

export function ReimbursementDialog({
  open,
  onOpenChange,
  reimbursement,
  members,
  providers,
  onSuccess,
  mode = "create",
}: ReimbursementDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    insured_member_id: "",
    provider_id: "",
    service_type: "",
    description: "",
    amount_requested: "",
    amount_approved: "",
    status: "pending" as ReimbursementStatus,
    rejection_reason: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (reimbursement) {
      setForm({
        insured_member_id: reimbursement.insured_member_id,
        provider_id: reimbursement.provider_id,
        service_type: reimbursement.service_type,
        description: reimbursement.description || "",
        amount_requested: String(reimbursement.amount_requested),
        amount_approved: String(reimbursement.amount_approved || ""),
        status: reimbursement.status,
        rejection_reason: reimbursement.rejection_reason || "",
      });
    } else {
      setForm({
        insured_member_id: "",
        provider_id: "",
        service_type: "",
        description: "",
        amount_requested: "",
        amount_approved: "",
        status: "pending",
        rejection_reason: "",
      });
    }
  }, [reimbursement, open]);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      if (mode === "approve" && reimbursement) {
        const { error } = await supabase
          .from("reimbursements")
          .update({
            status: "approved",
            amount_approved: parseFloat(form.amount_approved) || parseFloat(form.amount_requested) * 0.8,
            validation_date: new Date().toISOString(),
          })
          .eq("id", reimbursement.id);

        if (error) throw error;
        toast({ title: "Succès", description: "Remboursement approuvé." });
      } else if (mode === "reject" && reimbursement) {
        if (!form.rejection_reason) {
          toast({ variant: "destructive", title: "Erreur", description: "Veuillez indiquer le motif de rejet." });
          setIsSubmitting(false);
          return;
        }
        const { error } = await supabase
          .from("reimbursements")
          .update({
            status: "rejected",
            rejection_reason: form.rejection_reason,
            validation_date: new Date().toISOString(),
          })
          .eq("id", reimbursement.id);

        if (error) throw error;
        toast({ title: "Succès", description: "Remboursement rejeté." });
      } else if (mode === "edit" && reimbursement) {
        const { error } = await supabase
          .from("reimbursements")
          .update({
            service_type: form.service_type,
            description: form.description || null,
            amount_requested: parseFloat(form.amount_requested),
            status: form.status,
          })
          .eq("id", reimbursement.id);

        if (error) throw error;
        toast({ title: "Succès", description: "Remboursement mis à jour." });
      } else {
        // Create new
        if (!form.insured_member_id || !form.provider_id || !form.service_type || !form.amount_requested) {
          toast({ variant: "destructive", title: "Erreur", description: "Tous les champs obligatoires doivent être remplis." });
          setIsSubmitting(false);
          return;
        }

        const refNumber = `RMB-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;
        
        const { error } = await supabase.from("reimbursements").insert({
          reference_number: refNumber,
          insured_member_id: form.insured_member_id,
          provider_id: form.provider_id,
          service_type: form.service_type,
          description: form.description || null,
          amount_requested: parseFloat(form.amount_requested),
          status: "pending",
        });

        if (error) throw error;
        toast({ title: "Succès", description: "Demande de remboursement créée." });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case "approve": return "Approuver le remboursement";
      case "reject": return "Rejeter le remboursement";
      case "edit": return "Modifier le remboursement";
      default: return "Nouvelle demande de remboursement";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            {mode === "approve" && "Confirmez l'approbation et le montant remboursé."}
            {mode === "reject" && "Indiquez le motif de rejet."}
            {mode === "edit" && "Modifiez les informations de la demande."}
            {mode === "create" && "Créez une nouvelle demande de remboursement."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {mode === "create" && (
            <>
              <div className="space-y-2">
                <Label>Assuré *</Label>
                <Select value={form.insured_member_id} onValueChange={(v) => setForm({ ...form, insured_member_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un assuré" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prestataire *</Label>
                <Select value={form.provider_id} onValueChange={(v) => setForm({ ...form, provider_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un prestataire" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {(mode === "create" || mode === "edit") && (
            <>
              <div className="space-y-2">
                <Label>Type de prestation *</Label>
                <Select value={form.service_type} onValueChange={(v) => setForm({ ...form, service_type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Consultation">Consultation</SelectItem>
                    <SelectItem value="Médicaments">Médicaments</SelectItem>
                    <SelectItem value="Analyses">Analyses</SelectItem>
                    <SelectItem value="Imagerie">Imagerie</SelectItem>
                    <SelectItem value="Hospitalisation">Hospitalisation</SelectItem>
                    <SelectItem value="Chirurgie">Chirurgie</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Montant demandé (TND) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.amount_requested}
                  onChange={(e) => setForm({ ...form, amount_requested: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Détails de la prestation..."
                />
              </div>
            </>
          )}

          {mode === "approve" && (
            <div className="space-y-2">
              <Label>Montant approuvé (TND)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amount_approved || String(parseFloat(form.amount_requested) * 0.8)}
                onChange={(e) => setForm({ ...form, amount_approved: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Montant demandé: {form.amount_requested} TND
              </p>
            </div>
          )}

          {mode === "reject" && (
            <div className="space-y-2">
              <Label>Motif de rejet *</Label>
              <Textarea
                value={form.rejection_reason}
                onChange={(e) => setForm({ ...form, rejection_reason: e.target.value })}
                placeholder="Indiquez la raison du rejet..."
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            variant={mode === "reject" ? "destructive" : "default"}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === "approve" && "Approuver"}
            {mode === "reject" && "Rejeter"}
            {mode === "edit" && "Enregistrer"}
            {mode === "create" && "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
