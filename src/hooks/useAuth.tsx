import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  isLoading: boolean;
  isAdmin: boolean;
  isAdminSuperieur: boolean;
  isAgent: boolean;
  isValidator: boolean;
  isUser: boolean;
  isPrestataire: boolean;
  isSecurityEngineer: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  getDashboardRoute: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (error) { console.error("Error fetching profile:", error); return null; }
      return data as Profile;
    } catch (error) { console.error("Error fetching profile:", error); return null; }
  };

  const fetchRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) { console.error("Error fetching roles:", error); return []; }
      return data.map((r) => r.role as AppRole);
    } catch (error) { console.error("Error fetching roles:", error); return []; }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(async () => {
            const [profileData, rolesData] = await Promise.all([
              fetchProfile(session.user.id),
              fetchRoles(session.user.id),
            ]);
            setProfile(profileData);
            setRoles(rolesData);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
        }
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        Promise.all([
          fetchProfile(session.user.id),
          fetchRoles(session.user.id),
        ]).then(([profileData, rolesData]) => {
          setProfile(profileData);
          setRoles(rolesData);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { first_name: firstName, last_name: lastName },
      },
    });
    if (error) return { error: new Error(error.message) };
    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: data.user.id, first_name: firstName, last_name: lastName, email,
      });
      if (profileError) console.error("Error creating profile:", profileError);
    }
    return { error: null };
  };

  const signOut = async () => {
    try { await supabase.auth.signOut(); } catch (error) { console.error("Error during signOut:", error); }
    setUser(null); setSession(null); setProfile(null); setRoles([]);
  };

  // admin_superieur inherits admin privileges (also enforced in DB function)
  const isAdminSuperieur = roles.includes("admin_superieur");
  const isAdmin = roles.includes("admin") || isAdminSuperieur;
  const isAgent = roles.includes("agent");
  const isValidator = roles.includes("validator");
  const isUser = roles.includes("user");
  const isPrestataire = roles.includes("prestataire");
  const isSecurityEngineer = roles.includes("security_engineer");

  const getDashboardRoute = () => {
    if (isAdminSuperieur) return "/app/super-admin";
    if (isAdmin || isAgent || isValidator) return "/app/admin";
    if (isUser) return "/app/user";
    if (isPrestataire) return "/app/prestataire";
    if (isSecurityEngineer) return "/app/soc";
    return "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user, session, profile, roles, isLoading,
        isAdmin, isAdminSuperieur, isAgent, isValidator, isUser, isPrestataire, isSecurityEngineer,
        signIn, signUp, signOut, getDashboardRoute,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
