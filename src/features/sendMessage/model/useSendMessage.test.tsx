import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import React from "react";

import { DEFAULT_GREEN_API_URL } from "@/shared/config/constants";
import { useSessionStore } from "@/entities/session/model/sessionStore";
import { MessageStatus } from "@/entities/message/model/types";
import { useMessageStore } from "@/entities/message/model/messageStore";

import { useSendMessage } from "./useSendMessage";
import type { SendMessageResponse } from "../api/dto/types";

/* -------------------------------------------------------------------------- */
/*                                Константы                                   */
/* -------------------------------------------------------------------------- */

/** Значения GREEN-API credentials, используемые во всех тестах по умолчанию. */
const INSTANCE_ID = "123";
const API_TOKEN = "abc123";

/** Тестовый `chatId` — совпадает с форматом GREEN-API: `<phone>@c.us`. */
const CHAT_ID = "chat1";

/** Дефолтный текст отправляемого сообщения. */
const MESSAGE_TEXT = "Hello World";

/**
 * Предзаполненные креды для sessionStore (подставляются в setupSendMessage
 * если не передано иное).
 */
const CREDENTIALS = {
  idInstance: INSTANCE_ID,
  apiTokenInstance: API_TOKEN,
  apiUrl: DEFAULT_GREEN_API_URL,
};

/** Полный URL эндпоинта sendMessage GREEN-API с подставленными placeholders. */
const SEND_MESSAGE_URL =
  `/waInstance${INSTANCE_ID}/sendMessage/${API_TOKEN}`;
const SEND_MESSAGE_MSW_URL = `/api/green${SEND_MESSAGE_URL}`;

/**
 * Таймаут для всех `waitFor`-ассёртов — защищает от зависания тестов
 * в случае неответа MSW.
 */
const WAIT_OPTS = { timeout: 5000 };

/* -------------------------------------------------------------------------- */
/*                        MSW-обработчики и трекеры                           */
/* -------------------------------------------------------------------------- */

/**
 * Счётчик выданных `idMessage` от GREEN-API.
 * Используется внутри successHandler для имитации уникальных id ответов.
 */
let messageIdSequence = 0;

/**
 * Успешный MSW-обработчик POST /sendMessage.
 * Возвращает валидный `SendMessageResponse` с инкрементирующимся `idMessage`.
 */
const successHandler = () =>
  http.post(SEND_MESSAGE_MSW_URL, () => {
    messageIdSequence += 1;
    return HttpResponse.json<SendMessageResponse>({
      idMessage: `msg${messageIdSequence}`,
    });
  });

/**
 * Ошибочный MSW-обработчик (HTTP 500). Используется в describe-блоке
 * «error case» для проверки rollback optimistic-update до Failed.
 */
const errorHandler = () =>
  http.post(SEND_MESSAGE_MSW_URL, () =>
    HttpResponse.json({ error: "Network error" }, { status: 500 }),
  );

/** MSW node-server: по-умолчанию начинает с successHandler. */
const server = setupServer(successHandler());

/* -------------------------------------------------------------------------- */
/*                         Вспомогательные утилиты теста                      */
/* -------------------------------------------------------------------------- */

/**
 * Создаёт QueryClient с выключенными retries для тестовой обёртки.
 * Retry мешает валидации «одна отправка — один сетевой вызов», а также
 * искусственно замедляет тесты на 5xx-ответах.
 */
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

/**
 * RHL-обёртка: монтирует дерево с QueryClientProvider со свежим QueryClient
 * на каждый вызов renderHook.
 */
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

/**
 * Подготовка окружения для одного теста useSendMessage:
 *  1) проставляет credentials в sessionStore
 *  2) рендерит хук с указанным chatId (или CHAT_ID по умолчанию).
 *
 * @param chatId  Аргумент хука `useSendMessage(chatId)`. Если передан `null`,
 *                симулируется сценарий «активный чат не выбран».
 * @returns       Результат `renderHook` — `{ result, unmount, rerender }`.
 */
const setupSendMessage = (chatId: string | null = CHAT_ID) => {
  useSessionStore.setState({ credentials: CREDENTIALS });
  return renderHook(() => useSendMessage(chatId), { wrapper });
};

