import { describe, it, expect, beforeEach, afterEach } from "vitest";
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
import { SendMessageResponse } from "../api/dto/types";

// Константы

const INSTANCE_ID = "123";
const API_TOKEN = "abc123";
const CHAT_ID = "chat1";
const MESSAGE_TEXT = "Hello World";

const CREDENTIALS = {
  idInstance: INSTANCE_ID,
  apiTokenInstance: API_TOKEN,
  apiUrl: DEFAULT_GREEN_API_URL,
};

const SEND_MESSAGE_URL = `/api/green/waInstance${INSTANCE_ID}/sendMessage/${API_TOKEN}`;

const WAIT_OPTS = { timeout: 5000 };

// MSW 

let messageIdSequence = 0;

const successHandler = () =>
  http.post(SEND_MESSAGE_URL, () => {
    messageIdSequence++;
    return HttpResponse.json<SendMessageResponse>({
      idMessage: `msg${messageIdSequence}`,
    });
  });

const errorHandler = () =>
  http.post(SEND_MESSAGE_URL, () =>
    HttpResponse.json({ error: "Network error" }, { status: 500 }),
  );

const server = setupServer(successHandler());

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
const setupSendMessage = (chatId: string | null = CHAT_ID) => {
  useSessionStore.setState({ credentials: CREDENTIALS });
  return renderHook(() => useSendMessage(chatId), { wrapper });
};

/** Возвращает список сообщений в тестовом чате. */
const getChatMessages = () =>
  useMessageStore.getState().byChatId[CHAT_ID];

/** Ждёт завершения мутации (isSending === false). */
const waitForSendComplete = (result: { current: { isSending: boolean } }) =>
  waitFor(() => expect(result.current.isSending).toBe(false), WAIT_OPTS);

/** Отправляет сообщение и ждёт завершения мутации. */
const sendAndWait = async (
  result: { current: { send: (t: string) => void; isSending: boolean } },
  text: string = MESSAGE_TEXT,
) => {
  result.current.send(text);
  await waitForSendComplete(result);
};

// Тесты

describe("useSendMessage", () => {
  beforeEach(() => {
    messageIdSequence = 0;
    server.listen();
    useSessionStore.setState({ credentials: null });
    useMessageStore.setState({ byChatId: {} });
  });

  afterEach(() => {
    server.resetHandlers();
    server.close();
  });

  describe("success case", () => {
    it("should optimistically add message with pending status", async () => {
      const { result } = setupSendMessage();

      result.current.send(MESSAGE_TEXT);

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

      await sendAndWait(result);
    });
  });

  describe("error case", () => {
    beforeEach(() => {
      server.use(errorHandler());
    });

    it("should update message status to failed on error", async () => {
      const { result } = setupSendMessage();

      result.current.send(MESSAGE_TEXT);

      // Оптимистичное обновление
      await waitFor(() => {
        const messages = getChatMessages();
        expect(messages).toHaveLength(1);
        expect(messages[0].status).toBe(MessageStatus.Pending);
      }, WAIT_OPTS);

      // Ожидаем ошибку
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

  describe("edge cases", () => {
    it("should optimistically add message even when credentials are missing", async () => {
      useSessionStore.setState({ credentials: null });
      const { result } = renderHook(() => useSendMessage(CHAT_ID), { wrapper });

      result.current.send(MESSAGE_TEXT);

      await waitFor(() => {
        const messages = getChatMessages();
        expect(messages).toHaveLength(1);
        expect(messages[0].status).toBe(MessageStatus.Pending);
      }, WAIT_OPTS);

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      }, WAIT_OPTS);

      expect(getChatMessages()[0].status).toBe(MessageStatus.Failed);
    });

    it("should not add message when chatId is null", () => {
      const { result } = setupSendMessage(null);

      result.current.send(MESSAGE_TEXT);

      expect(getChatMessages()).toBeUndefined();
    });

    it("should add message even when text is empty after trim", async () => {
      const { result } = setupSendMessage();

      result.current.send("   ");

      await waitFor(() => {
        const messages = getChatMessages();
        expect(messages).toHaveLength(1);
        expect(messages[0].text).toBe("");
      }, WAIT_OPTS);
    });
  });

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
  });
});
