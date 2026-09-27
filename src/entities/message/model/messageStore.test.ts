import { describe, it, expect, beforeEach } from "vitest";
import { create } from "zustand";
import { MessageStatus, type Message } from "./types";

type MessageState = {
  byChatId: Record<string, Message[]>;
  appendMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  removeMessage: (messageId: string) => void;
};

function sortMessages(messages: Message[]): Message[] {
  return [...messages].sort((a, b) => a.timestamp - b.timestamp);
}

const createTestStore = () =>
  create<MessageState>((set) => ({
    byChatId: {},
    appendMessage: (message) => {
      set((state) => {
        const list = state.byChatId[message.chatId] ?? [];
        const exists = list.some(
          (m) =>
            m.id === message.id ||
            (message.idMessage && m.idMessage === message.idMessage),
        );
        if (exists) return state;

        let nextList: Message[];
        if (
          list.length === 0 ||
          message.timestamp >= list[list.length - 1].timestamp
        ) {
          nextList = [...list, message];
        } else {
          nextList = sortMessages([...list, message]);
        }

        return {
          byChatId: {
            ...state.byChatId,
            [message.chatId]: nextList,
          },
        };
      });
    },
    updateMessage: (messageId, updates) => {
      set((state) => {
        const next = { ...state.byChatId };

        for (const chatId in next) {
          const list = next[chatId];
          const messageIndex = list.findIndex((m) => m.id === messageId);
          if (messageIndex !== -1) {
            next[chatId] = [
              ...list.slice(0, messageIndex),
              { ...list[messageIndex], ...updates },
              ...list.slice(messageIndex + 1),
            ];
            break;
          }
        }

        return { byChatId: next };
      });
    },
    removeMessage: (messageId) => {
      set((state) => {
        const next = { ...state.byChatId };

        for (const chatId in next) {
          const list = next[chatId];
          const messageIndex = list.findIndex((m) => m.id === messageId);
          if (messageIndex !== -1) {
            next[chatId] = [
              ...list.slice(0, messageIndex),
              ...list.slice(messageIndex + 1),
            ];
            break;
          }
        }

        return { byChatId: next };
      });
    },
  }));

// Фабрика тестовых сообщений

type MakeMessageInput = {
  id: string;
  chatId?: string;
  text?: string;
  direction?: Message["direction"];
  timestamp?: number;
  status?: MessageStatus;
  idMessage?: string;
};

const makeMessage = ({
  id,
  chatId = "chat1",
  text = `Message ${id}`,
  direction = "outgoing",
  timestamp = 1000,
  status,
  idMessage,
}: MakeMessageInput): Message =>
  ({
    id,
    chatId,
    text,
    direction,
    timestamp,
    ...(status !== undefined && { status }),
    ...(idMessage !== undefined && { idMessage }),
  }) as Message;

const CHAT_1 = "chat1";
const CHAT_2 = "chat2";

// Хелперы для работы со стором

type Store = ReturnType<typeof createTestStore>;

const state = (store: Store) => store.getState();
const append = (store: Store, message: Message) =>
  state(store).appendMessage(message);
const appendAll = (store: Store, ...messages: Message[]) =>
  messages.forEach((m) => append(store, m));
const update = (store: Store, id: string, updates: Partial<Message>) =>
  state(store).updateMessage(id, updates);
const remove = (store: Store, id: string) =>
  state(store).removeMessage(id);

/** Возвращает список сообщений в чате. */
const messagesIn = (store: Store, chatId: string = CHAT_1): Message[] =>
  state(store).byChatId[chatId] ?? [];

/** Проверяет id сообщений в чате (порядок тоже). */
const expectMessageIds = (
  store: Store,
  ids: string[],
  chatId: string = CHAT_1,
) => {
  expect(messagesIn(store, chatId).map((m) => m.id)).toEqual(ids);
};

// Тесты

