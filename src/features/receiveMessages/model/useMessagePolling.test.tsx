import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import React from "react";

import { DEFAULT_GREEN_API_URL, POLL_INTERVAL_MS } from "@/shared/config/constants";
import { useSessionStore } from "@/entities/session/model/sessionStore";
import { useMessageStore } from "@/entities/message/model/messageStore";
import type { MessageNotificationBody } from "@/shared/api/types";

import { useMessagePolling } from "./useMessagePolling";
import type { ReceiveNotificationResponse } from "../api/dto/types";

// Константы

const INSTANCE_ID = "123";
const API_TOKEN = "abc123";
const CHAT_ID = "79001234567@c.us";

const CREDENTIALS = {
  idInstance: INSTANCE_ID,
  apiTokenInstance: API_TOKEN,
  apiUrl: DEFAULT_GREEN_API_URL,
};

const RECEIVE_URL = `/api/green/waInstance${INSTANCE_ID}/receiveNotification/${API_TOKEN}`;
const DELETE_URL_BASE = `/api/green/waInstance${INSTANCE_ID}/deleteNotification/${API_TOKEN}`;

const WAIT_OPTS = { timeout: 5000 };

// Фабрика уведомлений

type NotificationType =
  | "incoming"
  | "outgoing"
  | "outgoingApi"
  | "forwarded"
  | "unknownType"
  | "noChatId"
  | "noText";

let receiptIdSequence = 0;
let idMessageSequence = 0;

const createNotificationBody = (
  type: NotificationType,
  overrides: Partial<MessageNotificationBody> = {},
): MessageNotificationBody => {
  const now = Math.floor(Date.now() / 1000);

  const base: MessageNotificationBody = {
    typeWebhook: "incomingMessageReceived",
    instanceData: {
      idInstance: Number(INSTANCE_ID),
      wid: `${INSTANCE_ID}@s.whatsapp.net`,
      typeInstance: "whatsapp",
    },
    timestamp: now,
    idMessage: `incoming-${++idMessageSequence}`,
    senderData: {
      chatId: CHAT_ID,
      chatType: "personal",
      sender: CHAT_ID,
      senderType: "user",
      senderPhoneNumber: "79001234567",
    },
    messageData: {
      typeMessage: "textMessage",
      textMessageData: { textMessage: "Hello from test" },
    },
  };

  switch (type) {
    case "incoming":
      return { ...base, ...overrides };
    case "outgoing":
      return {
        ...base,
        typeWebhook: "outgoingMessageReceived",
        idMessage: `outgoing-${++idMessageSequence}`,
        ...overrides,
      };
    case "outgoingApi":
      return {
        ...base,
        typeWebhook: "outgoingAPIMessageReceived",
        idMessage: `outgoing-api-${++idMessageSequence}`,
        ...overrides,
      };
    case "forwarded":
      return {
        ...base,
        messageData: {
          ...base.messageData!,
          isForwarded: true,
        },
        ...overrides,
      };
    case "unknownType":
      return {
        ...base,
        typeWebhook: "someUnknownWebhook",
        ...overrides,
      };
    case "noChatId":
      return {
        ...base,
        senderData: {
          ...base.senderData,
          chatId: "",
        },
        ...overrides,
      };
    case "noText":
      return {
        ...base,
        messageData: undefined,
        ...overrides,
      };
    default:
      return { ...base, ...overrides };
  }
};

const makeNotification = (
  type: NotificationType = "incoming",
  overrides: Partial<MessageNotificationBody> = {},
): ReceiveNotificationResponse => ({
  receiptId: ++receiptIdSequence,
  body: createNotificationBody(type, overrides),
});

// MSW: очереди уведомлений и трекеры вызовов

type NotificationQueue = ReceiveNotificationResponse[];

let globalNotificationQueue: NotificationQueue = [];
let receiveCallCount = 0;
let deleteCallReceiptIds: number[] = [];
let deleteCallCount = 0;

const resetMswState = () => {
  globalNotificationQueue = [];
  receiveCallCount = 0;
  deleteCallReceiptIds = [];
  deleteCallCount = 0;
  receiptIdSequence = 0;
  idMessageSequence = 0;
};

