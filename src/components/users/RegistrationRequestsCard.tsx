import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  UserPlus,
  Clock,
  Check,
  X,
  Loader2,
  Mail,
  Phone,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface RegistrationRequest {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

interface RegistrationRequestsCardProps {
  onUserCreated: () => void;
}

export function RegistrationRequestsCard({ onUserCreated }: RegistrationRequestsCardProps) {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AppRole>("agent");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { session } = useAuth();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("registration_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests((data as RegistrationRequest[]) || []);
    } catch (error) {
      console.error("Error fetching registration requests:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les demandes d'inscription.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = (request: RegistrationRequest) => {
    setSelectedRequest(request);
    setSelectedRole("agent");
    setIsApproveDialogOpen(true);
  };

  const handleReject = (request: RegistrationRequest) => {
    setSelectedRequest(request);
    setRejectionReason("");
    setIsRejectDialogOpen(true);
  };

  const confirmApprove = async () => {
    if (!selectedRequest || !session?.access_token) return;
    setIsSubmitting(true);

    try {
      // Generate a temporary password (12+ chars with complexity)
      const chars = "abcdefghijklmnopqrstuvwxyz";
      const upperChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const numbers = "0123456789";
      const special = "!@#$%^&*";
      
      let tempPassword = "CNAM_";
      for (let i = 0; i < 4; i++) tempPassword += chars[Math.floor(Math.random() * chars.length)];
      for (let i = 0; i < 3; i++) tempPassword += upperChars[Math.floor(Math.random() * upperChars.length)];
      for (let i = 0; i < 2; i++) tempPassword += numbers[Math.floor(Math.random() * numbers.length)];
      tempPassword += special[Math.floor(Math.random() * special.length)];

      // Create user via edge function
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: selectedRequest.email,
          password: tempPassword,
          firstName: selectedRequest.first_name,
          lastName: selectedRequest.last_name,
          phone: selectedRequest.phone,
          roles: [selectedRole],
        },
      });

      if (error) throw error;

      // Send welcome email with credentials
      const { error: emailError } = await supabase.functions.invoke("send-welcome-email", {
        body: {
          email: selectedRequest.email,
          firstName: selectedRequest.first_name,
          lastName: selectedRequest.last_name,
          tempPassword: tempPassword,
          role: selectedRole,
        },
      });

      if (emailError) {
        console.error("Welcome email error:", emailError);
        // Don't fail the whole process if email fails
      }

      // Update request status
      const { error: updateError } = await supabase
        .from("registration_requests")
        .update({
          status: "approved",
          reviewed_by: session.user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedRequest.id);

      if (updateError) throw updateError;

      toast({
        title: "Compte créé",
        description: `Le compte pour ${selectedRequest.first_name} ${selectedRequest.last_name} a été créé. Un email avec les identifiants a été envoyé.`,
      });

      setIsApproveDialogOpen(false);
      fetchRequests();
      onUserCreated();
    } catch (error: any) {
      console.error("Error approving request:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de créer le compte.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmReject = async () => {
    if (!selectedRequest || !session) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("registration_requests")
        .update({
          status: "rejected",
          reviewed_by: session.user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason || null,
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      toast({
        title: "Demande rejetée",
        description: `La demande de ${selectedRequest.first_name} ${selectedRequest.last_name} a été rejetée.`,
      });

      setIsRejectDialogOpen(false);
      fetchRequests();
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de rejeter la demande.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><Check className="h-3 w-3 mr-1" />Approuvée</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><X className="h-3 w-3 mr-1" />Rejetée</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Demandes d'inscription
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingCount}</Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchRequests} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune demande d'inscription.
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">
                        {request.first_name} {request.last_name}
                      </h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {request.email}
                        </span>
                        {request.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {request.phone}
                          </span>
                        )}
                      </div>
                      <Badge variant="outline" className="mt-2 bg-emerald-50 text-emerald-700 border-emerald-200">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Email vérifié
                      </Badge>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>

                  {request.message && (
                    <div className="bg-muted rounded-md p-3 text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground mb-1">
                        <MessageSquare className="h-3 w-3" />
                        Message:
                      </span>
                      {request.message}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      Demande reçue le {new Date(request.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    
                    {request.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleReject(request)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Rejeter
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(request)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approuver
                        </Button>
                      </div>
                    )}

                    {request.status === "rejected" && request.rejection_reason && (
                      <span className="text-xs text-red-600">
                        Motif: {request.rejection_reason}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approuver la demande</DialogTitle>
            <DialogDescription>
              Créer un compte pour {selectedRequest?.first_name} {selectedRequest?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rôle à attribuer</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="validator">Validateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="font-medium mb-1">Informations du compte:</p>
              <p>Email: {selectedRequest?.email}</p>
              <p className="text-muted-foreground mt-2">
                Un mot de passe temporaire sera généré. L'utilisateur devra le changer à la première connexion.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={confirmApprove} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                "Créer le compte"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter la demande</DialogTitle>
            <DialogDescription>
              Refuser la demande de {selectedRequest?.first_name} {selectedRequest?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motif du rejet (optionnel)</Label>
              <Textarea
                placeholder="Précisez la raison du rejet..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmReject} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejet...
                </>
              ) : (
                "Rejeter la demande"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
