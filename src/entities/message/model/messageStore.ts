import { create } from "zustand";

import type { Message } from "./types";

type MessageState = {
  byChatId: Record<string, Message[]>;
  appendMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  removeMessage: (messageId: string) => void;
};

function sortMessages(messages: Message[]): Message[] {
  return [...messages].sort((a, b) => a.timestamp - b.timestamp);
}

export const useMessageStore = create<MessageState>((set, get) => ({
  byChatId: {},

  appendMessage: (message) => {
    set((state) => {
      const list = state.byChatId[message.chatId] ?? [];
      const exists = list.some(
        (m) => m.id === message.id || (message.idMessage && m.idMessage === message.idMessage),
      );
      // Дедуп: сообщение уже есть в списке — выходим без изменений,
      // чтобы не триггерить лишние ререндеры подписчиков
      if (exists) return state;

      let nextList: Message[];
      // Оптимизация распространённого случая: новое сообщение
      // обычно приходит с timestamp >= последнего в списке.
      // Вместо сортировки — просто аппенд.
      // Полная сортировка нужна только для запоздалых сообщений
      // (например ретры, восстановление истории, вебхуки не по порядку).
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