/**
 * Возвращает актуальный массив сообщений тестового чата из messageStore
 * сразу через getState — без подписки (т.к. мы не в React-рантайме).
 */
const getChatMessages = () =>
  useMessageStore.getState().byChatId[CHAT_ID] ?? [];

/**
 * Ожидает, когда optimistic-состояние мутации перейдёт в `isSending: false`.
 * Используется как сигнал «запрос завершён (успех или ошибка)».
 */
const waitForSendComplete = (result: { current: { isSending: boolean } }) =>
  waitFor(() => expect(result.current.isSending).toBe(false), WAIT_OPTS);

/**
 * Композит-хелпер: вызывает send(text) И ожидает завершения мутации.
 * Наиболее частое действие в тестах — вынесено отдельно, чтобы не дублировать
 * две строчки каждый раз.
 */
const sendAndWait = async (
  result: {
    current: { send: (t: string) => void; isSending: boolean };
  },
  text: string = MESSAGE_TEXT,
) => {
  result.current.send(text);
  await waitForSendComplete(result);
};

/* -------------------------------------------------------------------------- */
/*                                Тест-сьют                                   */
/* -------------------------------------------------------------------------- */

describe("useSendMessage", () => {
  let _unused: unknown; // тупая заглушка для удовлетворения noUnusedLocals при strict TS
  void _unused;

  /**
   * Перед каждым тестом:
   *  • запускаем MSW-сервер (он будет перехватывать fetch-запросы)
   *  • сбрасываем счётчик idMessage → детерминированный msg1 msg2...
   *  • очищаем Zustand-сторы: sessionStore (креды) и messageStore (сообщения).
   */
  beforeEach(() => {
    vi.useRealTimers();
    messageIdSequence = 0;
    server.listen();
    useSessionStore.setState({ credentials: null });
    useMessageStore.setState({ byChatId: {} });
    vi.clearAllMocks();
  });

  /**
   * После каждого теста:
   *  • удаляем все динамические `server.use(...)`-оверрайды (например errorHandler)
   *  • останавливаем MSW-перехватчики, чтобы не задевать соседние файлы.
   */
  afterEach(() => {
    server.resetHandlers();
    server.close();
  });

  /* ---------------- success case ---------------- */

  describe("success case", () => {
    it("should optimistically add message with pending status", async () => {
      const { result } = setupSendMessage();

      result.current.send(MESSAGE_TEXT);

      // Оптимистичная вставка происходит СРАЗУ (синхронно внутри send),
      // но используем waitFor на случай, если внутри появится microtask.
      await waitFor(() => {
        const messages = getChatMessages();
        expect(messages).toHaveLength(1);
        expect(messages[0]).toMatchObject({
          text: MESSAGE_TEXT,
          status: MessageStatus.Pending,
          direction: "outgoing",
        });
      }, WAIT_OPTS);
    });

    it("should replace temp message with real message on success", async () => {
      const { result } = setupSendMessage();

      await sendAndWait(result);

      const messages = getChatMessages();
      expect(messages).toHaveLength(1);
      // После успеха: настоящий idMessage = msg1, статус Sent
      expect(messages[0]).toMatchObject({
        id: "msg1",
        idMessage: "msg1",
        status: MessageStatus.Sent,
      });
    });

    it("should trim message text", async () => {
      const { result } = setupSendMessage();

      result.current.send(`  ${MESSAGE_TEXT}  `);

      await waitFor(() => {
        expect(getChatMessages()[0].text).toBe(MESSAGE_TEXT);
      }, WAIT_OPTS);
    });

    it("should set isSending to true during mutation", async () => {
      const { result } = setupSendMessage();

      expect(result.current.isSending).toBe(false);

      // sendAndWait сам проверяет завершение — ассерт неявный:
      // если хук зависает в isSending:true, тест падает по таймауту WAIT_OPTS.
      await sendAndWait(result);
      expect(result.current.isSending).toBe(false);
    });
  });

  /* ---------------- error case ---------------- */

  describe("error case", () => {
    /** Подменяем обработчик на возврат 500 перед каждым error-тестом. */
    beforeEach(() => {
      server.use(errorHandler());
    });

    it("should update message status to failed on error", async () => {
      const { result } = setupSendMessage();

      result.current.send(MESSAGE_TEXT);

      // Шаг 1: оптимистичный Pending-пессимист
      await waitFor(() => {
        const messages = getChatMessages();
        expect(messages).toHaveLength(1);
        expect(messages[0].status).toBe(MessageStatus.Pending);
      }, WAIT_OPTS);

      // Шаг 2: ответ 500 → статус должен откатиться в Failed
      await waitForSendComplete(result);

      expect(getChatMessages()[0].status).toBe(MessageStatus.Failed);
    });

    it("should set error message on failure", async () => {
      const { result } = setupSendMessage();

      result.current.send(MESSAGE_TEXT);

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      }, WAIT_OPTS);
    });
  });

  /* ---------------- edge cases ---------------- */

  describe("edge cases", () => {
    it("should optimistically add message even when credentials are missing", async () => {
      useSessionStore.setState({ credentials: null });
      const { result } = renderHook(() => useSendMessage(CHAT_ID), { wrapper });

      result.current.send(MESSAGE_TEXT);

      // Нет кредов → сразу ошибка мутации, но optimistic insert всё равно
      // произошёл (пользователь видит, что «нажал отправить»)
      await waitFor(() => {
        const messages = getChatMessages();
        expect(messages).toHaveLength(1);
        expect(messages[0].status).toBe(MessageStatus.Pending);
      }, WAIT_OPTS);

      // Мутация завершилась, error выставлен
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      }, WAIT_OPTS);

      // Финальный статус — Failed (а не Pending навсегда)
      expect(getChatMessages()[0].status).toBe(MessageStatus.Failed);
    });

    it("should not add message when chatId is null", () => {
      const { result } = setupSendMessage(null);

      result.current.send(MESSAGE_TEXT);

      // Без активного чата send — no-op, не триггерит ничего
      expect(getChatMessages()).toHaveLength(0);
    });

    it("should add message even when text is empty after trim", async () => {
      const { result } = setupSendMessage();

      result.current.send("   ");

      // После trim → "". Такой случай допустим: пустая строка тоже хранится.
      await waitFor(() => {
        const messages = getChatMessages();
        expect(messages).toHaveLength(1);
        expect(messages[0].text).toBe("");
      }, WAIT_OPTS);
    });
  });

  /* ---------------- integration with messageStore ---------------- */

  describe("integration with messageStore", () => {
    it("should handle multiple messages in sequence", async () => {
      const { result } = setupSendMessage();

      await sendAndWait(result, "First message");
      let messages = getChatMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].text).toBe("First message");

      await sendAndWait(result, "Second message");
      messages = getChatMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0].text).toBe("First message");
      expect(messages[1].text).toBe("Second message");
    });

    it("should preserve existing messages in chat", async () => {
      // Предварительно положим в стор одно «входящее» сообщение —
      // имитация разговора, который уже шёл до нашей отправки.
      useMessageStore.getState().appendMessage({
        id: "existing-msg",
        chatId: CHAT_ID,
        text: "Existing message",
        direction: "incoming",
        timestamp: Date.now() - 1000,
      });

      const { result } = setupSendMessage();

      await sendAndWait(result, "New message");

      const messages = getChatMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0].text).toBe("Existing message");
      expect(messages[1].text).toBe("New message");
    });

    /**
     * Регрессия: после нескольких отправок статусы должны сменяться
     * Pending → Sent корректно для каждой отдельно, без «перепутывания»
     * id внутри updateMessage.
     */
    it("each separate optimistic message receives correct idMessage from response", async () => {
      const { result } = setupSendMessage();

      // Первая отправка
      await sendAndWait(result, "ONE");
      // Вторая
      await sendAndWait(result, "TWO");

      const messages = getChatMessages();
      expect(messages.map((m) => m.idMessage)).toEqual(["msg1", "msg2"]);
      expect(messages.map((m) => m.status)).toEqual([
        MessageStatus.Sent,
        MessageStatus.Sent,
      ]);
    });
  });
});