const queueHandler = () =>
  http.get(RECEIVE_URL, () => {
    receiveCallCount++;
    const next = globalNotificationQueue.shift() ?? null;
    return HttpResponse.json<ReceiveNotificationResponse>(next);
  });

const networkErrorHandler = () =>
  http.get(RECEIVE_URL, () => {
    receiveCallCount++;
    return HttpResponse.json({ error: "Network error" }, { status: 500 });
  });

const deleteHandler = () =>
  http.delete(`${DELETE_URL_BASE}/:receiptId`, ({ params }) => {
    deleteCallCount++;
    const id = Number(params.receiptId);
    if (!Number.isNaN(id)) deleteCallReceiptIds.push(id);
    return HttpResponse.json({});
  });

const deleteErrorHandler = () =>
  http.delete(`${DELETE_URL_BASE}/:receiptId`, () => {
    deleteCallCount++;
    return HttpResponse.json({ error: "Delete failed" }, { status: 500 });
  });

const server = setupServer(queueHandler(), deleteHandler());

// Хелперы

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

/**
 * Общий setup: ставит credentials в sessionStore и рендерит хук.
 * Возвращает результат renderHook.
 */
const setupPolling = (enabled: boolean = true) => {
  useSessionStore.setState({ credentials: CREDENTIALS });
  return renderHook(() => useMessagePolling(enabled), { wrapper });
};

/** Возвращает список сообщений в тестовом чате. */
const getChatMessages = () =>
  useMessageStore.getState().byChatId[CHAT_ID] ?? [];

/** Ждёт, пока выполнится хотя бы один запрос receiveNotification. */
const waitForReceiveCalled = (times: number = 1) =>
  waitFor(() => expect(receiveCallCount).toBeGreaterThanOrEqual(times), WAIT_OPTS);

/** Ждёт, пока сообщений в чате станет N. */
const waitForMessagesCount = (n: number) =>
  waitFor(() => expect(getChatMessages()).toHaveLength(n), WAIT_OPTS);

// Тесты

