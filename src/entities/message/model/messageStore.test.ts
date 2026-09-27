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

const createTestStore = () => create<MessageState>((set) => ({
  byChatId: {},
  appendMessage: (message) => {
    set((state) => {
      const list = state.byChatId[message.chatId] ?? [];
      const exists = list.some(
        (m) => m.id === message.id || (message.idMessage && m.idMessage === message.idMessage),
      );
      if (exists) return state;

      let nextList: Message[];
      if (list.length === 0 || message.timestamp >= list[list.length - 1].timestamp) {
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

describe("messageStore", () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe("appendMessage", () => {
    it("should add message to empty chat", () => {
      const message = {
        id: "msg1",
        chatId: "chat1",
        text: "Hello",
        direction: "outgoing" as const,
        timestamp: 1000,
      };

      store.getState().appendMessage(message);
      
      const state = store.getState();
      expect(state.byChatId["chat1"]).toHaveLength(1);
      expect(state.byChatId["chat1"][0]).toEqual(message);
    });

    it("should add message to existing chat", () => {
      const message1 = {
        id: "msg1",
        chatId: "chat1",
        text: "Hello",
        direction: "outgoing" as const,
        timestamp: 1000,
      };
      
      const message2 = {
        id: "msg2",
        chatId: "chat1",
        text: "World",
        direction: "incoming" as const,
        timestamp: 2000,
      };

      store.getState().appendMessage(message1);
      store.getState().appendMessage(message2);
      
      const state = store.getState();
      expect(state.byChatId["chat1"]).toHaveLength(2);
      expect(state.byChatId["chat1"][0]).toEqual(message1);
      expect(state.byChatId["chat1"][1]).toEqual(message2);
    });

    it("should not add duplicate message by id", () => {
      const message = {
        id: "msg1",
        chatId: "chat1",
        text: "Hello",
        direction: "outgoing" as const,
        timestamp: 1000,
      };

      store.getState().appendMessage(message);
      store.getState().appendMessage(message);
      
      const state = store.getState();
      expect(state.byChatId["chat1"]).toHaveLength(1);
    });

    it("should not add duplicate message by idMessage", () => {
      const message1 = {
        id: "msg1",
        chatId: "chat1",
        text: "Hello",
        direction: "outgoing" as const,
        timestamp: 1000,
        idMessage: "idMsg1",
      };
      
      const message2 = {
        id: "msg2",
        chatId: "chat1",
        text: "Hello",
        direction: "outgoing" as const,
        timestamp: 1000,
        idMessage: "idMsg1",
      };

      store.getState().appendMessage(message1);
      store.getState().appendMessage(message2);
      
      const state = store.getState();
      expect(state.byChatId["chat1"]).toHaveLength(1);
    });

    it("should sort messages when timestamp is out of order", () => {
      const message1 = {
        id: "msg1",
        chatId: "chat1",
        text: "First",
        direction: "outgoing" as const,
        timestamp: 2000,
      };
      
      const message2 = {
        id: "msg2",
        chatId: "chat1",
        text: "Second",
        direction: "incoming" as const,
        timestamp: 1000,
      };

      store.getState().appendMessage(message1);
      store.getState().appendMessage(message2);
      
      const state = store.getState();
      expect(state.byChatId["chat1"]).toHaveLength(2);
      expect(state.byChatId["chat1"][0].timestamp).toBe(1000);
      expect(state.byChatId["chat1"][1].timestamp).toBe(2000);
    });

    it("should handle multiple chats separately", () => {
      const message1 = {
        id: "msg1",
        chatId: "chat1",
        text: "Hello",
        direction: "outgoing" as const,
        timestamp: 1000,
      };
      
      const message2 = {
        id: "msg2",
        chatId: "chat2",
        text: "World",
        direction: "incoming" as const,
        timestamp: 2000,
      };

      store.getState().appendMessage(message1);
      store.getState().appendMessage(message2);
      
      const state = store.getState();
      expect(state.byChatId["chat1"]).toHaveLength(1);
      expect(state.byChatId["chat2"]).toHaveLength(1);
      expect(state.byChatId["chat1"][0]).toEqual(message1);
      expect(state.byChatId["chat2"][0]).toEqual(message2);
    });
  });

  describe("updateMessage", () => {
    it("should update message by id", () => {
      const message = {
        id: "msg1",
        chatId: "chat1",
        text: "Hello",
        direction: "outgoing" as const,
        timestamp: 1000,
      };

      store.getState().appendMessage(message);
      store.getState().updateMessage("msg1", { text: "Updated", status: MessageStatus.Sent });
      
      const state = store.getState();
      expect(state.byChatId["chat1"][0].text).toBe("Updated");
      expect(state.byChatId["chat1"][0].status).toBe(MessageStatus.Sent);
    });

    it("should update message across all chats", () => {
      const message1 = {
        id: "msg1",
        chatId: "chat1",
        text: "Hello",
        direction: "outgoing" as const,
        timestamp: 1000,
      };
      
      const message2 = {
        id: "msg2",
        chatId: "chat2",
        text: "World",
        direction: "incoming" as const,
        timestamp: 2000,
      };

      store.getState().appendMessage(message1);
      store.getState().appendMessage(message2);
      store.getState().updateMessage("msg1", { text: "Updated" });
      
      const state = store.getState();
      expect(state.byChatId["chat1"][0].text).toBe("Updated");
      expect(state.byChatId["chat2"][0].text).toBe("World");
    });

    it("should not update non-existent message", () => {
      const message = {
        id: "msg1",
        chatId: "chat1",
        text: "Hello",
        direction: "outgoing" as const,
        timestamp: 1000,
      };

      store.getState().appendMessage(message);
      store.getState().updateMessage("nonexistent", { text: "Updated" });
      
      const state = store.getState();
      expect(state.byChatId["chat1"][0].text).toBe("Hello");
    });

    it("should handle updating message with partial data", () => {
      const message = {
        id: "msg1",
        chatId: "chat1",
        text: "Hello",
        direction: "outgoing" as const,
        timestamp: 1000,
        status: MessageStatus.Pending,
      };

      store.getState().appendMessage(message);
      store.getState().updateMessage("msg1", { status: MessageStatus.Sent });
      
      const state = store.getState();
      expect(state.byChatId["chat1"][0].text).toBe("Hello");
      expect(state.byChatId["chat1"][0].status).toBe(MessageStatus.Sent);
    });
  });

  describe("removeMessage", () => {
    it("should remove message by id", () => {
      const message = {
        id: "msg1",
        chatId: "chat1",
        text: "Hello",
        direction: "outgoing" as const,
        timestamp: 1000,
      };

      store.getState().appendMessage(message);
      store.getState().removeMessage("msg1");
      
      const state = store.getState();
      expect(state.byChatId["chat1"]).toHaveLength(0);
    });

    it("should remove message from correct chat", () => {
      const message1 = {
        id: "msg1",
        chatId: "chat1",
        text: "Hello",
        direction: "outgoing" as const,
        timestamp: 1000,
      };
      
      const message2 = {
        id: "msg2",
        chatId: "chat2",
        text: "World",
        direction: "incoming" as const,
        timestamp: 2000,
      };

      store.getState().appendMessage(message1);
      store.getState().appendMessage(message2);
      store.getState().removeMessage("msg1");
      
      const state = store.getState();
      expect(state.byChatId["chat1"]).toHaveLength(0);
      expect(state.byChatId["chat2"]).toHaveLength(1);
    });

    it("should not remove non-existent message", () => {
      const message = {
        id: "msg1",
        chatId: "chat1",
        text: "Hello",
        direction: "outgoing" as const,
        timestamp: 1000,
      };

      store.getState().appendMessage(message);
      store.getState().removeMessage("nonexistent");
      
      const state = store.getState();
      expect(state.byChatId["chat1"]).toHaveLength(1);
    });

    it("should handle removing message from middle of list", () => {
      const message1 = {
        id: "msg1",
        chatId: "chat1",
        text: "First",
        direction: "outgoing" as const,
        timestamp: 1000,
      };
      
      const message2 = {
        id: "msg2",
        chatId: "chat1",
        text: "Second",
        direction: "incoming" as const,
        timestamp: 2000,
      };
      
      const message3 = {
        id: "msg3",
        chatId: "chat1",
        text: "Third",
        direction: "outgoing" as const,
        timestamp: 3000,
      };

      store.getState().appendMessage(message1);
      store.getState().appendMessage(message2);
      store.getState().appendMessage(message3);
      store.getState().removeMessage("msg2");
      
      const state = store.getState();
      expect(state.byChatId["chat1"]).toHaveLength(2);
      expect(state.byChatId["chat1"][0].id).toBe("msg1");
      expect(state.byChatId["chat1"][1].id).toBe("msg3");
    });
  });

  describe("integration tests", () => {
    it("should handle complete message lifecycle", () => {
      const message1 = {
        id: "msg1",
        chatId: "chat1",
        text: "Hello",
        direction: "outgoing" as const,
        timestamp: 1000,
        status: MessageStatus.Pending,
      };
      
      const message2 = {
        id: "msg2",
        chatId: "chat1",
        text: "World",
        direction: "incoming" as const,
        timestamp: 2000,
      };

      // Добавляем сообщения
      store.getState().appendMessage(message1);
      store.getState().appendMessage(message2);
      
      let state = store.getState();
      expect(state.byChatId["chat1"]).toHaveLength(2);
      
      // Помечаляем сообщение как отправленное
      store.getState().updateMessage("msg1", { status: MessageStatus.Sent });
      state = store.getState();
      expect(state.byChatId["chat1"][0].status).toBe(MessageStatus.Sent);
      
      // Удаляем сообщение
      store.getState().removeMessage("msg2");
      state = store.getState();
      expect(state.byChatId["chat1"]).toHaveLength(1);
      expect(state.byChatId["chat1"][0].id).toBe("msg1");
    });

    it("should handle complex multi-chat scenario", () => {
      const chat1Msg1 = {
        id: "msg1",
        chatId: "chat1",
        text: "Hello from chat1",
        direction: "outgoing" as const,
        timestamp: 1000,
      };
      
      const chat1Msg2 = {
        id: "msg2",
        chatId: "chat1",
        text: "World from chat1",
        direction: "incoming" as const,
        timestamp: 2000,
      };
      
      const chat2Msg1 = {
        id: "msg3",
        chatId: "chat2",
        text: "Hello from chat2",
        direction: "outgoing" as const,
        timestamp: 1500,
      };

      // Добавляем сообщения в разные чаты
      store.getState().appendMessage(chat1Msg1);
      store.getState().appendMessage(chat2Msg1);
      store.getState().appendMessage(chat1Msg2);
      
      let state = store.getState();
      expect(state.byChatId["chat1"]).toHaveLength(2);
      expect(state.byChatId["chat2"]).toHaveLength(1);
      
      // Обновляем сообщение в чате 1
      store.getState().updateMessage("msg1", { text: "Updated" });
      state = store.getState();
      expect(state.byChatId["chat1"][0].text).toBe("Updated");
      expect(state.byChatId["chat2"][0].text).toBe("Hello from chat2");
      
      // Удаляем сообщение из чата 2
      store.getState().removeMessage("msg3");
      state = store.getState();
      expect(state.byChatId["chat1"]).toHaveLength(2);
      expect(state.byChatId["chat2"]).toHaveLength(0);
    });
  });
});
