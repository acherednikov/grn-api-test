import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import React from "react";

import {
  DEFAULT_GREEN_API_URL,
  POLL_INTERVAL_MS,
} from "@/shared/config/constants";
import { useSessionStore } from "@/entities/session/model/sessionStore";
import { useMessageStore } from "@/entities/message/model/messageStore";
import type { MessageNotificationBody } from "@/shared/api/types";

import { useMessagePolling } from "./useMessagePolling";
import type { ReceiveNotificationResponse } from "../api/dto/types";

/* -------------------------------------------------------------------------- */
/*                               Константы теста                              */
/* -------------------------------------------------------------------------- */

/** Значения GREEN-API credentials для `sessionStore` по умолчанию. */
const INSTANCE_ID = "123";
const API_TOKEN = "abc123";

/** Тестовый `chatId` основного чата (формат GREEN-API). */
const CHAT_ID = "79001234567@c.us";

/** Предзаполненные креды для `setupPolling` и переключений. */
const CREDENTIALS = {
  idInstance: INSTANCE_ID,
  apiTokenInstance: API_TOKEN,
  apiUrl: DEFAULT_GREEN_API_URL,
};

/** URL эндпоинта `receiveNotification` — GET, возвращает одну нотификацию или `null`. */
const RECEIVE_URL =
  `/api/green/waInstance${INSTANCE_ID}/receiveNotification/${API_TOKEN}`;

/** Base-URL эндпоинта `deleteNotification` — DELETE с `:receiptId` суффиксом. */
const DELETE_URL_BASE =
  `/api/green/waInstance${INSTANCE_ID}/deleteNotification/${API_TOKEN}`;

/**
 * Глобальный таймаут для `waitFor`. Используется повсеместно — достаточно
 * большого покрывает случайные задержки, но не даёт зависнуть тесту навсегда.
 */
const WAIT_OPTS = { timeout: 5000 };

/* -------------------------------------------------------------------------- */
/*                      Типы и фабрика уведомлений GREEN-API                 */
/* -------------------------------------------------------------------------- */

/**
 * Разновидности `MessageNotificationBody`, которые умеет генерировать
 * фабрика — соответствуют всем веткам фильтрации в `mapNotificationToMessage`.
 */
type NotificationType =
  | "incoming"
  | "outgoing"
  | "outgoingApi"
  | "forwarded"
  | "unknownType"
  | "noChatId"
  | "noText";

/**
 * Счётчик `receiptId` (монотонно растёт на каждый созданный notification).
 * Используется в `makeNotification` и сбрасывается в `resetMswState` между тестами.
 */
let receiptIdSequence = 0;
/** Счётчик `idMessage` в теле уведомления — тоже сбрасывается между тестами. */
let idMessageSequence = 0;

/**
 * Создаёт `MessageNotificationBody` — тело одного уведомления GREEN-API.
 * Для каждого `type` выставляются соответствующие поля (`typeWebhook`,
 * `isForwarded`, пустые обязательные секции и т.д.).
 */
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

/**
 * Фабрика одного receive-ответа GREEN-API: оборачивает body в кортеж
 * `{ receiptId, body }` — формат `ReceiveNotificationResponse`.
 */
const makeNotification = (
  type: NotificationType = "incoming",
  overrides: Partial<MessageNotificationBody> = {},
): ReceiveNotificationResponse => ({
  receiptId: ++receiptIdSequence,
  body: createNotificationBody(type, overrides),
});

/* -------------------------------------------------------------------------- */
/*              MSW: очереди уведомлений и глобальные трекеры вызовов         */
/* -------------------------------------------------------------------------- */

type NotificationQueue = ReceiveNotificationResponse[];

/**
 * Очередь уведомлений, которую «отдаёт» MSW из GET receiveNotification.
 * Изменяется напрямую в тестах для симуляции разных ответов API.
 */
