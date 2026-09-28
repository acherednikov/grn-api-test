/**
 * @file messageStore.ts
 * @description Zustand-хранилище (store) для управления коллекцией сообщений,
 *              сгруппированных по идентификатору чата (`chatId`).
 *
 *              Предоставляет три публичных операции над состоянием:
 *                • appendMessage — добавить сообщение (с дедупликацией и сортировкой);
 *                • updateMessage — обновить поля существующего сообщения;
 *                • removeMessage — удалить сообщение из коллекции.
 *
 *              Внутреннее представление состояния: `{ byChatId: Record<string, Message[]> }`,
 *              где массив сообщений каждого чата всегда отсортирован по `timestamp`
 *              по возрастанию (хронологический порядок).
 *
 *              Особенности реализации:
 *                • иммутабельное обновление только изменённых веток дерева состояния
 *                  (для корректной работы shallow-compare подписчиков Zustand);
 *                • ранний возврат исходного `state`, если операция не привела к
 *                  видимым изменениям — предотвращает каскад лишних ререндеров;
 *                • дедупликация при добавлении одновременно по внутреннему `id`
 *                  и по внешнему `idMessage` (из GREEN-API);
 *                • поиск при обновлении/удалении также выполняется по обоим
 *                  идентификаторам — см. {@link findMessageIndexPair}.
 *
 * @see Message       — доменная модель сообщения (./types.ts).
 * @see MessageState  — тип-схема хранилища (определён ниже).
 */

import { create } from "zustand";

import type { Message } from "./types";

/* -------------------------------------------------------------------------- */
/*                               Типы и схема стора                          */
/* -------------------------------------------------------------------------- */

/**
 * Схема Zustand-хранилища сообщений.
 *
 * @property byChatId        Нормализованная коллекция сообщений: ключ = `chatId`,
 *                           значение = массив сообщений чата (отсортирован по timestamp).
 * @property appendMessage   Добавить сообщение в соответствующий чат.
 * @property updateMessage   Частично обновить найденное по id сообщение.
 * @property removeMessage   Безвозвратно удалить сообщение из любого чата.
 */
type MessageState = {
  byChatId: Record<string, Message[]>;
  appendMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  removeMessage: (messageId: string) => void;
};

/* -------------------------------------------------------------------------- */
/*                               Внутренние хелперы                          */
/* -------------------------------------------------------------------------- */

/**
 * Сортирует копию массива сообщений по `timestamp` по возрастанию.
 *
 * @param messages  Входной массив (не мутируется).
 * @returns         Новый отсортированный массив.
 */
