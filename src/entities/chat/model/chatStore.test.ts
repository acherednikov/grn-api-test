import { describe, it, expect, beforeEach, vi } from "vitest";

import type { Chat } from "./types";
import { useChatStore } from "./chatStore";

/* -------------------------------------------------------------------------- */
/*                         Фабрика тестовых чатов                             */
/* -------------------------------------------------------------------------- */

/** Фиксированный timestamp для стабильных deep-равенств в тестах. */
const FIXED_TIMESTAMP = 1_700_000_000_000;

/**
 * Создаёт доменный объект `Chat` с адекватными дефолтами;
 * любое поле можно переопределить через `overrides`.
 */
const makeChat = (id: string, overrides: Partial<Chat> = {}): Chat => ({
  id,
  title: `Chat ${id}`,
  phone: `7999123456${id.slice(-1)}`,
  createdAt: FIXED_TIMESTAMP,
  ...overrides,
});

const CHAT_1 = makeChat("chat1");
const CHAT_2 = makeChat("chat2");

/* -------------------------------------------------------------------------- */
/*                          Хелперы для работы со стором                      */
/* -------------------------------------------------------------------------- */

type Store = typeof useChatStore;

const state = (store: Store) => store.getState();
const addChat = (store: Store, chat: Chat) => state(store).addChat(chat);
const addChats = (store: Store, ...chats: Chat[]) =>
  chats.forEach((c) => addChat(store, c));

/**
 * Проверка полного содержимого списка чатов с учётом порядка
 * (не глубокий `toBe` а структурное `toEqual` — как было в исходных тестах).
 */
const expectChats = (store: Store, expected: Chat[]) => {
  expect(state(store).chats).toEqual(expected);
};

/* -------------------------------------------------------------------------- */
/*                                Тест-сьют                                   */
/* -------------------------------------------------------------------------- */

describe("chatStore", () => {
  let store: Store;

  /**
   * Перед каждым тестом:
   *  • Берём реальный singleton-стор `useChatStore` — НЕ его копию
   *    (как было раньше — это антипаттерн, ведь тогда мы тестируем
   *     не продакшен-код, а локальный дубликат).
   *  • Сбрасываем данные через `setState` — Zustand partial-обновления.
   *  • Очищаем все mocks/spies от предыдущих `it`-блоков.
   */
  beforeEach(() => {
    store = useChatStore;
    store.setState({ chats: [], activeChatId: null });
    vi.clearAllMocks();
  });

  /* ---------------- addChat ---------------- */

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

      // Делаем CHAT_2 активным, чтобы проверить переключение обратно
      addChat(store, CHAT_2);
      expect(state(store).activeChatId).toBe("chat2");

      const result2 = addChat(store, CHAT_1);
      expect(result2.created).toBe(false);
      // Массив чатов остаётся тем же [CHAT_2, CHAT_1]
      expectChats(store, [CHAT_2, CHAT_1]);
      // Но activeChatId переключился на существующий CHAT_1
      expect(state(store).activeChatId).toBe("chat1");
    });

    it("should set added chat as active", () => {
      addChat(store, CHAT_1);
      expect(state(store).activeChatId).toBe("chat1");
    });

    it("existing + already-active chat should be no-op (state stability)", () => {
      addChat(store, CHAT_1);
      const prev = state(store);

      // CHAT_1 уже есть и уже активен → ничего не должно измениться
      const result = addChat(store, CHAT_1);
      expect(result.created).toBe(false);

      // Ссылочная стабильность state-объекта не гарантируется Zustand
      // при каждом `set()` внутри, но данные точно не меняются:
      expect(state(store).activeChatId).toBe(prev.activeChatId);
      expect(state(store).chats).toBe(prev.chats);
    });

    it("adds many chats preserving prepend order (newest first)", () => {
      const c3 = makeChat("chat3");
      const c4 = makeChat("chat4");
      addChats(store, CHAT_1, c3, CHAT_2, c4);

      expectChats(store, [c4, CHAT_2, c3, CHAT_1]);
      expect(state(store).activeChatId).toBe(c4.id);
    });
  });

  /* ---------------- setActiveChat ---------------- */

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

    it("should be no-op when re-setting the same active chat id", () => {
      addChat(store, CHAT_1); // activeChatId = "chat1"
      const prevActiveChatId = state(store).activeChatId;
      const prevChats = state(store).chats;

      state(store).setActiveChat("chat1"); // то же самое

      expect(state(store).activeChatId).toBe(prevActiveChatId);
      expect(state(store).chats).toBe(prevChats);
    });
  });

  /* ---------------- clearActiveChat ---------------- */

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

    it("should be no-op (idempotent) when activeChatId is already null", () => {
      // Стартуем с чистого стора — activeChatId === null
      const prev = state(store);

      state(store).clearActiveChat();

      // Данные не изменились:
      expect(state(store).activeChatId).toBe(null);
      expect(state(store).chats).toBe(prev.chats);
    });
  });

  /* ---------------- getActiveChat ---------------- */

  describe("getActiveChat", () => {
    it("should return active chat explicitly set via setActiveChat", () => {
      addChats(store, CHAT_1, CHAT_2);
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

    it("returns updated chat reference after active chat changes", () => {
      addChats(store, CHAT_1, CHAT_2);
      state(store).setActiveChat("chat2");
      expect(state(store).getActiveChat()?.id).toBe("chat2");

      state(store).clearActiveChat();
      expect(state(store).getActiveChat()).toBeNull();
    });
  });

  /* ---------------- integration tests ---------------- */

  describe("integration tests", () => {
    it("should handle complete chat lifecycle", () => {
      addChats(store, CHAT_1, CHAT_2);
      expectChats(store, [CHAT_2, CHAT_1]);
      expect(state(store).activeChatId).toBe("chat2");

      state(store).setActiveChat("chat1");
      expect(state(store).activeChatId).toBe("chat1");
      expect(state(store).getActiveChat()).toEqual(CHAT_1);

      state(store).clearActiveChat();
      expect(state(store).activeChatId).toBe(null);
      expect(state(store).getActiveChat()).toBe(null);

      state(store).setActiveChat("chat2");
      expect(state(store).getActiveChat()).toEqual(CHAT_2);
    });

    /**
     * Регрессия: переключение между существующими чатами через addChat(idem)
     * + setActiveChat не должно ломать порядок чатов в сайдбаре.
     */
    it("preserves chat list order when switching via idem addChat + setActiveChat", () => {
      addChats(store, CHAT_1, makeChat("chat3"), CHAT_2);
      const snapshotBefore = [...state(store).chats];

      // Несколько циклов переключений
      state(store).setActiveChat("chat1");
      addChat(store, CHAT_2);
      state(store).setActiveChat("chat3");

      // Данные чатов и их относительный порядок — не изменились
      expect(state(store).chats).toEqual(snapshotBefore);
      // А активный — последний переключённый
      expect(state(store).activeChatId).toBe("chat3");
    });
  });
});