let globalNotificationQueue: NotificationQueue = [];
/** Сколько всего раз вызывался GET receiveNotification. */
let receiveCallCount = 0;
/** `receiptId`'ы, с которыми вызывался DELETE deleteNotification (по порядку). */
let deleteCallReceiptIds: number[] = [];
/** Сколько всего раз вызывался DELETE deleteNotification. */
let deleteCallCount = 0;

/**
 * Сброс всего разделяемого MSW-состояния в дефолтное.
 * Вызывается в `beforeEach` — гарантирует, что тесты не влияют друг на друга.
 */
const resetMswState = () => {
  globalNotificationQueue = [];
  receiveCallCount = 0;
  deleteCallReceiptIds = [];
  deleteCallCount = 0;
  receiptIdSequence = 0;
  idMessageSequence = 0;
};

/**
 * Основной MSW-обработчик: берёт следующую notification из очереди.
 * Если очередь пуста — возвращает `null` (семантика GREEN-API).
 */
const queueHandler = () =>
  http.get(RECEIVE_URL, () => {
    receiveCallCount += 1;
    const next = globalNotificationQueue.shift() ?? null;
    return HttpResponse.json<ReceiveNotificationResponse>(next);
  });

/** Ошибочный GET receiveNotification — HTTP 500, Network error. */
const networkErrorHandler = () =>
  http.get(RECEIVE_URL, () => {
    receiveCallCount += 1;
    return HttpResponse.json({ error: "Network error" }, { status: 500 });
  });

/** Нормальный DELETE — всегда 200, записывает `receiptId` для ассертов. */
const deleteHandler = () =>
  http.delete(`${DELETE_URL_BASE}/:receiptId`, ({ params }) => {
    deleteCallCount += 1;
    const id = Number(params.receiptId);
    if (!Number.isNaN(id)) deleteCallReceiptIds.push(id);
    return HttpResponse.json({});
  });

/** Ошибочный DELETE — HTTP 500. Счётчик всё равно увеличивается (для assert). */
const deleteErrorHandler = () =>
  http.delete(`${DELETE_URL_BASE}/:receiptId`, () => {
    deleteCallCount += 1;
    return HttpResponse.json({ error: "Delete failed" }, { status: 500 });
  });

/** MSW server по умолчанию — очередь + успешный delete. */
const server = setupServer(queueHandler(), deleteHandler());

/* -------------------------------------------------------------------------- */
/*                         Вспомогательные утилиты теста                      */
/* -------------------------------------------------------------------------- */

/**
 * QueryClient с отключёнными retries: нам нужна полная повторяемость
 * (один запрос — один ответ), а retry только растягивает timeout.
 */
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

/** Обёртка для renderHook с QueryClientProvider. */
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

/**
 * Унифицированный setup: проставляем креды → рендерим хук.
 *
 * @param enabled  Аргумент хука `useMessagePolling(enabled)` — позволяет
 *                 сразу стартовать с выключенным polling'ом.
 */
const setupPolling = (enabled: boolean = true) => {
  useSessionStore.setState({ credentials: CREDENTIALS });
  return renderHook(() => useMessagePolling(enabled), { wrapper });
};

/**
 * Список сообщений тестового чата (или пустой массив при отсутствии записей).
 * Берётся напрямую из `messageStore.getState()` — без React-подписки.
 */
const getChatMessages = () =>
  useMessageStore.getState().byChatId[CHAT_ID] ?? [];

/** Ожидает, что `receiveNotification` вызывался хотя бы `times` раз. */
const waitForReceiveCalled = (times: number = 1) =>
  waitFor(
    () => expect(receiveCallCount).toBeGreaterThanOrEqual(times),
    WAIT_OPTS,
  );

/** Ожидает, что в тестовом чате ровно `n` сообщений. */
const waitForMessagesCount = (n: number) =>
  waitFor(() => expect(getChatMessages()).toHaveLength(n), WAIT_OPTS);

