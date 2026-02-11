import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  Bell,
  Shield,
  Palette,
  Database,
  Mail,
  Globe,
  Save,
  Loader2,
  Key,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ChangePasswordDialog } from "@/components/auth/ChangePasswordDialog";

export default function ParametresPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const { toast } = useToast();

  // Settings state
  const [settings, setSettings] = useState({
    // General
    siteName: "CNAM Admin Dashboard",
    siteDescription: "Système de gestion de l'assurance maladie",
    defaultLanguage: "fr",

    // Notifications
    emailNotifications: true,
    pushNotifications: false,
    documentAlerts: true,
    reimbursementAlerts: true,
    expirationAlerts: true,

    // Security
    twoFactorAuth: false,
    sessionTimeout: 30,
    passwordExpiry: 90,

    // Reimbursement rules
    maxReimbursementAmount: 5000,
    processingDays: 15,
    autoApproveThreshold: 100,
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulate save delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({
        title: "Paramètres enregistrés",
        description: "Les modifications ont été sauvegardées avec succès.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Paramètres & Configuration</h1>
            <p className="text-muted-foreground">
              Configurez les options du système et les préférences.
            </p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Enregistrer les modifications
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="general" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Général</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Sécurité</span>
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Règles</span>
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Paramètres généraux
                </CardTitle>
                <CardDescription>
                  Configurez les informations de base du système.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Nom du site</Label>
                  <Input
                    id="siteName"
                    value={settings.siteName}
                    onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siteDescription">Description</Label>
                  <Input
                    id="siteDescription"
                    value={settings.siteDescription}
                    onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultLanguage">Langue par défaut</Label>
                  <Input
                    id="defaultLanguage"
                    value={settings.defaultLanguage}
                    onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value })}
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    Seul le français est actuellement supporté.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Paramètres de notification
                </CardTitle>
                <CardDescription>
                  Configurez les notifications et alertes système.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notifications par email</Label>
                    <p className="text-sm text-muted-foreground">
                      Recevoir des notifications par email
                    </p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, emailNotifications: checked })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notifications push</Label>
                    <p className="text-sm text-muted-foreground">
                      Recevoir des notifications push dans le navigateur
                    </p>
                  </div>
                  <Switch
                    checked={settings.pushNotifications}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, pushNotifications: checked })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Alertes documents</Label>
                    <p className="text-sm text-muted-foreground">
                      Notification pour les nouveaux documents en attente
                    </p>
                  </div>
                  <Switch
                    checked={settings.documentAlerts}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, documentAlerts: checked })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Alertes remboursements</Label>
                    <p className="text-sm text-muted-foreground">
                      Notification pour les nouvelles demandes de remboursement
                    </p>
                  </div>
                  <Switch
                    checked={settings.reimbursementAlerts}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, reimbursementAlerts: checked })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Alertes d'expiration</Label>
                    <p className="text-sm text-muted-foreground">
                      Notification pour les cartes et documents expirant bientôt
                    </p>
                  </div>
                  <Switch
                    checked={settings.expirationAlerts}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, expirationAlerts: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Paramètres de sécurité
                </CardTitle>
                <CardDescription>
                  Configurez les options de sécurité du système.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Change Password Button */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Mot de passe</Label>
                    <p className="text-sm text-muted-foreground">
                      Changer votre mot de passe régulièrement pour plus de sécurité
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setShowChangePassword(true)}>
                    <Key className="h-4 w-4 mr-2" />
                    Changer le mot de passe
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Authentification à deux facteurs (2FA)</Label>
                    <p className="text-sm text-muted-foreground">
                      Exiger une vérification supplémentaire lors de la connexion
                    </p>
                  </div>
                  <Switch
                    checked={settings.twoFactorAuth}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, twoFactorAuth: checked })
                    }
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Délai d'expiration de session (minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) =>
                      setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) || 30 })
                    }
                    min={5}
                    max={120}
                  />
                  <p className="text-xs text-muted-foreground">
                    Durée d'inactivité avant déconnexion automatique (5-120 min)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passwordExpiry">Expiration du mot de passe (jours)</Label>
                  <Input
                    id="passwordExpiry"
                    type="number"
                    value={settings.passwordExpiry}
                    onChange={(e) =>
                      setSettings({ ...settings, passwordExpiry: parseInt(e.target.value) || 90 })
                    }
                    min={30}
                    max={365}
                  />
                  <p className="text-xs text-muted-foreground">
                    Nombre de jours avant expiration obligatoire du mot de passe (30-365 jours)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reimbursement Rules */}
          <TabsContent value="rules">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Règles de remboursement
                </CardTitle>
                <CardDescription>
                  Configurez les règles et limites de remboursement.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="maxReimbursementAmount">Montant maximum de remboursement (TND)</Label>
                  <Input
                    id="maxReimbursementAmount"
                    type="number"
                    value={settings.maxReimbursementAmount}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        maxReimbursementAmount: parseInt(e.target.value) || 5000,
                      })
                    }
                    min={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Montant maximum autorisé pour une seule demande
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="processingDays">Délai de traitement (jours)</Label>
                  <Input
                    id="processingDays"
                    type="number"
                    value={settings.processingDays}
                    onChange={(e) =>
                      setSettings({ ...settings, processingDays: parseInt(e.target.value) || 15 })
                    }
                    min={1}
                    max={60}
                  />
                  <p className="text-xs text-muted-foreground">
                    Délai standard de traitement des demandes
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="autoApproveThreshold">Seuil d'approbation automatique (TND)</Label>
                  <Input
                    id="autoApproveThreshold"
                    type="number"
                    value={settings.autoApproveThreshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        autoApproveThreshold: parseInt(e.target.value) || 100,
                      })
                    }
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">
                    Montant en dessous duquel les demandes peuvent être approuvées automatiquement (0 = désactivé)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Change Password Dialog */}
        <ChangePasswordDialog
          open={showChangePassword}
          onOpenChange={setShowChangePassword}
        />
      </div>
    </DashboardLayout>
  );
}
