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

const createTestStore = () =>
  create<ChatState>()((set, get) => ({
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

// Фабрика тестовых чатов

const FIXED_TIMESTAMP = 1_700_000_000_000;

const makeChat = (
  id: string,
  overrides: Partial<Chat> = {},
): Chat => ({
  id,
  title: `Chat ${id}`,
  phone: `7999123456${id.slice(-1)}`,
  createdAt: FIXED_TIMESTAMP,
  ...overrides,
});

const CHAT_1 = makeChat("chat1");
const CHAT_2 = makeChat("chat2");

// Хелперы для работы со стором

type Store = ReturnType<typeof createTestStore>;

const state = (store: Store) => store.getState();
const addChat = (store: Store, chat: Chat) => state(store).addChat(chat);
const addChats = (store: Store, ...chats: Chat[]) =>
  chats.forEach((c) => addChat(store, c));

/** Проверяет полное содержимое списка чатов (и порядок, и поля). */
const expectChats = (store: Store, expected: Chat[]) => {
  expect(state(store).chats).toEqual(expected);
};

// Тесты

describe("chatStore", () => {
  let store: Store;

  beforeEach(() => {
    store = createTestStore();
  });

  describe("addChat", () => {
    it("should add new chat to the beginning of the list", () => {
      const result1 = addChat(store, CHAT_1);
      expect(result1.created).toBe(true);
      expectChats(store, [CHAT_1]);
      expect(state(store).activeChatId).toBe("chat1");

      const result2 = addChat(store, CHAT_2);
      expect(result2.created).toBe(true);
      expectChats(store, [CHAT_2, CHAT_1]);
      expect(state(store).activeChatId).toBe("chat2");
    });

    it("should not add duplicate chat and set it as active", () => {
      const result1 = addChat(store, CHAT_1);
      expect(result1.created).toBe(true);
      expectChats(store, [CHAT_1]);

      const result2 = addChat(store, CHAT_1);
      expect(result2.created).toBe(false);
      expectChats(store, [CHAT_1]);
      expect(state(store).activeChatId).toBe("chat1");
    });

    it("should set added chat as active", () => {
      addChat(store, CHAT_1);
      expect(state(store).activeChatId).toBe("chat1");
    });
  });

  describe("setActiveChat", () => {
    it("should set active chat by id", () => {
      addChats(store, CHAT_1, CHAT_2);

      state(store).setActiveChat("chat1");
      expect(state(store).activeChatId).toBe("chat1");

      state(store).setActiveChat("chat2");
      expect(state(store).activeChatId).toBe("chat2");
    });

    it("should set active chat even if chat doesn't exist", () => {
      state(store).setActiveChat("nonexistent");
      expect(state(store).activeChatId).toBe("nonexistent");
    });
  });

  describe("clearActiveChat", () => {
    it("should clear active chat", () => {
      addChat(store, CHAT_1);
      expect(state(store).activeChatId).toBe("chat1");

      state(store).clearActiveChat();
      expect(state(store).activeChatId).toBe(null);
    });

    it("should handle clearing when no active chat", () => {
      expect(state(store).activeChatId).toBe(null);

      state(store).clearActiveChat();
      expect(state(store).activeChatId).toBe(null);
    });
  });

  describe("getActiveChat", () => {
    it("should return active chat explicitly set via setActiveChat", () => {
      addChats(store, CHAT_1, CHAT_2);
      // Явно выставляем активный чат — не полагаемся на побочный эффект addChat
      state(store).setActiveChat("chat1");

      expect(state(store).getActiveChat()).toEqual(CHAT_1);
    });

    it("should return null when no active chat", () => {
      expect(state(store).getActiveChat()).toBe(null);
    });

    it("should return null when active chat id doesn't exist in chats", () => {
      state(store).setActiveChat("nonexistent");
      expect(state(store).getActiveChat()).toBe(null);
    });
  });

  describe("integration tests", () => {
    it("should handle complete chat lifecycle", () => {
      // Создаем два чата — addChat делает последний активным
      addChats(store, CHAT_1, CHAT_2);
      expectChats(store, [CHAT_2, CHAT_1]);
      expect(state(store).activeChatId).toBe("chat2");

      // Переключаем активный чат на чат 1
      state(store).setActiveChat("chat1");
      expect(state(store).activeChatId).toBe("chat1");
      expect(state(store).getActiveChat()).toEqual(CHAT_1);

      // Закрываем активный чат 1
      state(store).clearActiveChat();
      expect(state(store).activeChatId).toBe(null);
      expect(state(store).getActiveChat()).toBe(null);

      // Переключаем активный чат на чат 2
      state(store).setActiveChat("chat2");
      expect(state(store).getActiveChat()).toEqual(CHAT_2);
    });
  });
});
