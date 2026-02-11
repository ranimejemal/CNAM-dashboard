import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Loader2, Upload, Receipt, FileText } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  reimbursements: any[];
  events: any[];
  loading: boolean;
  getStatusBadge: (status: string) => React.ReactNode;
  onNewRequest: () => void;
  onUploadDocument: () => void;
}

export function UserOverviewTab({ reimbursements, events, loading, getStatusBadge, onNewRequest, onUploadDocument }: Props) {
  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={onNewRequest}
          className="flex items-center gap-4 p-5 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all group"
        >
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Receipt className="h-6 w-6 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm">Nouvelle demande de remboursement</p>
            <p className="text-xs text-muted-foreground">Soumettre une demande pour un soin ou service</p>
          </div>
        </button>
        <button
          onClick={onUploadDocument}
          className="flex items-center gap-4 p-5 rounded-xl border-2 border-dashed border-info/30 bg-info/5 hover:bg-info/10 hover:border-info/50 transition-all group"
        >
          <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center group-hover:bg-info/20 transition-colors">
            <Upload className="h-6 w-6 text-info" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm">Soumettre un document</p>
            <p className="text-xs text-muted-foreground">Téléverser une attestation, facture ou ordonnance</p>
          </div>
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Demandes récentes</CardTitle>
            <Button size="sm" onClick={onNewRequest}>
              <Plus className="h-4 w-4 mr-1" /> Nouvelle
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : reimbursements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune demande pour le moment</p>
            ) : (
              <div className="space-y-3">
                {reimbursements.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.reference_number}</p>
                      <p className="text-xs text-muted-foreground">{r.service_type} · {Number(r.amount_requested).toFixed(2)} TND</p>
                    </div>
                    {getStatusBadge(r.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Événements à venir</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun événement prévu</p>
            ) : (
              <div className="space-y-3">
                {events.slice(0, 5).map((e) => (
                  <div key={e.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(e.start_date), "dd MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