/* -------------------------------------------------------------------------- */
/*                                Тест-сьют                                   */
/* -------------------------------------------------------------------------- */

describe("useMessagePolling", () => {
  /**
   * Перед каждым тестом:
   *  • включаем fake-timers (`shouldAdvanceTime: true`, чтобы React-query
   *    microtasks продолжали обрабатываться под fake).
   *  • сбрасываем MSW-состояние (счётчики и очереди).
   *  • стартуем MSW server.
   *  • сбрасываем Zustand-сторы (sessionStore креды, messageStore сообщения).
   */
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    resetMswState();
    server.listen();
    useSessionStore.setState({ credentials: null });
    useMessageStore.setState({ byChatId: {} });
    vi.clearAllMocks();
  });

  /**
   * После каждого теста:
   *  • возвращаем реальные таймеры обратно (важно: иначе следующие `setTimeout`
   *    в Vitest / RHL сломаются).
   *  • сбрасываем dynamic-overrides handlers MSW.
   *  • останавливаем перехват.
   */
  afterEach(() => {
    vi.useRealTimers();
    server.resetHandlers();
    server.close();
  });

  /* ---------------- initialization & basic polling ---------------- */

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

  /* ---------------- successful message handling ---------------- */

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

  /* ---------------- message filtering (skip cases) ---------------- */

  describe("message filtering (skip cases)", () => {
    it("should NOT add outgoingAPIMessageReceived (prevent duplicates)", async () => {
      const notif = makeNotification("outgoingApi");
      globalNotificationQueue = [notif, null];

      setupPolling(true);

      await waitForReceiveCalled(1);

      // Ждём deleteNotification: подтверждает, что очередь обработана
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

      // deleteNotification = 3 (все обработанные, включая skip)
      expect(deleteCallCount).toBe(3);
      expect(deleteCallReceiptIds).toEqual([
        skipped1!.receiptId,
        skipped2!.receiptId,
        valid!.receiptId,
      ]);
    });
  });

  /* ---------------- error handling ---------------- */

  describe("error handling", () => {
    /** Для всех тестов-блоков подставляем 500 на receiveNotification. */
    beforeEach(() => {
      server.use(networkErrorHandler());
    });

    it("should handle network error on receiveNotification gracefully", async () => {
      const { result } = setupPolling(true);

      await waitForReceiveCalled(1);

      // Ошибки polling-а не должны крашить UI: isError остаётся false (просто
      // цикл продолжает крутиться дальше, ретрая на следующем интервале).
      await waitFor(() => {
        expect(result.current.isError).toBe(false);
      }, WAIT_OPTS);

      expect(getChatMessages()).toHaveLength(0);
    });

    it("should not crash and should continue to next poll cycle after network error", async () => {
      // 1) Начинаем с ошибки (networkErrorHandler выставлен выше)
      setupPolling(true);

      await waitForReceiveCalled(1);
      const firstCount = receiveCallCount;

      // 2) Переключаем обработчик обратно на очередь — имитация восстановления
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

      // 3) Продвигаем fake-time на один интервал polling
      await act(async () => {
        vi.advanceTimersByTime(POLL_INTERVAL_MS);
      });

      // 4) Убеждаемся, что цикл продолжился: был новый вызов + сообщение дошло
      await waitFor(
        () => expect(receiveCallCount).toBeGreaterThan(firstCount),
        WAIT_OPTS,
      );
      await waitForMessagesCount(1);

      expect(getChatMessages()[0].text).toBe("After recovery");
    });
  });

  /* ---------------- deleteNotification failure ---------------- */

  describe("deleteNotification failure", () => {
    /** Подменяем delete на 500 перед каждым тестом группы. */
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

      // Событие пришло и в стор положили — даже несмотря на провал удаления
      expect(getChatMessages()[0].text).toBe("Delete failed msg");
      expect(deleteCallCount).toBeGreaterThanOrEqual(1);
    });
  });

  /* ---------------- unmount & cleanup ---------------- */

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

      // Подготовим вторую партию — размонтируем — продвинем время вдвое больше
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

      // Размонтировали → новых сообщений быть не должно
      expect(getChatMessages()).toHaveLength(1);
      expect(getChatMessages()[0].text).toBe("Before unmount");
    });
  });

  /* ---------------- parameter changes & reset ---------------- */

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

      // Количество вызовов не должно расти: polling остановлен
      expect(receiveCallCount).toBe(countAfterStart);
      await waitFor(
        () => expect(result.current.isFetching).toBe(false),
        WAIT_OPTS,
      );
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

      // Подменяем креды на совершенно другой instance — queryKey должен
      // инвалидироваться, polling перезапуститься с новыми параметрами.
      const NEW_INSTANCE_ID = "999";
      const NEW_API_TOKEN = "new-token";
      const NEW_CREDENTIALS = {
        idInstance: NEW_INSTANCE_ID,
        apiTokenInstance: NEW_API_TOKEN,
        apiUrl: DEFAULT_GREEN_API_URL,
      };

      const NEW_RECEIVE_URL =
        `/api/green/waInstance${NEW_INSTANCE_ID}/receiveNotification/${NEW_API_TOKEN}`;
      let newReceiveCalls = 0;
      server.use(
        http.get(NEW_RECEIVE_URL, () => {
          newReceiveCalls += 1;
          return HttpResponse.json(null);
        }),
      );

      act(() => {
        useSessionStore.setState({ credentials: NEW_CREDENTIALS });
      });

      act(() => {
        rerender({ enabled: true });
      });

      // Дождаться, что polling был перезапущен и теперь лупит новый URL
      await waitFor(
        () => expect(newReceiveCalls).toBeGreaterThanOrEqual(1),
        WAIT_OPTS,
      );
    });
  });

  /* ---------------- poll interval scheduling ---------------- */

  describe("poll interval scheduling", () => {
    it("should trigger next receive call after POLL_INTERVAL_MS", async () => {
      globalNotificationQueue = [null, null, null, null];

      setupPolling(true);

      await waitForReceiveCalled(1);
      const countAfterFirst = receiveCallCount;

      // Сдвигаем время на чуть меньше POLL_INTERVAL_MS — вызовов ещё нет
      await act(async () => {
        vi.advanceTimersByTime(POLL_INTERVAL_MS - 100);
      });

      const countBeforeInterval = receiveCallCount;
      expect(countBeforeInterval).toBe(countAfterFirst);

      // Двигаем ещё на 200мс — суммарно на POLL_INTERVAL_MS + 100 — должен
      // сработать следующий тик polling.
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(
        () => expect(receiveCallCount).toBeGreaterThan(countAfterFirst),
        WAIT_OPTS,
      );

      expect(receiveCallCount).toBeGreaterThan(countAfterFirst);
    });
  });

  /* ---------------- store integration ---------------- */

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

    /**
     * Регрессия: когда deleteNotification возвращает OK, а receive —
     * смешанные `incoming` + `outgoing` за раз. Оба типа должны
     * корректно попасть в соответствующие массивы чатов + все
     * `receiptId` быть удалёнными.
     */
    it("mixed incoming+outgoing queue drains correctly with proper directions + deletes", async () => {
      const a = makeNotification("incoming", {
        messageData: {
          typeMessage: "textMessage",
          textMessageData: { textMessage: "A-in" },
        },
      });
      const b = makeNotification("outgoing", {
        messageData: {
          typeMessage: "textMessage",
          textMessageData: { textMessage: "B-out" },
        },
      });
      globalNotificationQueue = [a, b, null];

      setupPolling(true);
      await waitForMessagesCount(2);

      expect(getChatMessages().map((m) => m.direction)).toEqual([
        "incoming",
        "outgoing",
      ]);
      expect(deleteCallReceiptIds).toEqual([a!.receiptId, b!.receiptId]);
    });
  });
});