function sortMessages(messages: Message[]): Message[] {
  return [...messages].sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Результат поиска сообщения в нормализованной структуре `byChatId`.
 *
 * @property chatId  Идентификатор чата, в котором обнаружено сообщение.
 * @property index   Индекс сообщения в массиве `byChatId[chatId]` (≥ 0).
 */
type MessageLocation = { chatId: string; index: number };

/**
 * Ищет позицию сообщения в коллекции по внутреннему `id` ИЛИ по внешнему
 * `idMessage` (согласно той же логике дедупликации, что и в `appendMessage`).
 *
 * @param byChatId   Коллекция чатов, в которой выполняется поиск.
 * @param messageId  Искомый идентификатор: сравнивается с `Message.id` и,
 *                   если у сообщения заполнено `idMessage`, — с ним тоже.
 * @returns          Объект `{ chatId, index }` либо `null`, если ничего не найдено.
 *
 * @example
 *   const loc = findMessageLocation(state.byChatId, "msg-42");
 *   if (loc) state.byChatId[loc.chatId][loc.index]; // ← найденное сообщение
 */
function findMessageLocation(
  byChatId: Record<string, Message[]>,
  messageId: string,
): MessageLocation | null {
  for (const chatId in byChatId) {
    const list = byChatId[chatId];
    // Внутренний индекс всегда ищем; idMessage — только когда у конкретного
    // сообщения поле заполнено (сравнение с undefined заведомо ложно).
    const index = list.findIndex(
      (m) => m.id === messageId || (m.idMessage && m.idMessage === messageId),
    );
    if (index !== -1) {
      return { chatId, index };
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*                                Экспортируемый стор                         */
/* -------------------------------------------------------------------------- */

/**
 * Глобальный Zustand-хук для работы с хранилищем сообщений.
 * Использование в компонентах:
 * ```
 *   const byChatId = useMessageStore(s => s.byChatId);
 *   const append   = useMessageStore(s => s.appendMessage);
 * ```
 */
export const useMessageStore = create<MessageState>((set) => ({
  /* --------------- Начальное состояние --------------- */

  /** Пустая коллекция: ни одного чата и сообщения при инициализации. */
  byChatId: {},

  /* ---------------- appendMessage ---------------- */

  /**
   * Добавить сообщение в конец (или сортированную позицию) чата.
   *
   * Поведение:
   *  1. Если в чате уже есть сообщение с таким же `id` ИЛИ `idMessage` —
   *     состояние не изменяется (отсутствует лишний re-render).
   *  2. Если `timestamp` добавляемого сообщения ≥ последнего в списке —
   *     выполняется дешёвый `O(1)`-append без полной сортировки (горячий путь).
   *  3. В противном случае выполняется полная сортировка O(n·log n) —
   *     необходимо для «запоздалых» вебхуков / повторов / восстановления истории.
   *
   * @param message  Валидный доменный объект сообщения с обязательными `chatId`,
   *                 `id`, `timestamp`.
   */
  appendMessage: (message) => {
    set((state) => {
      const list = state.byChatId[message.chatId] ?? [];

      // Дедуп: сообщение уже есть в списке → выходим без изменений.
      // Возвращаем исходную ссылку `state`, чтобы подписчики не ререндерились.
      const exists = list.some(
        (m) =>
          m.id === message.id ||
          (message.idMessage && m.idMessage === message.idMessage),
      );
      if (exists) return state;

      let nextList: Message[];
      // Горячий путь: типичный сценарий — новое сообщение приходит последним.
      // Избегаем полной сортировки — достаточно spread-append.
      if (list.length === 0 || message.timestamp >= list[list.length - 1].timestamp) {
        nextList = [...list, message];
      } else {
        // Холодный путь: сообщение «из прошлого» — сортируем всю коллекцию.
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

  /* ---------------- updateMessage ---------------- */

  /**
   * Частично обновить поля найденного сообщения.
   *
   * Поиск выполняется по внутреннему `id` ИЛИ по внешнему `idMessage`
   * (см. {@link findMessageLocation}).
   *
   * Оптимизации:
   *  • Если передан пустой объект `updates` — сразу возвращаем `state`.
   *  • Если сообщение не найдено — возвращаем `state` (нет лишней копии).
   *  • Пересоздаётся **только** массив того чата, в котором лежит сообщение;
   *    остальные `byChatId[chatId]` сохраняют исходные ссылки → подписчики,
   *    выбирающие сообщения других чатов, не триггерятся.
   *
   * @param messageId  Идентификатор (`id` или `idMessage`) целевого сообщения.
   * @param updates    Объект с полями, которые требуется перезаписать.
   *                   Может быть частичным; неуказанные поля остаются как есть.
   */
  updateMessage: (messageId, updates) => {
    set((state) => {
      // Guard: обновлять нечем — выходим без каких-либо аллокаций.
      if (Object.keys(updates).length === 0) return state;

      const location = findMessageLocation(state.byChatId, messageId);
      if (!location) return state; // Сообщение не найдено → нет изменений.

      const { chatId, index } = location;
      const list = state.byChatId[chatId];
      const target = list[index];

      // Дополнительная проверка: если после мерджа поля не изменились —
      // можно избежать аллокации нового массива. На практике сравнение
      // глубокое не делаем (дороже пользы); поверхностная проверка на
      // идентичность всех обновляемых полей — дешёвая и эффективная.
      const hasAnyChange = Object.entries(updates).some(
        ([key, value]) => target[key as keyof Message] !== value,
      );
      if (!hasAnyChange) return state;

      // Иммутабельно собираем новый массив: [до] + обновлённый элемент + [после].
      // slice для префикса/суффикса — самый производительный вариант в JS.
      const updatedMessage: Message = { ...target, ...updates };
      const updatedChatList = [
        ...list.slice(0, index),
        updatedMessage,
        ...list.slice(index + 1),
      ];

      return {
        byChatId: {
          ...state.byChatId,
          [chatId]: updatedChatList,
        },
      };
    });
  },

  /* ---------------- removeMessage ---------------- */

  /**
   * Удалить сообщение из хранилища по его `id` или `idMessage`.
   *
   * Как и `updateMessage`, использует {@link findMessageLocation} — поиск по
   * обоим идентификаторам. Если сообщение не найдено → состояние не меняется.
   *
   * Пересоздаётся только массив затронутого чата; все остальные ссылки
   * в `byChatId` остаются неизменными (важно для селекторов Zustand).
   *
   * @param messageId  `id` или `idMessage` сообщения, подлежащего удалению.
   */
  removeMessage: (messageId) => {
    set((state) => {
      const location = findMessageLocation(state.byChatId, messageId);
      if (!location) return state; // Нет цели — нет изменений.

      const { chatId, index } = location;
      const list = state.byChatId[chatId];

      // `filter` создаёт ровно один новый массив; для коротких списков
      // сопоставим по скорости с `slice(0,n) + slice(n+1)`, но читается лучше.
      // Для очень больших списков (>10k) предпочтительнее slice-вариант,
      // однако в домене чатов такие объёмы не встречаются.
      const updatedChatList = list.filter((_, i) => i !== index);

      return {
        byChatId: {
          ...state.byChatId,
          [chatId]: updatedChatList,
        },
      };
    });
  },
}));
