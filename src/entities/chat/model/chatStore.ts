import { create } from "zustand";

import type { Chat } from "./types";

type AddChatResult = { created: boolean };

export type ResolveChatResult = {
  chatId: string;
  previousChatId: string | null;
};

type ChatState = {
  chats: Chat[];
  activeChatId: string | null;
  addChat: (chat: Chat) => AddChatResult;
  setActiveChat: (chatId: string) => void;
  clearActiveChat: () => void;
  getActiveChat: () => Chat | null;
};

export const useChatStore = create<ChatState>()(
  (set, get) => ({
    chats: [],
    activeChatId: null,

    addChat: (chat) => {
      const state = get();
      const exists = state.chats.some((c) => c.id === chat.id);

      if (exists) {
        set({ activeChatId: chat.id });

        return { created: false };
      }

      set({
        chats: [chat, ...state.chats],
        activeChatId: chat.id,
      });

      return { created: true };
    },

    setActiveChat: (chatId) => set({ activeChatId: chatId }),

    clearActiveChat: () => set({ activeChatId: null }),

    getActiveChat: () => {
      const { chats, activeChatId } = get();
      if (!activeChatId) return null;
      
      return chats.find((c) => c.id === activeChatId) ?? null;
    },
  }),
);
