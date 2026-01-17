import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  Receipt,
  FileText,
  Calendar,
  BarChart3,
  Shield,
  Settings,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import cnamLogo from "@/assets/cnam-logo.jpg";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const navigation = [
  { name: "Vue d'ensemble", href: "/", icon: LayoutDashboard },
  { name: "Assurés", href: "/assures", icon: Users },
  { name: "Prestataires", href: "/prestataires", icon: Building2 },
  { name: "Remboursements", href: "/remboursements", icon: Receipt },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Calendrier", href: "/calendrier", icon: Calendar },
  { name: "Rapports", href: "/rapports", icon: BarChart3 },
  { name: "Sécurité", href: "/securite", icon: Shield, requiresAdmin: true },
  { name: "Administration", href: "/utilisateurs", icon: Settings, requiresAdmin: true },
];

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const location = useLocation();
  const { profile, user, isAdmin } = useAuth();

  const displayName = profile
    ? `${profile.first_name} ${profile.last_name}`
    : user?.email?.split("@")[0] || "Utilisateur";

  const displayEmail = profile?.email || user?.email || "";

  const initials = profile
    ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase()
    : displayName.substring(0, 2).toUpperCase();

  // Filter navigation items based on user role
  const filteredNavigation = navigation.filter((item) => {
    if (item.requiresAdmin && !isAdmin) {
      return false;
    }
    return true;
  });

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar transition-all duration-300 ease-in-out",
        isOpen ? "w-64" : "w-20"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img 
            src={cnamLogo} 
            alt="CNAM Logo" 
            className="h-10 w-10 object-contain rounded-lg"
          />
          {isOpen && (
            <div className="animate-fade-in">
              <h1 className="text-lg font-bold text-sidebar-foreground">CNAM</h1>
              <p className="text-xs text-sidebar-muted">Admin Dashboard</p>
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors"
        >
          <ChevronLeft
            className={cn(
              "h-5 w-5 text-sidebar-muted transition-transform duration-300",
              !isOpen && "rotate-180"
            )}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                isActive ? "sidebar-item-active" : "sidebar-item",
                !isOpen && "justify-center px-2"
              )}
              title={!isOpen ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {isOpen && <span className="animate-fade-in">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {isOpen && (
        <div className="border-t border-sidebar-border p-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-sm font-medium text-sidebar-foreground">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
              <p className="text-xs text-sidebar-muted truncate">{displayEmail}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
