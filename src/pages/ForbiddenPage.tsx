import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function ForbiddenPage() {
  const { getDashboardRoute } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <ShieldAlert className="mx-auto h-16 w-16 text-destructive" />
        <h1 className="mt-4 text-2xl font-bold">Accès refusé</h1>
        <p className="mt-2 text-muted-foreground">
          Vous n'avez pas les permissions nécessaires pour accéder à cette ressource.
        </p>
        <Button asChild className="mt-6">
          <Link to={getDashboardRoute()}>Retour au tableau de bord</Link>
        </Button>
      </div>
    </div>
  );
}
