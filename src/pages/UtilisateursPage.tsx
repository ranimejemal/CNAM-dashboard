import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  Users,
  UserPlus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Filter,
  KeyRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ProfileEditDialog } from "@/components/profile/ProfileEditDialog";
import { CreateAccountDialog } from "@/components/users/CreateAccountDialog";
import { RegistrationRequestsCard } from "@/components/users/RegistrationRequestsCard";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRole extends Profile {
  roles: AppRole[];
}

export default function UtilisateursPage() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user: currentUser, profile: currentProfile } = useAuth();

  const SUPER_ADMIN_EMAIL = "ranime.jemal@esprim.tn";


  // Fetch users with their roles
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => ({
        ...profile,
        roles: userRoles
          ?.filter((r) => r.user_id === profile.user_id)
          .map((r) => r.role) || [],
      }));

      setUsers(usersWithRoles);
      setFilteredUsers(usersWithRoles);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les utilisateurs.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users based on search and role
  useEffect(() => {
    let filtered = users;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.first_name?.toLowerCase().includes(query) ||
          user.last_name?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query)
      );
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter((user) =>
        user.roles.includes(roleFilter as AppRole)
      );
    }

    setFilteredUsers(filtered);
  }, [searchQuery, roleFilter, users]);

  const handleEditUser = (user: UserWithRole) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    fetchUsers();
  };

  const handleManageRoles = (user: UserWithRole) => {
    setSelectedUser(user);
    setIsRoleDialogOpen(true);
  };

  const handleAddRole = async (role: AppRole) => {
    if (!selectedUser) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("user_roles").insert({
        user_id: selectedUser.user_id,
        role: role,
      });

      if (error) throw error;

      toast({
        title: "Succès",
        description: `Rôle "${role}" ajouté avec succès.`,
      });
      fetchUsers();
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

  const handleRemoveRole = async (role: AppRole) => {
    if (!selectedUser) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", selectedUser.user_id)
        .eq("role", role);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `Rôle "${role}" retiré avec succès.`,
      });
      fetchUsers();
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

  const handleDeleteUser = async (user: UserWithRole) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement l'utilisateur ${user.first_name} ${user.last_name} ?\n\nCette action est irréversible.`)) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId: user.user_id },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Succès",
        description: "Utilisateur supprimé définitivement.",
      });
      fetchUsers();
    } catch (error: any) {
      console.error("Delete user error:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'utilisateur",
      });
    }
  };

  const handleReset2FA = async (user: UserWithRole) => {
    if (!confirm(`Réinitialiser la 2FA pour ${user.first_name} ${user.last_name} ?\n\nL'utilisateur devra reconfigurer son application d'authentification.`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée");

      const res = await supabase.functions.invoke("reset-totp-admin", {
        body: { targetUserId: user.user_id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      toast({
        title: "2FA réinitialisée",
        description: `La 2FA de ${user.first_name} ${user.last_name} a été réinitialisée.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de réinitialiser la 2FA",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role: AppRole) => {
    switch (role) {
      case "admin":
        return <Badge className="badge-destructive"><ShieldAlert className="h-3 w-3 mr-1" />Admin</Badge>;
      case "security_engineer":
        return <Badge className="badge-warning"><ShieldCheck className="h-3 w-3 mr-1" />IT Security</Badge>;
      case "user":
        return <Badge className="badge-info"><Shield className="h-3 w-3 mr-1" />Utilisateur</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.roles.includes("admin")).length,
    securityEngineers: users.filter((u) => u.roles.includes("security_engineer")).length,
    users: users.filter((u) => u.roles.includes("user")).length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Administration</h1>
            <p className="text-muted-foreground">
              Gérez les comptes administrateurs, rôles et permissions.
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Créer un compte
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <ShieldAlert className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Administrateurs</p>
                  <p className="text-2xl font-bold">{stats.admins}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">IT Security</p>
                  <p className="text-2xl font-bold">{stats.securityEngineers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Utilisateurs</p>
                  <p className="text-2xl font-bold">{stats.users}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Registration Requests */}
        <RegistrationRequestsCard onUserCreated={fetchUsers} />

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrer par rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les rôles</SelectItem>
                  <SelectItem value="admin">Administrateurs</SelectItem>
                  <SelectItem value="security_engineer">IT Security</SelectItem>
                  <SelectItem value="user">Utilisateurs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des utilisateurs</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Aucun utilisateur trouvé.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="table-header">
                      <th className="text-left py-3 px-4">Utilisateur</th>
                      <th className="text-left py-3 px-4">Email</th>
                      <th className="text-left py-3 px-4">Téléphone</th>
                      <th className="text-left py-3 px-4">Rôles</th>
                      <th className="text-left py-3 px-4">Inscrit le</th>
                      <th className="text-right py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={user.avatar_url || undefined} alt={`${user.first_name} ${user.last_name}`} />
                              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                                {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.first_name} {user.last_name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                        <td className="py-3 px-4 text-muted-foreground">{user.phone || "—"}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {user.roles.length > 0 ? (
                              user.roles.map((role) => (
                                <span key={role}>{getRoleBadge(role)}</span>
                              ))
                            ) : (
                              <Badge variant="outline">Aucun rôle</Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Modifier le profil
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleManageRoles(user)}>
                                <Shield className="h-4 w-4 mr-2" />
                                Gérer les rôles
                              </DropdownMenuItem>
                              {user.roles.includes("admin") && (
                                <DropdownMenuItem onClick={() => handleReset2FA(user)}>
                                  <KeyRound className="h-4 w-4 mr-2" />
                                  Réinitialiser 2FA
                                </DropdownMenuItem>
                              )}
                              {user.user_id !== currentUser?.id && (
                                // Only super admin can delete other admins
                                !(user.roles.includes("admin") && currentProfile?.email !== SUPER_ADMIN_EMAIL) && (
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDeleteUser(user)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Supprimer
                                  </DropdownMenuItem>
                                )
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

        {/* Edit Profile Dialog */}
        <ProfileEditDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          profile={selectedUser}
          onSuccess={handleEditSuccess}
          isAdmin={true}
        />

        {/* Create User Dialog */}
        <CreateAccountDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSuccess={fetchUsers}
        />
        <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gérer les rôles</DialogTitle>
              <DialogDescription>
                {selectedUser && `Rôles de ${selectedUser.first_name} ${selectedUser.last_name}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="mb-2 block">Rôles actuels</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedUser?.roles.length ? (
                    selectedUser.roles.map((role) => (
                      <Badge key={role} variant="secondary" className="gap-1">
                        {role}
                        <button
                          onClick={() => handleRemoveRole(role)}
                          className="ml-1 hover:text-destructive"
                          disabled={isSubmitting}
                        >
                          ×
                        </button>
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucun rôle assigné</p>
                  )}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Ajouter un rôle</Label>
                <div className="flex flex-wrap gap-2">
                  {(["admin", "security_engineer"] as AppRole[])
                    .filter((role) => !selectedUser?.roles.includes(role))
                    .map((role) => (
                      <Button
                        key={role}
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddRole(role)}
                        disabled={isSubmitting}
                      >
                        + {role}
                      </Button>
                    ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsRoleDialogOpen(false)}>Fermer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
