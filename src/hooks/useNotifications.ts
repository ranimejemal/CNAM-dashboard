import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  read: boolean;
  link: string | null;
  created_at: string;
}

const now = new Date();
const h = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3600000).toISOString();

const FAKE_NOTIFICATIONS: Notification[] = [
  { id: "fn1", user_id: null, title: "Demande approuvée", message: "Votre demande RMB-2025-01234 (85.00 TND) a été approuvée. Montant remboursé : 65.00 TND", type: "success", read: false, link: "/app/user/requests", created_at: h(1) },
  { id: "fn2", user_id: null, title: "Nouveau document validé", message: "Votre attestation d'affiliation a été vérifiée et validée par l'administration.", type: "info", read: false, link: "/app/user/documents", created_at: h(3) },
  { id: "fn3", user_id: null, title: "Demande en traitement", message: "La demande RMB-2025-01045 (Consultation ORL) est maintenant en cours de traitement.", type: "info", read: false, link: "/app/user/requests", created_at: h(6) },
  { id: "fn4", user_id: null, title: "Rappel : Renouvellement carte", message: "Votre carte CNAM expire le 31/12/2026. Pensez à préparer votre renouvellement.", type: "warning", read: false, link: "/app/user/profile", created_at: h(12) },
  { id: "fn5", user_id: null, title: "Demande rejetée", message: "La demande RMB-2025-00912 a été rejetée : ordonnance médicale expirée. Veuillez soumettre une ordonnance récente.", type: "error", read: true, link: "/app/user/requests", created_at: h(24) },
  { id: "fn6", user_id: null, title: "Document en attente", message: "Votre bilan sanguin (bilan_sanguin_complet_fev2025.pdf) est en attente de vérification.", type: "info", read: true, link: "/app/user/documents", created_at: h(30) },
  { id: "fn7", user_id: null, title: "Rendez-vous demain", message: "Rappel : Visite de contrôle annuelle avec Dr. Khaled Mansour demain à 09h00.", type: "warning", read: true, link: "/app/user/calendar", created_at: h(36) },
  { id: "fn8", user_id: null, title: "Nouvelle demande soumise", message: "Demande RMB-2025-00398 enregistrée pour Fatma Gharbi — Radiologie (320.00 TND)", type: "info", read: false, link: "/app/prestataire/demandes", created_at: h(2) },
  { id: "fn9", user_id: null, title: "Paiement reçu", message: "Paiement de 280.00 TND reçu pour la demande RMB-2025-00398 (Radiologie).", type: "success", read: false, link: "/app/prestataire/paiements", created_at: h(5) },
  { id: "fn10", user_id: null, title: "Demande en attente de pièces", message: "La demande RMB-2025-00385 pour Ahmed Trabelsi nécessite des documents justificatifs supplémentaires.", type: "warning", read: false, link: "/app/prestataire/demandes", created_at: h(8) },
  { id: "fn11", user_id: null, title: "Taux d'erreur en baisse", message: "Félicitations ! Votre taux d'erreur est passé de 3.1% à 2.3% ce mois-ci.", type: "success", read: true, link: "/app/prestataire", created_at: h(48) },
  { id: "fn12", user_id: null, title: "Demande rejetée", message: "La demande RMB-2025-00330 pour Youssef Bouazizi a été rejetée : médicaments hors nomenclature CNAM.", type: "error", read: true, link: "/app/prestataire/demandes", created_at: h(72) },
  { id: "fn13", user_id: null, title: "Mise à jour système", message: "La plateforme CNAM sera en maintenance le 15/02/2025 de 02h00 à 04h00. Veuillez planifier en conséquence.", type: "info", read: true, link: null, created_at: h(96) },
];

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(FAKE_NOTIFICATIONS);
  const [unreadCount, setUnreadCount] = useState(FAKE_NOTIFICATIONS.filter(n => !n.read).length);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const typedData = (data || []).map(n => ({
        ...n,
        type: n.type as "info" | "warning" | "error" | "success"
      }));

      if (typedData.length > 0) {
        setNotifications(typedData);
        setUnreadCount(typedData.filter((n) => !n.read).length);
      }
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .eq("read", false);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);

      toast({
        title: "Notifications",
        description: "Toutes les notifications ont été marquées comme lues.",
      });
    } catch (error: any) {
      console.error("Error marking all as read:", error);
    }
  };

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          // Only add if it's for this user or global
          if (newNotification.user_id === user.id || newNotification.user_id === null) {
            setNotifications((prev) => [
              { ...newNotification, type: newNotification.type as "info" | "warning" | "error" | "success" },
              ...prev.slice(0, 19),
            ]);
            setUnreadCount((prev) => prev + 1);

            // Show toast for new notifications
            toast({
              title: newNotification.title,
              description: newNotification.message,
              variant: newNotification.type === "error" ? "destructive" : "default",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications, toast]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
