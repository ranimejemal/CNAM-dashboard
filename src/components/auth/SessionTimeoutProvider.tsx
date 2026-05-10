import { useSessionTimeout } from "@/hooks/useSessionTimeout";

export function SessionTimeoutProvider() {
  useSessionTimeout();
  return null;
}
