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
  /**
   * Привязывает уведомление GREEN-API к локальному чату.
   * MAX отдаёт chatId как user id (например "105456231"), а локально чат мог быть создан
   * с phone@c.us, если CheckAccount не сработал. Сопоставляем по полю phone.
   */
  resolveChatFromNotification: (payload: {
    chatId: string;
    title?: string;
    phone?: string;
    contactName?: string;
    avatar?: string;
  }) => ResolveChatResult | null;
};

function digitsOnly(value: string | number | undefined): string {
  if (value === undefined || value === null) return "";
  return String(value).replace(/\D/g, "");
}

function rekeyChat(
  chats: Chat[],
  previousId: string,
  next: {
    chatId: string;
    phone?: string;
    title?: string;
    contactName?: string;
    avatar?: string;
  },
): Chat[] {
  return chats.map((c) =>
    c.chatId === previousId
      ? {
          ...c,
          id: next.chatId,
          chatId: next.chatId,
          phone: c.phone ?? next.phone,
          title: next.title && !c.contactName ? next.title : c.title,
          contactName: next.contactName ?? c.contactName,
          avatar: next.avatar ?? c.avatar,
        }
      : c,
  );
}

function patchChatInfo(
  chats: Chat[],
  chatId: string,
  patch: {
    title?: string;
    contactName?: string;
    avatar?: string;
    phone?: string;
  },
): Chat[] {
  return chats.map((c) =>
    c.chatId === chatId
      ? {
          ...c,
          phone: c.phone ?? patch.phone,
          title: patch.title && !c.contactName ? patch.title : c.title,
          contactName: patch.contactName ?? c.contactName,
          avatar: patch.avatar ?? c.avatar,
        }
      : c,
  );
}

export const useChatStore = create<ChatState>()(
  (set, get) => ({
    chats: [],
    activeChatId: null,

    addChat: (chat) => {
      const state = get();
      const exists = state.chats.some((c) => c.chatId === chat.chatId);

      if (exists) {
        set({ activeChatId: chat.chatId });
        return { created: false };
      }

      const byPhone = chat.phone
        ? state.chats.find((c) => c.phone === chat.phone)
        : undefined;

      if (byPhone) {
        set({
          chats: rekeyChat(state.chats, byPhone.chatId, {
            chatId: chat.chatId,
            phone: chat.phone,
          }),
          activeChatId: chat.chatId,
        });
        return { created: false };
      }

      set({
        chats: [chat, ...state.chats],
        activeChatId: chat.chatId,
      });
      return { created: true };
    },

    setActiveChat: (chatId) => set({ activeChatId: chatId }),

    clearActiveChat: () => set({ activeChatId: null }),

    getActiveChat: () => {
      const { chats, activeChatId } = get();
      if (!activeChatId) return null;
      return chats.find((c) => c.chatId === activeChatId) ?? null;
    },

    /**
     * Связывает входящее уведомление GREEN-API с уже существующим локальным чатом.
     *
     * Логика:
     *  1) Сначала ищем чат по точному совпадению chatId (MAX user id).
     *  2) Если не нашли — ищем по номеру телефона (senderPhoneNumber ↔ Chat.phone).
     *     Это сценарий, когда чат был создан вручную с phone@c.us (CheckAccount
     *     не сработал), а теперь пришло первое уведомление от MAX с настоящим chatId.
     *     В этом случае «переключаем» чат: обновляем id/chatId на MAX chatId,
     *     сохраняя накопленные данные и корректируем activeChatId, если он указывал
     *     на старый временный ключ.
     *  3) Если чата нет — возвращаем null. НОВЫЙ чат из уведомления не создаём,
     *     чтобы избежать дубликатов (пользователь должен создать чат явно).
     *
     * Возвращает объект:
     *   { chatId, previousChatId } — previousChatId не null только когда произошла
     *   переклюение ключа (случай 2), вызывающий использует его для вызова
     *   messageStore.rekeyChatMessages() и переноса истории сообщений.
     */
    resolveChatFromNotification: ({ chatId, title, phone, contactName, avatar }) => {
      const state = get();
      const phoneDigits = digitsOnly(phone);

      const byId = state.chats.find((c) => c.chatId === chatId);
      if (byId) {
        const needsPatch =
          (title && !byId.contactName) ||
          (contactName && !byId.contactName) ||
          (avatar && !byId.avatar) ||
          (phoneDigits && !byId.phone);
        if (needsPatch) {
          set({
            chats: patchChatInfo(state.chats, chatId, {
              title,
              contactName: contactName || title || undefined,
              avatar,
              phone: phoneDigits,
            }),
          });
        }
        return { chatId, previousChatId: null };
      }

      const byPhone = phoneDigits
        ? state.chats.find((c) => c.phone === phoneDigits)
        : undefined;

      if (byPhone) {
        const previousId = byPhone.chatId;
        set({
          chats: rekeyChat(state.chats, previousId, {
            chatId,
            phone: phoneDigits || byPhone.phone,
            title,
            contactName: contactName || title || undefined,
            avatar,
          }),
          activeChatId:
            state.activeChatId === previousId ? chatId : state.activeChatId,
        });
        return { chatId, previousChatId: previousId };
      }

      return null;
    },
  }),
);
