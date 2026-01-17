import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
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
import UnauthorizedPage from "./pages/UnauthorizedPage";
import SecurityPage from "./pages/SecurityPage";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster />
          <Sonner />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assures"
              element={
                <ProtectedRoute>
                  <AssuresPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/prestataires"
              element={
                <ProtectedRoute>
                  <PrestatairesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/remboursements"
              element={
                <ProtectedRoute>
                  <RemboursementsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedRoute>
                  <DocumentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendrier"
              element={
                <ProtectedRoute>
                  <CalendrierPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rapports"
              element={
                <ProtectedRoute>
                  <RapportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/utilisateurs"
              element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <UtilisateursPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/securite"
              element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <SecurityPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parametres"
              element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <ParametresPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
