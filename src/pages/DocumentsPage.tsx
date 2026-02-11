import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Search,
  MoreVertical,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  File,
  FileCheck,
  FileX,
  Loader2,
  Filter,
  Download,
  Upload,
} from "lucide-react";
import { DocumentUploadDialog } from "@/components/documents/DocumentUploadDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { viewDocument, downloadDocument } from "@/lib/storageUtils";
import type { Database } from "@/integrations/supabase/types";

type Document = Database["public"]["Tables"]["documents"]["Row"];
type DocumentStatus = Database["public"]["Enums"]["document_status"];

interface DocumentWithMember extends Document {
  insured_member?: {
    first_name: string;
    last_name: string;
    insurance_number: string;
  };
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentWithMember[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentWithMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentWithMember | null>(null);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch members for upload dialog
  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase
        .from("insured_members")
        .select("id, first_name, last_name")
        .limit(100);
      if (data) {
        setMembers(data.map(m => ({ id: m.id, name: `${m.first_name} ${m.last_name}` })));
      }
    };
    fetchMembers();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("documents")
        .select(`
          *,
          insured_member:insured_members(first_name, last_name, insurance_number)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
      setFilteredDocuments(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les documents.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Filter documents
  useEffect(() => {
    let filtered = documents;

    // Tab filter
    if (activeTab !== "all") {
      filtered = filtered.filter((doc) => doc.status === activeTab);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (doc) =>
          doc.file_name.toLowerCase().includes(query) ||
          doc.document_type.toLowerCase().includes(query) ||
          doc.insured_member?.first_name.toLowerCase().includes(query) ||
          doc.insured_member?.last_name.toLowerCase().includes(query) ||
          doc.insured_member?.insurance_number.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((doc) => doc.document_type === typeFilter);
    }

    setFilteredDocuments(filtered);
  }, [searchQuery, typeFilter, activeTab, documents]);

  const handleVerify = (doc: DocumentWithMember) => {
    setSelectedDocument(doc);
    setVerificationNotes(doc.validation_notes || "");
    setIsVerifyDialogOpen(true);
  };

  const handleUpdateStatus = async (status: DocumentStatus) => {
    if (!selectedDocument) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("documents")
        .update({
          status,
          validation_notes: verificationNotes || null,
          validation_date: new Date().toISOString(),
          validator_id: user?.id,
        })
        .eq("id", selectedDocument.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `Document ${status === "approved" ? "approuvé" : "rejeté"} avec succès.`,
      });
      setIsVerifyDialogOpen(false);
      fetchDocuments();
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

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case "approved":
        return <Badge className="badge-success"><CheckCircle className="h-3 w-3 mr-1" />Approuvé</Badge>;
      case "rejected":
        return <Badge className="badge-destructive"><XCircle className="h-3 w-3 mr-1" />Rejeté</Badge>;
      default:
        return <Badge className="badge-warning"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
    }
  };

  const getDocumentIcon = (type: string) => {
    return <FileText className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const documentTypes = [...new Set(documents.map((d) => d.document_type))];

  // Enhanced stats with higher numbers for demo
  const baseStats = {
    total: documents.length,
    pending: documents.filter((d) => d.status === "pending").length,
    approved: documents.filter((d) => d.status === "approved").length,
    rejected: documents.filter((d) => d.status === "rejected").length,
  };

  const stats = {
    total: baseStats.total + 156847,
    pending: baseStats.pending + 3842,
    approved: baseStats.approved + 148256,
    rejected: baseStats.rejected + 4749,
    totalSize: "2.4 TB",
    avgProcessingTime: "1.8h",
    todayUploads: 847,
    weeklyGrowth: 12.5,
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Documents & Pièces justificatives</h1>
            <p className="text-muted-foreground">
              Gérez et vérifiez les documents des assurés.
            </p>
          </div>
          <Button onClick={() => setIsUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Téléverser un document
          </Button>
        </div>

        {/* Upload Dialog */}
        <DocumentUploadDialog
          open={isUploadDialogOpen}
          onOpenChange={setIsUploadDialogOpen}
          memberId={selectedMemberId || members[0]?.id}
          onSuccess={fetchDocuments}
        />

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <Card className="stat-card col-span-1 xl:col-span-2">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <File className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total documents</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.total)}</p>
                  <p className="text-xs text-success">+{stats.weeklyGrowth}% cette semaine</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card col-span-1 xl:col-span-2">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">En attente</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.pending)}</p>
                  <p className="text-xs text-muted-foreground">Temps moy: {stats.avgProcessingTime}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card col-span-1 xl:col-span-2">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <FileCheck className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Approuvés</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.approved)}</p>
                  <p className="text-xs text-success">94.5% taux d'approbation</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card col-span-1 xl:col-span-2">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <FileX className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rejetés</p>
                  <p className="text-2xl font-bold">{formatNumber(stats.rejected)}</p>
                  <p className="text-xs text-muted-foreground">3.0% du total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats Row */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="stat-card bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Stockage total</p>
                <p className="text-3xl font-bold text-primary">{stats.totalSize}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Uploads aujourd'hui</p>
                <p className="text-3xl font-bold text-accent">{stats.todayUploads}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card bg-gradient-to-br from-success/5 to-success/10 border-success/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Traités ce mois</p>
                <p className="text-3xl font-bold text-success">24.8K</p>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card bg-gradient-to-br from-warning/5 to-warning/10 border-warning/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Types de documents</p>
                <p className="text-3xl font-bold text-warning">18</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs and Filters */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <TabsList>
              <TabsTrigger value="all">Tous ({stats.total})</TabsTrigger>
              <TabsTrigger value="pending">En attente ({stats.pending})</TabsTrigger>
              <TabsTrigger value="approved">Approuvés ({stats.approved})</TabsTrigger>
              <TabsTrigger value="rejected">Rejetés ({stats.rejected})</TabsTrigger>
            </TabsList>
          </div>

          <Card className="mt-4">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom de fichier, assuré..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Type de document" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    {documentTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Liste des documents</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="table-header">
                          <th className="text-left py-3 px-4">Document</th>
                          <th className="text-left py-3 px-4">Assuré</th>
                          <th className="text-left py-3 px-4">Type</th>
                          <th className="text-left py-3 px-4">Taille</th>
                          <th className="text-left py-3 px-4">Date</th>
                          <th className="text-left py-3 px-4">Statut</th>
                          <th className="text-right py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {/* Demo documents list */}
                        {[
                          { id: "demo-1", file_name: "Attestation_Assurance_2024.pdf", member: "Ahmed Ben Ali", insurance: "CNAM-2024-78542", type: "Attestation", size: "2.4 MB", date: "16/01/2026", status: "approved" as const },
                          { id: "demo-2", file_name: "Facture_Clinique_Carthage.pdf", member: "Fatma Bouazizi", insurance: "CNAM-2024-65421", type: "Facture", size: "1.8 MB", date: "16/01/2026", status: "pending" as const },
                          { id: "demo-3", file_name: "Ordonnance_Medicale_Jan.pdf", member: "Mohamed Trabelsi", insurance: "CNAM-2024-89745", type: "Ordonnance", size: "856 KB", date: "15/01/2026", status: "approved" as const },
                          { id: "demo-4", file_name: "Certificat_Medical_Urgence.pdf", member: "Salma Hamdi", insurance: "CNAM-2024-32156", type: "Certificat", size: "1.2 MB", date: "15/01/2026", status: "pending" as const },
                          { id: "demo-5", file_name: "Rapport_Analyses_Labo.pdf", member: "Karim Jebali", insurance: "CNAM-2024-45678", type: "Rapport", size: "3.5 MB", date: "15/01/2026", status: "approved" as const },
                          { id: "demo-6", file_name: "Decharge_Hospitalisation.pdf", member: "Nadia Chaabane", insurance: "CNAM-2024-12345", type: "Décharge", size: "945 KB", date: "14/01/2026", status: "rejected" as const },
                          { id: "demo-7", file_name: "Facture_Pharmacie_Central.pdf", member: "Youssef Mejri", insurance: "CNAM-2024-78965", type: "Facture", size: "654 KB", date: "14/01/2026", status: "approved" as const },
                          { id: "demo-8", file_name: "Carte_Assurance_Renouvellement.pdf", member: "Amira Khelifi", insurance: "CNAM-2024-36985", type: "Carte", size: "412 KB", date: "14/01/2026", status: "pending" as const },
                          { id: "demo-9", file_name: "Prescription_Specialiste.pdf", member: "Hatem Ferchichi", insurance: "CNAM-2024-25874", type: "Prescription", size: "1.1 MB", date: "13/01/2026", status: "approved" as const },
                          { id: "demo-10", file_name: "Bilan_Sante_Annuel.pdf", member: "Rim Sassi", insurance: "CNAM-2024-96321", type: "Bilan", size: "4.2 MB", date: "13/01/2026", status: "approved" as const },
                          ...filteredDocuments.map(doc => ({
                            id: doc.id,
                            file_name: doc.file_name,
                            member: doc.insured_member ? `${doc.insured_member.first_name} ${doc.insured_member.last_name}` : "—",
                            insurance: doc.insured_member?.insurance_number || "—",
                            type: doc.document_type,
                            size: formatFileSize(doc.file_size),
                            date: new Date(doc.upload_date).toLocaleDateString("fr-FR"),
                            status: doc.status,
                          }))
                        ].map((doc) => (
                          <tr key={doc.id} className="hover:bg-muted/50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <FileText className="h-5 w-5 text-primary" />
                                </div>
                                <span className="font-medium truncate max-w-[200px]">
                                  {doc.file_name}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-medium">{doc.member}</p>
                                <p className="text-xs text-muted-foreground">{doc.insurance}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline">{doc.type}</Badge>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">{doc.size}</td>
                            <td className="py-3 px-4 text-muted-foreground">{doc.date}</td>
                            <td className="py-3 px-4">
                              {doc.status === "approved" ? (
                                <Badge className="badge-success"><CheckCircle className="h-3 w-3 mr-1" />Approuvé</Badge>
                              ) : doc.status === "rejected" ? (
                                <Badge className="badge-destructive"><XCircle className="h-3 w-3 mr-1" />Rejeté</Badge>
                              ) : (
                                <Badge className="badge-warning"><Clock className="h-3 w-3 mr-1" />En attente</Badge>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      // Find the actual document from filteredDocuments if it's a real doc
                                      const realDoc = filteredDocuments.find(d => d.id === doc.id);
                                      if (realDoc?.file_url) {
                                        try {
                                          await viewDocument(realDoc.file_url);
                                        } catch (error) {
                                          toast({
                                            variant: "destructive",
                                            title: "Erreur",
                                            description: "Impossible d'ouvrir le document.",
                                          });
                                        }
                                      }
                                    }}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Visualiser
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      const realDoc = filteredDocuments.find(d => d.id === doc.id);
                                      if (realDoc?.file_url) {
                                        try {
                                          await downloadDocument(realDoc.file_url, doc.file_name);
                                        } catch (error) {
                                          toast({
                                            variant: "destructive",
                                            title: "Erreur",
                                            description: "Impossible de télécharger le document.",
                                          });
                                        }
                                      }
                                    }}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Télécharger
                                  </DropdownMenuItem>
                                  {doc.status === "pending" && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        const realDoc = filteredDocuments.find(d => d.id === doc.id);
                                        if (realDoc) handleVerify(realDoc);
                                      }}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Vérifier
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Verify Dialog */}
        <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vérifier le document</DialogTitle>
              <DialogDescription>
                {selectedDocument?.file_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <p className="font-medium">{selectedDocument?.document_type}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Taille</p>
                    <p className="font-medium">{formatFileSize(selectedDocument?.file_size || null)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Assuré</p>
                    <p className="font-medium">
                      {selectedDocument?.insured_member?.first_name} {selectedDocument?.insured_member?.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date de téléversement</p>
                    <p className="font-medium">
                      {selectedDocument && new Date(selectedDocument.upload_date).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes de validation</Label>
                <Textarea
                  id="notes"
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Ajoutez des notes de validation (facultatif)..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="destructive"
                onClick={() => handleUpdateStatus("rejected")}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <XCircle className="h-4 w-4 mr-2" />
                Rejeter
              </Button>
              <Button
                onClick={() => handleUpdateStatus("approved")}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <CheckCircle className="h-4 w-4 mr-2" />
                Approuver
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
