import { useState } from "react";
import { ActivityJournal } from "@/components/security/ActivityJournal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Phone, MapPin, Shield, CreditCard, Calendar, Edit2, Save, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  memberRecord: any;
  getStatusBadge: (status: string) => React.ReactNode;
  onRefresh: () => void;
}

export function UserProfileTab({ memberRecord, getStatusBadge, onRefresh }: Props) {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || "",
    last_name: profile?.last_name || "",
    phone: profile?.phone || "",
  });

  const initials = profile ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase() : "?";

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone || null,
        })
        .eq("user_id", user!.id);
      if (error) throw error;
      toast({ title: "Profil mis à jour", description: "Vos informations ont été enregistrées." });
      setEditing(false);
      onRefresh();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erreur", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      phone: profile?.phone || "",
    });
    setEditing(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Mon profil</h2>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="lg:row-span-2">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            <h3 className="text-lg font-semibold">{profile?.first_name} {profile?.last_name}</h3>
            <p className="text-sm text-muted-foreground">{profile?.email || user?.email}</p>
            <Badge variant="outline" className="mt-3 gap-1.5">
              <Shield className="h-3 w-3" />
              Assuré
            </Badge>
            <Separator className="my-4 w-full" />
            <div className="w-full space-y-3 text-left">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{profile?.email || user?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{profile?.phone || "Non renseigné"}</span>
              </div>
              {memberRecord?.address && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{memberRecord.address}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Editable Info */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" /> Informations personnelles
            </CardTitle>
            {!editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Edit2 className="h-4 w-4 mr-1" /> Modifier
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-1" /> Annuler
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Enregistrer
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Prénom</Label>
                {editing ? (
                  <Input value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} />
                ) : (
                  <p className="font-medium">{profile?.first_name || "—"}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Nom</Label>
                {editing ? (
                  <Input value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} />
                ) : (
                  <p className="font-medium">{profile?.last_name || "—"}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="font-medium text-muted-foreground">{profile?.email || user?.email || "—"}</p>
                <p className="text-xs text-muted-foreground italic">L'email ne peut pas être modifié</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Téléphone</Label>
                {editing ? (
                  <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+216 XX XXX XXX" />
                ) : (
                  <p className="font-medium">{profile?.phone || "Non renseigné"}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CNAM Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" /> Informations CNAM
            </CardTitle>
          </CardHeader>
          <CardContent>
            {memberRecord ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Numéro d'assurance</p>
                  <p className="font-semibold text-sm">{memberRecord.insurance_number}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">CIN</p>
                  <p className="font-semibold text-sm">{memberRecord.cin}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Statut</p>
                  <div className="mt-1">{getStatusBadge(memberRecord.status === "active" ? "approved" : "pending")}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Expiration carte</p>
                  <p className="font-semibold text-sm">{memberRecord.card_expiry_date ? format(new Date(memberRecord.card_expiry_date), "dd/MM/yyyy") : "—"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Date de naissance</p>
                  <p className="font-semibold text-sm">{memberRecord.date_of_birth ? format(new Date(memberRecord.date_of_birth), "dd/MM/yyyy") : "—"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Adresse</p>
                  <p className="font-semibold text-sm">{memberRecord.address || "Non renseignée"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 sm:col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Membre depuis</p>
                  <p className="font-semibold text-sm">{format(new Date(memberRecord.created_at), "dd/MM/yyyy")}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Aucune information CNAM liée à votre compte.</p>
                <p className="text-xs text-muted-foreground mt-1">Contactez l'administration pour lier votre dossier.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Journal */}
      <ActivityJournal />
    </div>
  );
}
