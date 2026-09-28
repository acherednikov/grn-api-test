import { describe, it, expect, beforeEach, vi } from "vitest";
import { MessageStatus, type Message } from "./types";
import { useMessageStore } from "./messageStore";

/* -------------------------------------------------------------------------- */
/*                     Типы и фабрика тестовых сообщений                     */
/* -------------------------------------------------------------------------- */

type MakeMessageInput = {
  id: string;
  chatId?: string;
  text?: string;
  direction?: Message["direction"];
  timestamp?: number;
  status?: MessageStatus;
  idMessage?: string;
};

/**
 * Фабрика доменных сообщений для тестов.
 * Подставляет валидные дефолты для всех необязательных полей.
 */
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

/* -------------------------------------------------------------------------- */
/*                          Хелперы для работы со стором                      */
/* -------------------------------------------------------------------------- */

type Store = typeof useMessageStore;

/** Текущее неизменённое состояние стора. */
const state = (store: Store) => store.getState();
const append = (store: Store, message: Message) =>
  state(store).appendMessage(message);
const appendAll = (store: Store, ...messages: Message[]) =>
  messages.forEach((m) => append(store, m));
const update = (store: Store, id: string, updates: Partial<Message>) =>
  state(store).updateMessage(id, updates);
const remove = (store: Store, id: string) =>
  state(store).removeMessage(id);

/** Возвращает список сообщений в чате или пустой массив, если чата нет. */
const messagesIn = (store: Store, chatId: string = CHAT_1): Message[] =>
  state(store).byChatId[chatId] ?? [];

/** Проверяет `id` сообщений в чате с учётом порядка. */
const expectMessageIds = (
  store: Store,
  ids: string[],
  chatId: string = CHAT_1,
) => {
  expect(messagesIn(store, chatId).map((m) => m.id)).toEqual(ids);
};

/* -------------------------------------------------------------------------- */
/*                                Тест-сьют                                   */
/* -------------------------------------------------------------------------- */

describe("messageStore", () => {
  let store: Store;

  /**
   * Перед каждым тестом:
   *  1. Берём реальный singleton-стор `useMessageStore`.
   *  2. Сбрасываем данные — перезаписываем `byChatId` пустым словарём
   *     (partial-update API Zustand). Actions (`appendMessage` и т.п.)
   *     не меняются между тестами, поэтому полный `replace: true` не нужен.
   *  3. Очищаем все Vitest-mocks, чтобы шпионы из соседних it-блоков
   *     не влияли на текущий тест.
   */
  beforeEach(() => {
    store = useMessageStore;
    store.setState({ byChatId: {} });
    vi.clearAllMocks();
  });

  /* ---------------- appendMessage ---------------- */

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

    /* --- Ссылочная стабильность при дедупе --- */
    it("should keep stable reference when message already exists (no rerender)", () => {
      const message = makeMessage({ id: "msg1" });
      append(store, message);
      const prevByChatId = state(store).byChatId;

      append(store, { ...message, text: "trying duplicate" });

      expect(state(store).byChatId).toBe(prevByChatId);
    });
  });

  /* ---------------- updateMessage ---------------- */

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

    it("should update message found by idMessage (consistency with append)", () => {
      append(
        store,
        makeMessage({
          id: "internal-id-1",
          idMessage: "external-9000",
          text: "original",
        }),
      );

      update(store, "external-9000", {
        text: "found via idMessage",
        status: MessageStatus.Sent,
      });

      const [msg] = messagesIn(store);
      expect(msg.id).toBe("internal-id-1");
      expect(msg.idMessage).toBe("external-9000");
      expect(msg.text).toBe("found via idMessage");
      expect(msg.status).toBe(MessageStatus.Sent);
    });

    it("should be no-op when updates object is empty", () => {
      append(store, makeMessage({ id: "msg1", text: "Hello" }));
      const prevByChatId = state(store).byChatId;

      update(store, "msg1", {});

      expect(state(store).byChatId).toBe(prevByChatId);
    });

    it("should be no-op when update values equal current (same data)", () => {
      append(
        store,
        makeMessage({
          id: "msg1",
          text: "Hello",
          status: MessageStatus.Sent,
        }),
      );
      const prevByChatId = state(store).byChatId;

      update(store, "msg1", { text: "Hello", status: MessageStatus.Sent });

      expect(state(store).byChatId).toBe(prevByChatId);
    });

    it("should be no-op (stable reference) when message id not found", () => {
      append(store, makeMessage({ id: "msg1" }));
      const prevByChatId = state(store).byChatId;

      update(store, "ghost-id", { text: "nothing" });

      expect(state(store).byChatId).toBe(prevByChatId);
    });
  });

  /* ---------------- removeMessage ---------------- */

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

    /* --- Remove по idMessage и ссылочная стабильность --- */

    it("should remove message found by idMessage", () => {
      append(
        store,
        makeMessage({
          id: "internal-id-99",
          idMessage: "ext-del-42",
          text: "to remove",
        }),
      );
      expect(messagesIn(store)).toHaveLength(1);

      remove(store, "ext-del-42");

      expect(messagesIn(store)).toHaveLength(0);
    });

    it("should be no-op (stable reference) when removing non-existent id", () => {
      append(store, makeMessage({ id: "msg1" }));
      const prevByChatId = state(store).byChatId;

      remove(store, "i-do-not-exist");

      expect(state(store).byChatId).toBe(prevByChatId);
    });
  });

  /* ---------------- integration tests ---------------- */

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

      appendAll(store, chat1Msg1, chat2Msg1, chat1Msg2);

      expect(messagesIn(store, CHAT_1)).toHaveLength(2);
      expect(messagesIn(store, CHAT_2)).toHaveLength(1);

      update(store, "msg1", { text: "Updated" });
      expect(messagesIn(store, CHAT_1)[0].text).toBe("Updated");
      expect(messagesIn(store, CHAT_2)[0].text).toBe("Hello from chat2");

      remove(store, "msg3");
      expect(messagesIn(store, CHAT_1)).toHaveLength(2);
      expect(messagesIn(store, CHAT_2)).toHaveLength(0);
    });

    /**
     * Регрессионный кейс: сценарий, когда статус входящего API-сообщения
     * обновляется по его внешнему `idMessage`, а удаление по «внутреннему»
     * `id`, назначенному на фронте. Оба способа должны работать в связке.
     */
    it("mixed id / idMessage operations on the same message", () => {
      const msg = makeMessage({
        id: "local-abcd",
        idMessage: "green-123",
        text: "outgoing ping",
        status: MessageStatus.Pending,
      });
      append(store, msg);

      // 1) Обновляем через idMessage (симуляция подтверждения от API)
      update(store, "green-123", { status: MessageStatus.Sent });
      expect(state(store).byChatId[CHAT_1][0].status).toBe(MessageStatus.Sent);

      // 2) Удаляем через внутренний id
      remove(store, "local-abcd");
      expect(messagesIn(store)).toHaveLength(0);
    });
  });
});
