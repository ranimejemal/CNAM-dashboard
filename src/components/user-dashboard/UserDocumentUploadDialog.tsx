import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Upload } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId?: string;
  onSuccess: () => void;
}

const documentTypes = [
  "Attestation", "Facture", "Ordonnance", "Certificat", "Rapport", "Carte CNAM", "Bilan"
];

export function UserDocumentUploadDialog({ open, onOpenChange, memberId, onSuccess }: Props) {
  const [documentType, setDocumentType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!memberId) {
      toast({ variant: "destructive", title: "Erreur", description: "Votre profil CNAM n'est pas encore lié." });
      return;
    }
    if (!documentType || !file) {
      toast({ variant: "destructive", title: "Champs requis", description: "Veuillez sélectionner un type et un fichier." });
      return;
    }

    setIsSubmitting(true);
    try {
      const filePath = `${memberId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("documents").insert({
        insured_member_id: memberId,
        document_type: documentType,
        file_name: file.name,
        file_url: filePath,
        file_size: file.size,
        created_by: user?.id,
      });
      if (dbError) throw dbError;

      toast({ title: "Document téléversé", description: "Votre document a été soumis pour vérification." });
      onOpenChange(false);
      setDocumentType(""); setFile(null);
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
          <DialogTitle>Téléverser un document</DialogTitle>
          <DialogDescription>Ajoutez un document à votre dossier CNAM</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type de document *</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {documentTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Fichier *</Label>
            <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            {file && <p className="text-xs text-muted-foreground">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Téléverser
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
