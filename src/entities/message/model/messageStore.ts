import { create } from "zustand";

import type { Message } from "./types";

type MessageState = {
  byChatId: Record<string, Message[]>;
  appendMessage: (message: Message) => void;
  rekeyChatMessages: (fromChatId: string, toChatId: string) => void;
  getMessagesForChat: (chatId: string) => Message[];
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

  /**
   * Переносит сообщения из одного ключа чата в другой.
   * Используется когда чат был создан с временным chatId (phone@c.us,
   * если CheckAccount не сработал), а потом пришло уведомление с
   * настоящим MAX chatId — сообщения, накопившиеся под старым ключом,
   * перекладываем под новый, объединяя/дедуплицируя с теми, что уже
   * могли попасть под новый ключ.
   */
  rekeyChatMessages: (fromChatId, toChatId) => {
    if (fromChatId === toChatId) return;

    set((state) => {
      const fromList = state.byChatId[fromChatId] ?? [];
      // Ничего не было по старому ключу — состояние не меняем
      if (fromList.length === 0 && !(fromChatId in state.byChatId)) {
        return state;
      }

      const toList = state.byChatId[toChatId] ?? [];
      // Перезаписываем chatId у перемещаемых сообщений, сливаем с теми,
      // что уже есть в toList, сортируем и убираем дубликаты по id/idMessage
      const merged = sortMessages([
        ...toList,
        ...fromList.map((m) => ({ ...m, chatId: toChatId })),
      ]).filter(
        (m, index, arr) =>
          arr.findIndex(
            (x) =>
              x.id === m.id ||
              (x.idMessage && m.idMessage && x.idMessage === m.idMessage),
          ) === index,
      );

      const next = { ...state.byChatId };
      delete next[fromChatId];
      next[toChatId] = merged;
      return { byChatId: next };
    });
  },

  getMessagesForChat: (chatId) => get().byChatId[chatId] ?? [],
}));