describe("useMessagePolling", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    resetMswState();
    server.listen();
    useSessionStore.setState({ credentials: null });
    useMessageStore.setState({ byChatId: {} });
  });

  afterEach(() => {
    vi.useRealTimers();
    server.resetHandlers();
    server.close();
  });

  describe("initialization & basic polling", () => {
    it("should not make requests when enabled is false", async () => {
      setupPolling(false);

      await act(async () => {
        vi.advanceTimersByTime(POLL_INTERVAL_MS * 2);
      });

      expect(receiveCallCount).toBe(0);
      expect(getChatMessages()).toHaveLength(0);
    });

    it("should not make requests when credentials are missing", async () => {
      useSessionStore.setState({ credentials: null });
      renderHook(() => useMessagePolling(true), { wrapper });

      await act(async () => {
        vi.advanceTimersByTime(POLL_INTERVAL_MS * 2);
      });

      expect(receiveCallCount).toBe(0);
      expect(getChatMessages()).toHaveLength(0);
    });

    it("should immediately make first receive call when enabled and credentials present", async () => {
      globalNotificationQueue = [null];

      setupPolling(true);

      await waitForReceiveCalled(1);
      expect(receiveCallCount).toBeGreaterThanOrEqual(1);
    });

    it("should not add any messages when queue is empty (null response)", async () => {
      globalNotificationQueue = [null];

      setupPolling(true);

      await waitForReceiveCalled(1);

      expect(getChatMessages()).toHaveLength(0);
    });
  });

  describe("successful message handling", () => {
    it("should add single incoming message to messageStore", async () => {
      const notif = makeNotification("incoming", {
        messageData: {
          typeMessage: "textMessage",
          textMessageData: { textMessage: "First message" },
        },
      });
      globalNotificationQueue = [notif, null];

      setupPolling(true);

      await waitForMessagesCount(1);

      const msgs = getChatMessages();
      expect(msgs).toHaveLength(1);
      expect(msgs[0]).toMatchObject({
        chatId: CHAT_ID,
        text: "First message",
        direction: "incoming",
      });
      expect(msgs[0].idMessage).toBe(notif!.body.idMessage);
    });

    it("should drain entire queue in one poll cycle (multiple messages)", async () => {
      const n1 = makeNotification("incoming", {
        messageData: {
          typeMessage: "textMessage",
          textMessageData: { textMessage: "Msg 1" },
        },
      });
      const n2 = makeNotification("incoming", {
        messageData: {
          typeMessage: "textMessage",
          textMessageData: { textMessage: "Msg 2" },
        },
      });
      const n3 = makeNotification("incoming", {
        messageData: {
          typeMessage: "textMessage",
          textMessageData: { textMessage: "Msg 3" },
        },
      });
      globalNotificationQueue = [n1, n2, n3, null];

      setupPolling(true);

      await waitForMessagesCount(3);

      const msgs = getChatMessages();
      expect(msgs).toHaveLength(3);
      expect(msgs[0].text).toBe("Msg 1");
      expect(msgs[1].text).toBe("Msg 2");
      expect(msgs[2].text).toBe("Msg 3");
    });

    it("should delete each processed notification from the queue", async () => {
      const n1 = makeNotification("incoming");
      const n2 = makeNotification("incoming");
      globalNotificationQueue = [n1, n2, null];

      setupPolling(true);

      await waitForMessagesCount(2);

      expect(deleteCallCount).toBe(2);
      expect(deleteCallReceiptIds).toContain(n1!.receiptId);
      expect(deleteCallReceiptIds).toContain(n2!.receiptId);
    });

    it("should handle outgoingMessageReceived as outgoing direction", async () => {
      const notif = makeNotification("outgoing", {
        messageData: {
          typeMessage: "textMessage",
          textMessageData: { textMessage: "My sent message" },
        },
      });
      globalNotificationQueue = [notif, null];

      setupPolling(true);

      await waitForMessagesCount(1);

      expect(getChatMessages()[0]).toMatchObject({
        direction: "outgoing",
        text: "My sent message",
      });
    });

    it("should support extendedTextMessageData text field", async () => {
      const notif = makeNotification("incoming", {
        messageData: {
          typeMessage: "extendedTextMessage",
          textMessageData: { textMessage: "" },
          extendedTextMessageData: { text: "Extended text content" },
        },
      });
      globalNotificationQueue = [notif, null];

      setupPolling(true);

      await waitForMessagesCount(1);

      expect(getChatMessages()[0].text).toBe("Extended text content");
    });
  });

  describe("message filtering (skip cases)", () => {
    it("should NOT add outgoingAPIMessageReceived (prevent duplicates)", async () => {
      const notif = makeNotification("outgoingApi");
      globalNotificationQueue = [notif, null];

      setupPolling(true);

      await waitForReceiveCalled(1);

      // Ждём небольшой таймаут, чтобы убедиться, что сообщение не добавилось
      await waitFor(() => expect(deleteCallCount).toBe(1), WAIT_OPTS);

      expect(getChatMessages()).toHaveLength(0);
    });

    it("should NOT add forwarded messages (isForwarded=true)", async () => {
      const notif = makeNotification("forwarded");
      globalNotificationQueue = [notif, null];

      setupPolling(true);

      await waitForReceiveCalled(1);
      await waitFor(() => expect(deleteCallCount).toBe(1), WAIT_OPTS);

      expect(getChatMessages()).toHaveLength(0);
    });

    it("should NOT add messages with unknown typeWebhook", async () => {
      const notif = makeNotification("unknownType");
      globalNotificationQueue = [notif, null];

      setupPolling(true);

      await waitForReceiveCalled(1);
      await waitFor(() => expect(deleteCallCount).toBe(1), WAIT_OPTS);

      expect(getChatMessages()).toHaveLength(0);
    });

    it("should NOT add messages when chatId is empty", async () => {
      const notif = makeNotification("noChatId");
      globalNotificationQueue = [notif, null];

      setupPolling(true);

      await waitForReceiveCalled(1);
      await waitFor(() => expect(deleteCallCount).toBe(1), WAIT_OPTS);

      expect(getChatMessages()).toHaveLength(0);
    });

    it("should NOT add messages when text is missing (no messageData)", async () => {
      const notif = makeNotification("noText");
      globalNotificationQueue = [notif, null];

      setupPolling(true);

      await waitForReceiveCalled(1);
      await waitFor(() => expect(deleteCallCount).toBe(1), WAIT_OPTS);

      expect(getChatMessages()).toHaveLength(0);
    });

    it("should still call deleteNotification even when message was skipped", async () => {
      const skipped1 = makeNotification("unknownType");
      const skipped2 = makeNotification("forwarded");
      const valid = makeNotification("incoming", {
        messageData: {
          typeMessage: "textMessage",
          textMessageData: { textMessage: "Valid msg" },
        },
      });
      globalNotificationQueue = [skipped1, skipped2, valid, null];

      setupPolling(true);

      await waitForMessagesCount(1);

      expect(deleteCallCount).toBe(3);
      expect(deleteCallReceiptIds).toEqual([
        skipped1!.receiptId,
        skipped2!.receiptId,
        valid!.receiptId,
      ]);
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      server.use(networkErrorHandler());
    });

    it("should handle network error on receiveNotification gracefully", async () => {
      const { result } = setupPolling(true);

      await waitForReceiveCalled(1);

      await waitFor(() => {
        expect(result.current.isError).toBe(false);
      }, WAIT_OPTS);

      expect(getChatMessages()).toHaveLength(0);
    });

    it("should not crash and should continue to next poll cycle after network error", async () => {
      // Сначала ошибка, потом восстанавливаем нормальный обработчик
      setupPolling(true);

      await waitForReceiveCalled(1);
      const firstCount = receiveCallCount;

      // Восстанавливаем успешный обработчик
      server.use(queueHandler());
      globalNotificationQueue = [
        makeNotification("incoming", {
          messageData: {
            typeMessage: "textMessage",
            textMessageData: { textMessage: "After recovery" },
          },
        }),
        null,
      ];

      await act(async () => {
        vi.advanceTimersByTime(POLL_INTERVAL_MS);
      });

      await waitFor(() => expect(receiveCallCount).toBeGreaterThan(firstCount), WAIT_OPTS);
      await waitForMessagesCount(1);

      expect(getChatMessages()[0].text).toBe("After recovery");
    });
  });

  describe("deleteNotification failure", () => {
    beforeEach(() => {
      server.use(deleteErrorHandler());
    });

    it("should add message to store even when deleteNotification fails", async () => {
      const notif = makeNotification("incoming", {
        messageData: {
          typeMessage: "textMessage",
          textMessageData: { textMessage: "Delete failed msg" },
        },
      });
      globalNotificationQueue = [notif, null];

      setupPolling(true);

      await waitForMessagesCount(1);

      expect(getChatMessages()[0].text).toBe("Delete failed msg");
      expect(deleteCallCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("unmount & cleanup", () => {
    it("should not process messages after component unmount", async () => {
      const notif1 = makeNotification("incoming", {
        messageData: {
          typeMessage: "textMessage",
          textMessageData: { textMessage: "Before unmount" },
        },
      });
      globalNotificationQueue = [notif1, null];

      const { unmount } = setupPolling(true);

      await waitForMessagesCount(1);
      expect(getChatMessages()).toHaveLength(1);

      // Подготовим вторую партию и размонтируем
      const notif2 = makeNotification("incoming", {
        messageData: {
          typeMessage: "textMessage",
          textMessageData: { textMessage: "After unmount" },
        },
      });
      globalNotificationQueue = [notif2, null];

      act(() => {
        unmount();
      });

      await act(async () => {
        vi.advanceTimersByTime(POLL_INTERVAL_MS * 2);
      });

      expect(getChatMessages()).toHaveLength(1);
      expect(getChatMessages()[0].text).toBe("Before unmount");
    });
  });

  describe("parameter changes & reset", () => {
    it("should stop polling when enabled changes from true to false", async () => {
      globalNotificationQueue = [null];

      const { result, rerender } = renderHook(
        ({ enabled }) => useMessagePolling(enabled),
        {
          wrapper,
          initialProps: { enabled: true },
        },
      );

      act(() => {
        useSessionStore.setState({ credentials: CREDENTIALS });
      });

      await waitForReceiveCalled(1);
      const countAfterStart = receiveCallCount;

      act(() => {
        rerender({ enabled: false });
      });

      globalNotificationQueue = [null, null, null];

      await act(async () => {
        vi.advanceTimersByTime(POLL_INTERVAL_MS * 3);
      });

      expect(receiveCallCount).toBe(countAfterStart);
      await waitFor(() => expect(result.current.isFetching).toBe(false), WAIT_OPTS);
    });

    it("should restart polling when credentials change (new idInstance)", async () => {
      act(() => {
        useSessionStore.setState({ credentials: CREDENTIALS });
      });
      globalNotificationQueue = [null];

      const { rerender } = renderHook(
        ({ enabled }) => useMessagePolling(enabled),
        {
          wrapper,
          initialProps: { enabled: true },
        },
      );

      await waitForReceiveCalled(1);

      const NEW_INSTANCE_ID = "999";
      const NEW_CREDENTIALS = {
        idInstance: NEW_INSTANCE_ID,
        apiTokenInstance: "new-token",
        apiUrl: DEFAULT_GREEN_API_URL,
      };

      const NEW_RECEIVE_URL = `/api/green/waInstance${NEW_INSTANCE_ID}/receiveNotification/new-token`;
      let newReceiveCalls = 0;
      server.use(
        http.get(NEW_RECEIVE_URL, () => {
          newReceiveCalls++;
          return HttpResponse.json(null);
        }),
      );

      act(() => {
        useSessionStore.setState({ credentials: NEW_CREDENTIALS });
      });

      act(() => {
        rerender({ enabled: true });
      });

      await waitFor(() => expect(newReceiveCalls).toBeGreaterThanOrEqual(1), WAIT_OPTS);
    });
  });

  describe("poll interval scheduling", () => {
    it("should trigger next receive call after POLL_INTERVAL_MS", async () => {
      globalNotificationQueue = [null, null, null, null];

      setupPolling(true);

      await waitForReceiveCalled(1);
      const countAfterFirst = receiveCallCount;

      await act(async () => {
        vi.advanceTimersByTime(POLL_INTERVAL_MS - 100);
      });

      const countBeforeInterval = receiveCallCount;
      expect(countBeforeInterval).toBe(countAfterFirst);

      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() =>
        expect(receiveCallCount).toBeGreaterThan(countAfterFirst),
        WAIT_OPTS,
      );

      expect(receiveCallCount).toBeGreaterThan(countAfterFirst);
    });
  });

  describe("store integration", () => {
    it("should preserve existing chat messages when adding new ones", async () => {
      useMessageStore.getState().appendMessage({
        id: "existing-msg",
        chatId: CHAT_ID,
        text: "Existing message",
        direction: "outgoing",
        timestamp: Date.now() - 5000,
      });

      const notif = makeNotification("incoming", {
        messageData: {
          typeMessage: "textMessage",
          textMessageData: { textMessage: "New incoming" },
        },
      });
      globalNotificationQueue = [notif, null];

      setupPolling(true);

      await waitForMessagesCount(2);

      const msgs = getChatMessages();
      expect(msgs).toHaveLength(2);
      expect(msgs[0].text).toBe("Existing message");
      expect(msgs[1].text).toBe("New incoming");
      expect(msgs[1].direction).toBe("incoming");
    });

    it("should append messages to different chats independently", async () => {
      const OTHER_CHAT_ID = "79119876543@c.us";
      const n1 = makeNotification("incoming");
      const n2 = makeNotification("incoming", {
        senderData: {
          chatId: OTHER_CHAT_ID,
          chatType: "personal",
          sender: OTHER_CHAT_ID,
          senderType: "user",
          senderPhoneNumber: "79119876543",
        },
        messageData: {
          typeMessage: "textMessage",
          textMessageData: { textMessage: "Other chat msg" },
        },
      });
      globalNotificationQueue = [n1, n2, null];

      setupPolling(true);

      await waitFor(() => {
        const all = useMessageStore.getState().byChatId;
        expect(Object.keys(all).length).toBe(2);
      }, WAIT_OPTS);

      const store = useMessageStore.getState().byChatId;
      expect(store[CHAT_ID]).toHaveLength(1);
      expect(store[OTHER_CHAT_ID]).toHaveLength(1);
      expect(store[OTHER_CHAT_ID][0].text).toBe("Other chat msg");
    });
  });
});
