import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, Plus, Loader2, Search, Filter, Eye, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface Props {
  reimbursements: any[];
  loading: boolean;
  getStatusBadge: (status: string) => React.ReactNode;
  onNewRequest: () => void;
}

export function UserRequestsTab({ reimbursements, loading, getStatusBadge, onNewRequest }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  const filtered = reimbursements
    .filter((r) => {
      const matchesSearch = r.reference_number?.toLowerCase().includes(search.toLowerCase()) ||
        r.service_type?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

  const totalRequested = filtered.reduce((sum, r) => sum + Number(r.amount_requested), 0);
  const totalApproved = filtered.reduce((sum, r) => sum + Number(r.amount_approved || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-lg font-semibold">Historique des demandes</h2>
        <Button onClick={onNewRequest}>
          <Plus className="h-4 w-4 mr-1" /> Nouvelle demande
        </Button>
      </div>

      {/* Filters & Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-2">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher par référence ou type..." value={search} onChange={(e) => setSearch(e.target.value)} className="border-0 shadow-none focus-visible:ring-0 p-0 h-8" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-0 shadow-none h-8">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="processing">En traitement</SelectItem>
                <SelectItem value="approved">Approuvé</SelectItem>
                <SelectItem value="rejected">Rejeté</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total demandé</p>
              <p className="font-semibold text-sm">{totalRequested.toFixed(2)} TND</p>
            </div>
            <Separator orientation="vertical" className="h-8" />
            <div>
              <p className="text-xs text-muted-foreground">Approuvé</p>
              <p className="font-semibold text-sm text-success">{totalApproved.toFixed(2)} TND</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table-like List */}
      <Card>
        <CardContent className="pt-4">
          {/* Header Row */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border/50 mb-2">
            <div className="col-span-3">Référence</div>
            <div className="col-span-2">Service</div>
            <div className="col-span-2">Prestataire</div>
            <div className="col-span-1">
              <button className="flex items-center gap-1 hover:text-foreground" onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}>
                Date <ArrowUpDown className="h-3 w-3" />
              </button>
            </div>
            <div className="col-span-1 text-right">Montant</div>
            <div className="col-span-2 text-center">Statut</div>
            <div className="col-span-1 text-center">Détails</div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{reimbursements.length === 0 ? "Aucune demande de remboursement" : "Aucun résultat pour ces filtres"}</p>
              {reimbursements.length === 0 && <Button className="mt-4" onClick={onNewRequest}>Soumettre une demande</Button>}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => (
                <div key={r.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center p-3 md:px-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                  <div className="col-span-3">
                    <p className="font-medium text-sm">{r.reference_number}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">{r.service_type}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground truncate">{r.provider?.name || "—"}</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-xs text-muted-foreground">{format(new Date(r.created_at), "dd/MM/yy")}</p>
                  </div>
                  <div className="col-span-1 text-right">
                    <p className="font-semibold text-sm">{Number(r.amount_requested).toFixed(2)}</p>
                  </div>
                  <div className="col-span-2 flex justify-center">{getStatusBadge(r.status)}</div>
                  <div className="col-span-1 flex justify-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedRequest(r)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Détails de la demande</DialogTitle>
            <DialogDescription>{selectedRequest?.reference_number}</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Service</p>
                  <p className="font-medium text-sm">{selectedRequest.service_type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Prestataire</p>
                  <p className="font-medium text-sm">{selectedRequest.provider?.name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Assuré</p>
                  <p className="font-medium text-sm">
                    {selectedRequest.insured_member ? `${selectedRequest.insured_member.first_name} ${selectedRequest.insured_member.last_name}` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date de soumission</p>
                  <p className="font-medium text-sm">{format(new Date(selectedRequest.created_at), "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Montant demandé</p>
                  <p className="font-semibold text-sm">{Number(selectedRequest.amount_requested).toFixed(2)} TND</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Montant approuvé</p>
                  <p className="font-semibold text-sm text-success">{Number(selectedRequest.amount_approved || 0).toFixed(2)} TND</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Statut</p>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
              </div>
              {selectedRequest.description && (
                <div>
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="text-sm mt-1 p-3 rounded-lg bg-muted/50">{selectedRequest.description}</p>
                </div>
              )}
              {selectedRequest.rejection_reason && (
                <div>
                  <p className="text-xs text-muted-foreground">Motif de rejet</p>
                  <p className="text-sm mt-1 p-3 rounded-lg bg-destructive/10 text-destructive">{selectedRequest.rejection_reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
