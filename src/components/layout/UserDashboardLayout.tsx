import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationsPopover } from "@/components/notifications/NotificationsPopover";
import { ChangePasswordDialog } from "@/components/auth/ChangePasswordDialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard, FileText, Receipt, Calendar, User, LogOut, Key, Menu, ChevronLeft
} from "lucide-react";
import cnamLogo from "@/assets/cnam-logo.jpg";

const navigation = [
  { name: "Tableau de bord", href: "/app/user", icon: LayoutDashboard },
  { name: "Mes demandes", href: "/app/user/requests", icon: Receipt },
  { name: "Mes documents", href: "/app/user/documents", icon: FileText },
  { name: "Calendrier", href: "/app/user/calendar", icon: Calendar },
  { name: "Mon profil", href: "/app/user/profile", icon: User },
];

interface Props { children: React.ReactNode; }

export function UserDashboardLayout({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const location = useLocation();
  const { profile, user, signOut } = useAuth();

  const displayName = profile ? `${profile.first_name} ${profile.last_name}` : user?.email?.split("@")[0] || "Assuré";
  const initials = profile ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase() : displayName.substring(0, 2).toUpperCase();

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className={cn("flex flex-col bg-sidebar transition-all duration-300", sidebarOpen ? "w-64" : "w-20")}>
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <img src={cnamLogo} alt="CNAM" className="h-10 w-10 object-contain rounded-lg" />
            {sidebarOpen && (
              <div className="animate-fade-in">
                <h1 className="text-lg font-bold text-sidebar-foreground">CNAM</h1>
                <p className="text-xs text-sidebar-muted">Espace Assuré</p>
              </div>
            )}
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors">
            <ChevronLeft className={cn("h-5 w-5 text-sidebar-muted transition-transform duration-300", !sidebarOpen && "rotate-180")} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link key={item.name} to={item.href} className={cn(isActive ? "sidebar-item-active" : "sidebar-item", !sidebarOpen && "justify-center px-2")} title={!sidebarOpen ? item.name : undefined}>
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span className="animate-fade-in">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
        {sidebarOpen && (
          <div className="border-t border-sidebar-border p-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center">
                <span className="text-sm font-medium text-sidebar-foreground">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
                <p className="text-xs text-sidebar-muted truncate">{profile?.email || user?.email}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <div />
          <div className="flex items-center gap-3">
            <NotificationsPopover />
            <div className="h-8 w-px bg-border" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg p-1 hover:bg-muted transition-colors">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">{initials}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">{user?.email}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowChangePassword(true)} className="cursor-pointer"><Key className="mr-2 h-4 w-4" />Changer le mot de passe</DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut()} className="text-destructive cursor-pointer"><LogOut className="mr-2 h-4 w-4" />Déconnexion</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>

      <ChangePasswordDialog open={showChangePassword} onOpenChange={setShowChangePassword} />
    </div>
  );
}
