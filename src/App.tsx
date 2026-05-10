import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SessionTimeoutProvider } from "@/components/auth/SessionTimeoutProvider";
import { AIChatWidget } from "@/components/ai/AIChatWidget";
import Index from "./pages/Index";
import AssuresPage from "./pages/AssuresPage";
import PrestatairesPage from "./pages/PrestatairesPage";
import RemboursementsPage from "./pages/RemboursementsPage";
import DocumentsPage from "./pages/DocumentsPage";
import CalendrierPage from "./pages/CalendrierPage";
import RapportsPage from "./pages/RapportsPage";
import UtilisateursPage from "./pages/UtilisateursPage";
import ParametresPage from "./pages/ParametresPage";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RegisterPrestatairePage from "./pages/RegisterPrestatairePage";
import RegisterInternalPage from "./pages/RegisterInternalPage";
import ForbiddenPage from "./pages/ForbiddenPage";
import SecurityPage from "./pages/SecurityPage";
import UserDashboard from "./pages/UserDashboard";
import UserRequestsPage from "./pages/UserRequestsPage";
import UserDocumentsPage from "./pages/UserDocumentsPage";
import UserCalendarPage from "./pages/UserCalendarPage";
import UserProfilePage from "./pages/UserProfilePage";
import PrestataireDashboard from "./pages/PrestataireDashboard";
import PrestataireDemandesPage from "./pages/PrestataireDemandesPage";
import PrestatairePaiementsPage from "./pages/PrestatairePaiementsPage";
import PrestataireProfilePage from "./pages/PrestataireProfilePage";
import SecurityDashboard from "./pages/SecurityDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <BrowserRouter>
          <SessionTimeoutProvider />
          <Toaster />
          <Sonner />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/register/prestataire" element={<RegisterPrestatairePage />} />
            <Route path="/register/internal" element={<RegisterInternalPage />} />
            <Route path="/403" element={<ForbiddenPage />} />

            {/* Root redirects to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Admin Supérieur routes */}
            <Route path="/app/super-admin" element={<ProtectedRoute requiredRoles={["admin_superieur"]}><Index /></ProtectedRoute>} />
            <Route path="/app/super-admin/assures" element={<ProtectedRoute requiredRoles={["admin_superieur"]}><AssuresPage /></ProtectedRoute>} />
            <Route path="/app/super-admin/prestataires" element={<ProtectedRoute requiredRoles={["admin_superieur"]}><PrestatairesPage /></ProtectedRoute>} />
            <Route path="/app/super-admin/remboursements" element={<ProtectedRoute requiredRoles={["admin_superieur"]}><RemboursementsPage /></ProtectedRoute>} />
            <Route path="/app/super-admin/documents" element={<ProtectedRoute requiredRoles={["admin_superieur"]}><DocumentsPage /></ProtectedRoute>} />
            <Route path="/app/super-admin/calendrier" element={<ProtectedRoute requiredRoles={["admin_superieur"]}><CalendrierPage /></ProtectedRoute>} />
            <Route path="/app/super-admin/rapports" element={<ProtectedRoute requiredRoles={["admin_superieur"]}><RapportsPage /></ProtectedRoute>} />
            <Route path="/app/super-admin/utilisateurs" element={<ProtectedRoute requiredRoles={["admin_superieur"]}><UtilisateursPage /></ProtectedRoute>} />
            <Route path="/app/super-admin/securite" element={<ProtectedRoute requiredRoles={["admin_superieur"]}><SecurityPage /></ProtectedRoute>} />
            <Route path="/app/super-admin/parametres" element={<ProtectedRoute requiredRoles={["admin_superieur"]}><ParametresPage /></ProtectedRoute>} />

            <Route path="/app/admin" element={<ProtectedRoute requiredRoles={["admin", "agent", "validator"]}><Index /></ProtectedRoute>} />
            <Route path="/app/admin/assures" element={<ProtectedRoute requiredRoles={["admin", "agent", "validator"]}><AssuresPage /></ProtectedRoute>} />
            <Route path="/app/admin/prestataires" element={<ProtectedRoute requiredRoles={["admin", "agent", "validator"]}><PrestatairesPage /></ProtectedRoute>} />
            <Route path="/app/admin/remboursements" element={<ProtectedRoute requiredRoles={["admin", "agent", "validator"]}><RemboursementsPage /></ProtectedRoute>} />
            <Route path="/app/admin/documents" element={<ProtectedRoute requiredRoles={["admin", "agent", "validator"]}><DocumentsPage /></ProtectedRoute>} />
            <Route path="/app/admin/calendrier" element={<ProtectedRoute requiredRoles={["admin", "agent", "validator"]}><CalendrierPage /></ProtectedRoute>} />
            <Route path="/app/admin/rapports" element={<ProtectedRoute requiredRoles={["admin", "agent", "validator"]}><RapportsPage /></ProtectedRoute>} />
            <Route path="/app/admin/utilisateurs" element={<ProtectedRoute requiredRoles={["admin"]}><UtilisateursPage /></ProtectedRoute>} />
            <Route path="/app/admin/securite" element={<ProtectedRoute requiredRoles={["admin"]}><SecurityPage /></ProtectedRoute>} />
            <Route path="/app/admin/parametres" element={<ProtectedRoute requiredRoles={["admin"]}><ParametresPage /></ProtectedRoute>} />

            {/* User (Assuré) dashboard */}
            <Route path="/app/user" element={<ProtectedRoute requiredRoles={["user"]}><UserDashboard /></ProtectedRoute>} />
            <Route path="/app/user/requests" element={<ProtectedRoute requiredRoles={["user"]}><UserRequestsPage /></ProtectedRoute>} />
            <Route path="/app/user/documents" element={<ProtectedRoute requiredRoles={["user"]}><UserDocumentsPage /></ProtectedRoute>} />
            <Route path="/app/user/calendar" element={<ProtectedRoute requiredRoles={["user"]}><UserCalendarPage /></ProtectedRoute>} />
            <Route path="/app/user/profile" element={<ProtectedRoute requiredRoles={["user"]}><UserProfilePage /></ProtectedRoute>} />

            {/* Prestataire dashboard */}
            <Route path="/app/prestataire" element={<ProtectedRoute requiredRoles={["prestataire"]}><PrestataireDashboard /></ProtectedRoute>} />
            <Route path="/app/prestataire/demandes" element={<ProtectedRoute requiredRoles={["prestataire"]}><PrestataireDemandesPage /></ProtectedRoute>} />
            <Route path="/app/prestataire/paiements" element={<ProtectedRoute requiredRoles={["prestataire"]}><PrestatairePaiementsPage /></ProtectedRoute>} />
            <Route path="/app/prestataire/profil" element={<ProtectedRoute requiredRoles={["prestataire"]}><PrestataireProfilePage /></ProtectedRoute>} />

            {/* IT/Security SOC dashboard */}
            <Route path="/app/soc" element={<ProtectedRoute requiredRoles={["security_engineer"]}><SecurityDashboard /></ProtectedRoute>} />

            {/* Legacy routes redirect */}
            <Route path="/unauthorized" element={<Navigate to="/403" replace />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          <AIChatWidget />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
