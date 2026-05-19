// src/hooks/useAuth.js
// Proxies the Zustand store so legacy imports don't break
import useAuthStore from "../store/useAuthStore";

export default function useAuth() {
  return useAuthStore();
}
