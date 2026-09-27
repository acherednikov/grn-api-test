import { describe, it, expect, beforeEach } from "vitest";
import { create } from "zustand";

import type { Chat } from "./types";

type AddChatResult = { created: boolean };

type ChatState = {
  chats: Chat[];
  activeChatId: string | null;
  addChat: (chat: Chat) => AddChatResult;
  setActiveChat: (chatId: string) => void;
  clearActiveChat: () => void;
  getActiveChat: () => Chat | null;
};

const createTestStore = () => create<ChatState>()((set, get) => ({
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
}));

describe("chatStore", () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe("addChat", () => {
    it("should add new chat to the beginning of the list", () => {
      const chat1 = {
        id: "chat1",
        chatId: "chat1",
        title: "Chat 1",
        phone: "79991234567",
        createdAt: Date.now(),
      };
      
      const chat2 = {
        id: "chat2",
        chatId: "chat2",
        title: "Chat 2",
        phone: "79991234568",
        createdAt: Date.now(),
      };

      const result1 = store.getState().addChat(chat1);
      expect(result1.created).toBe(true);
      expect(store.getState().chats).toHaveLength(1);
      expect(store.getState().chats[0]).toEqual(chat1);
      expect(store.getState().activeChatId).toBe("chat1");

      const result2 = store.getState().addChat(chat2);
      expect(result2.created).toBe(true);
      expect(store.getState().chats).toHaveLength(2);
      expect(store.getState().chats[0]).toEqual(chat2);
      expect(store.getState().chats[1]).toEqual(chat1);
      expect(store.getState().activeChatId).toBe("chat2");
    });

    it("should not add duplicate chat and set it as active", () => {
      const chat = {
        id: "chat1",
        chatId: "chat1",
        title: "Chat 1",
        phone: "79991234567",
        createdAt: Date.now(),
      };

      const result1 = store.getState().addChat(chat);
      expect(result1.created).toBe(true);
      expect(store.getState().chats).toHaveLength(1);

      const result2 = store.getState().addChat(chat);
      expect(result2.created).toBe(false);
      expect(store.getState().chats).toHaveLength(1);
      expect(store.getState().activeChatId).toBe("chat1");
    });

    it("should set added chat as active", () => {
      const chat = {
        id: "chat1",
        chatId: "chat1",
        title: "Chat 1",
        phone: "79991234567",
        createdAt: Date.now(),
      };

      store.getState().addChat(chat);
      expect(store.getState().activeChatId).toBe("chat1");
    });
  });

  describe("setActiveChat", () => {
    it("should set active chat by id", () => {
      const chat1 = {
        id: "chat1",
        chatId: "chat1",
        title: "Chat 1",
        phone: "79991234567",
        createdAt: Date.now(),
      };
      
      const chat2 = {
        id: "chat2",
        chatId: "chat2",
        title: "Chat 2",
        phone: "79991234568",
        createdAt: Date.now(),
      };

      store.getState().addChat(chat1);
      store.getState().addChat(chat2);
      
      store.getState().setActiveChat("chat1");
      expect(store.getState().activeChatId).toBe("chat1");
      
      store.getState().setActiveChat("chat2");
      expect(store.getState().activeChatId).toBe("chat2");
    });

    it("should set active chat even if chat doesn't exist", () => {
      store.getState().setActiveChat("nonexistent");
      expect(store.getState().activeChatId).toBe("nonexistent");
    });
  });

  describe("clearActiveChat", () => {
    it("should clear active chat", () => {
      const chat = {
        id: "chat1",
        chatId: "chat1",
        title: "Chat 1",
        phone: "79991234567",
        createdAt: Date.now(),
      };

      store.getState().addChat(chat);
      expect(store.getState().activeChatId).toBe("chat1");
      
      store.getState().clearActiveChat();
      expect(store.getState().activeChatId).toBe(null);
    });

    it("should handle clearing when no active chat", () => {
      expect(store.getState().activeChatId).toBe(null);
      store.getState().clearActiveChat();
      expect(store.getState().activeChatId).toBe(null);
    });
  });

  describe("getActiveChat", () => {
    it("should return active chat", () => {
      const chat1 = {
        id: "chat1",
        chatId: "chat1",
        title: "Chat 1",
        phone: "79991234567",
        createdAt: Date.now(),
      };
      
      const chat2 = {
        id: "chat2",
        chatId: "chat2",
        title: "Chat 2",
        phone: "79991234568",
        createdAt: Date.now(),
      };

      store.getState().addChat(chat1);
      store.getState().addChat(chat2);
      
      const activeChat = store.getState().getActiveChat();
      expect(activeChat).toEqual(chat2);
    });

    it("should return null when no active chat", () => {
      const activeChat = store.getState().getActiveChat();
      expect(activeChat).toBe(null);
    });

    it("should return null when active chat id doesn't exist in chats", () => {
      store.getState().setActiveChat("nonexistent");
      
      const activeChat = store.getState().getActiveChat();
      expect(activeChat).toBe(null);
    });
  });

  describe("integration tests", () => {
    it("should handle complete chat lifecycle", () => {
      const chat1 = {
        id: "chat1",
        chatId: "chat1",
        title: "Chat 1",
        phone: "79991234567",
        createdAt: Date.now(),
      };
      
      const chat2 = {
        id: "chat2",
        chatId: "chat2",
        title: "Chat 2",
        phone: "79991234568",
        createdAt: Date.now(),
      };

      // Создаем два чата
      store.getState().addChat(chat1);
      store.getState().addChat(chat2);
      
      expect(store.getState().chats).toHaveLength(2);
      expect(store.getState().activeChatId).toBe("chat2");
      
      // Переключаем активный чат на чат 1
      store.getState().setActiveChat("chat1");
      expect(store.getState().activeChatId).toBe("chat1");
      expect(store.getState().getActiveChat()).toEqual(chat1);
      
      // Закрываем активный чат 1
      store.getState().clearActiveChat();
      expect(store.getState().activeChatId).toBe(null);
      expect(store.getState().getActiveChat()).toBe(null);
      
      // Переключаем активный чат на чат 2
      store.getState().setActiveChat("chat2");
      expect(store.getState().getActiveChat()).toEqual(chat2);
    });
  });
});
