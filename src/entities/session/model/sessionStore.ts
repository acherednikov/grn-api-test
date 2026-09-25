import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_GREEN_API_URL } from "@/shared/config/constants";
import type { SessionCredentials } from "./types";

type SessionState = {
  credentials: SessionCredentials | null;
  setCredentials: (payload: Omit<SessionCredentials, "apiUrl"> & { apiUrl?: string }) => void;
  clearSession: () => void;
  isAuthenticated: () => boolean;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      credentials: null,

      setCredentials: ({ idInstance, apiTokenInstance, apiUrl }) => {
        set({
          credentials: {
            idInstance: idInstance.trim(),
            apiTokenInstance: apiTokenInstance.trim(),
            apiUrl: (apiUrl ?? DEFAULT_GREEN_API_URL).trim(),
          },
        });
      },

      clearSession: () => set({ credentials: null }),

      isAuthenticated: () => {
        const c = get().credentials;
        return Boolean(c?.idInstance && c?.apiTokenInstance);
      },
    }),
    { name: "max-chat-session" },
  ),
);
