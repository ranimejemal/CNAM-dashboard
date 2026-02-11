import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SESSION_TIMEOUT_MS = 3 * 60 * 60 * 1000; // 3 hours hard timeout
const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes idle timeout
const SESSION_START_KEY = "cnam_session_start";
const LAST_ACTIVITY_KEY = "cnam_last_activity";

export function useSessionTimeout() {
  const { toast } = useToast();
  const hardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (hardTimerRef.current) clearTimeout(hardTimerRef.current);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    hardTimerRef.current = null;
    idleTimerRef.current = null;
  }, []);

  const logout = useCallback(async (reason: "hard" | "idle") => {
    clearTimers();
    localStorage.removeItem(SESSION_START_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    toast({
      variant: "destructive",
      title: "Session expirée",
      description: reason === "idle"
        ? "Votre session a expiré après 15 minutes d'inactivité. Reconnectez-vous avec Microsoft Authenticator."
        : "Votre session a expiré après 3 heures. Reconnectez-vous avec Microsoft Authenticator.",
    });
    await supabase.auth.signOut();
  }, [clearTimers, toast]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    idleTimerRef.current = setTimeout(() => logout("idle"), IDLE_TIMEOUT_MS);
  }, [logout]);

  const startTimers = useCallback((hardRemainingMs: number) => {
    clearTimers();
    if (hardRemainingMs <= 0) {
      logout("hard");
      return;
    }
    hardTimerRef.current = setTimeout(() => logout("hard"), hardRemainingMs);
    resetIdleTimer();
  }, [clearTimers, logout, resetIdleTimer]);

  useEffect(() => {
    // Activity listeners for idle detection
    const activityEvents = ["mousedown", "keydown", "touchstart", "scroll", "mousemove"];
    const onActivity = () => resetIdleTimer();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        const now = Date.now();
        localStorage.setItem(SESSION_START_KEY, now.toString());
        localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
        startTimers(SESSION_TIMEOUT_MS);
        activityEvents.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
      } else if (event === "SIGNED_OUT") {
        clearTimers();
        localStorage.removeItem(SESSION_START_KEY);
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        activityEvents.forEach((e) => window.removeEventListener(e, onActivity));
      }
    });

    // Check existing session on mount
    const sessionStart = localStorage.getItem(SESSION_START_KEY);
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);

    if (sessionStart) {
      const hardRemaining = SESSION_TIMEOUT_MS - (Date.now() - parseInt(sessionStart, 10));
      const idleElapsed = lastActivity ? Date.now() - parseInt(lastActivity, 10) : 0;

      if (hardRemaining <= 0) {
        logout("hard");
      } else if (idleElapsed >= IDLE_TIMEOUT_MS) {
        logout("idle");
      } else {
        startTimers(hardRemaining);
        activityEvents.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
      }
    }

    return () => {
      subscription.unsubscribe();
      clearTimers();
      activityEvents.forEach((e) => window.removeEventListener(e, onActivity));
    };
  }, [startTimers, clearTimers, logout, resetIdleTimer]);
}