describe("messageStore", () => {
  let store: Store;

  beforeEach(() => {
    store = createTestStore();
  });

  describe("appendMessage", () => {
    it("should add message to empty chat", () => {
      const message = makeMessage({ id: "msg1", text: "Hello" });

      append(store, message);

      const list = messagesIn(store);
      expect(list).toHaveLength(1);
      expect(list[0]).toEqual(message);
    });

    it("should add message to existing chat", () => {
      const message1 = makeMessage({
        id: "msg1",
        text: "Hello",
        timestamp: 1000,
      });
      const message2 = makeMessage({
        id: "msg2",
        text: "World",
        direction: "incoming",
        timestamp: 2000,
      });

      appendAll(store, message1, message2);

      const list = messagesIn(store);
      expect(list).toHaveLength(2);
      expect(list[0]).toEqual(message1);
      expect(list[1]).toEqual(message2);
    });

    it("should not add duplicate message by id", () => {
      const message = makeMessage({ id: "msg1", text: "Hello" });

      appendAll(store, message, message);

      expect(messagesIn(store)).toHaveLength(1);
    });

    it("should not add duplicate message by idMessage", () => {
      const message1 = makeMessage({
        id: "msg1",
        text: "Hello",
        idMessage: "idMsg1",
      });
      const message2 = makeMessage({
        id: "msg2",
        text: "Hello",
        idMessage: "idMsg1",
      });

      appendAll(store, message1, message2);

      expect(messagesIn(store)).toHaveLength(1);
    });

    it("should sort messages when timestamp is out of order", () => {
      appendAll(
        store,
        makeMessage({ id: "msg1", text: "First", timestamp: 2000 }),
        makeMessage({
          id: "msg2",
          text: "Second",
          direction: "incoming",
          timestamp: 1000,
        }),
      );

      const list = messagesIn(store);
      expect(list).toHaveLength(2);
      expect(list[0].timestamp).toBe(1000);
      expect(list[1].timestamp).toBe(2000);
    });

    it("should handle multiple chats separately", () => {
      const message1 = makeMessage({
        id: "msg1",
        chatId: CHAT_1,
        text: "Hello",
      });
      const message2 = makeMessage({
        id: "msg2",
        chatId: CHAT_2,
        text: "World",
        direction: "incoming",
        timestamp: 2000,
      });

      appendAll(store, message1, message2);

      expect(messagesIn(store, CHAT_1)).toEqual([message1]);
      expect(messagesIn(store, CHAT_2)).toEqual([message2]);
    });
  });

  describe("updateMessage", () => {
    it("should update message by id", () => {
      append(store, makeMessage({ id: "msg1", text: "Hello" }));

      update(store, "msg1", {
        text: "Updated",
        status: MessageStatus.Sent,
      });

      const [msg] = messagesIn(store);
      expect(msg.text).toBe("Updated");
      expect(msg.status).toBe(MessageStatus.Sent);
    });

    it("should update only target message and leave other chats intact", () => {
      const message1 = makeMessage({
        id: "msg1",
        chatId: CHAT_1,
        text: "Hello",
      });
      const message2 = makeMessage({
        id: "msg2",
        chatId: CHAT_2,
        text: "World",
        direction: "incoming",
        timestamp: 2000,
      });

      appendAll(store, message1, message2);
      update(store, "msg1", { text: "Updated" });

      expect(messagesIn(store, CHAT_1)[0].text).toBe("Updated");
      expect(messagesIn(store, CHAT_2)[0].text).toBe("World");
    });

    it("should not update non-existent message", () => {
      append(store, makeMessage({ id: "msg1", text: "Hello" }));

      update(store, "nonexistent", { text: "Updated" });

      expect(messagesIn(store)[0].text).toBe("Hello");
    });

    it("should handle updating message with partial data", () => {
      append(
        store,
        makeMessage({
          id: "msg1",
          text: "Hello",
          status: MessageStatus.Pending,
        }),
      );

      update(store, "msg1", { status: MessageStatus.Sent });

      const [msg] = messagesIn(store);
      expect(msg.text).toBe("Hello");
      expect(msg.status).toBe(MessageStatus.Sent);
    });
  });

  describe("removeMessage", () => {
    it("should remove message by id", () => {
      append(store, makeMessage({ id: "msg1", text: "Hello" }));

      remove(store, "msg1");

      expect(messagesIn(store)).toHaveLength(0);
    });

    it("should remove message from correct chat", () => {
      appendAll(
        store,
        makeMessage({ id: "msg1", chatId: CHAT_1, text: "Hello" }),
        makeMessage({
          id: "msg2",
          chatId: CHAT_2,
          text: "World",
          direction: "incoming",
          timestamp: 2000,
        }),
      );

      remove(store, "msg1");

      expect(messagesIn(store, CHAT_1)).toHaveLength(0);
      expect(messagesIn(store, CHAT_2)).toHaveLength(1);
    });

    it("should not remove non-existent message", () => {
      append(store, makeMessage({ id: "msg1", text: "Hello" }));

      remove(store, "nonexistent");

      expect(messagesIn(store)).toHaveLength(1);
    });

    it("should handle removing message from middle of list", () => {
      appendAll(
        store,
        makeMessage({ id: "msg1", text: "First", timestamp: 1000 }),
        makeMessage({
          id: "msg2",
          text: "Second",
          direction: "incoming",
          timestamp: 2000,
        }),
        makeMessage({ id: "msg3", text: "Third", timestamp: 3000 }),
      );

      remove(store, "msg2");

      expectMessageIds(store, ["msg1", "msg3"]);
    });
  });

  describe("integration tests", () => {
    it("should handle complete message lifecycle", () => {
      const message1 = makeMessage({
        id: "msg1",
        text: "Hello",
        timestamp: 1000,
        status: MessageStatus.Pending,
      });
      const message2 = makeMessage({
        id: "msg2",
        text: "World",
        direction: "incoming",
        timestamp: 2000,
      });

      appendAll(store, message1, message2);
      expect(messagesIn(store)).toHaveLength(2);

      update(store, "msg1", { status: MessageStatus.Sent });
      expect(messagesIn(store)[0].status).toBe(MessageStatus.Sent);

      remove(store, "msg2");
      expectMessageIds(store, ["msg1"]);
    });

    it("should handle complex multi-chat scenario", () => {
      const chat1Msg1 = makeMessage({
        id: "msg1",
        chatId: CHAT_1,
        text: "Hello from chat1",
        timestamp: 1000,
      });
      const chat1Msg2 = makeMessage({
        id: "msg2",
        chatId: CHAT_1,
        text: "World from chat1",
        direction: "incoming",
        timestamp: 2000,
      });
      const chat2Msg1 = makeMessage({
        id: "msg3",
        chatId: CHAT_2,
        text: "Hello from chat2",
        timestamp: 1500,
      });

      // Добавляем сообщения в разные чаты
      appendAll(store, chat1Msg1, chat2Msg1, chat1Msg2);

      expect(messagesIn(store, CHAT_1)).toHaveLength(2);
      expect(messagesIn(store, CHAT_2)).toHaveLength(1);

      // Обновляем сообщение в чате 1
      update(store, "msg1", { text: "Updated" });
      expect(messagesIn(store, CHAT_1)[0].text).toBe("Updated");
      expect(messagesIn(store, CHAT_2)[0].text).toBe("Hello from chat2");

      // Удаляем сообщение из чата 2
      remove(store, "msg3");
      expect(messagesIn(store, CHAT_1)).toHaveLength(2);
      expect(messagesIn(store, CHAT_2)).toHaveLength(0);
    });
  });
});
