import { useQuery } from "@tanstack/react-query";

import { useChatStore } from "@/entities/chat";
import {
  mapNotificationToMessage,
  useMessageStore,
} from "@/entities/message";
import { useSessionStore } from "@/entities/session";
import { POLL_INTERVAL_MS } from "@/shared/config/constants";
import { ReceiveNotificationResponse } from "@/shared/api/types";

import { deleteNotification } from "../api/deleteNotification";
import { receiveNotification } from "../api/receiveNotification";

export function useMessagePolling(enabled: boolean) {
  const credentials = useSessionStore((s) => s.credentials);

  const appendMessage = useMessageStore((s) => s.appendMessage);
  const rekeyChatMessages = useMessageStore((s) => s.rekeyChatMessages);
  const resolveChatFromNotification = useChatStore(
    (s) => s.resolveChatFromNotification,
  );

  return useQuery({
    queryKey: ["green-api", "notifications", credentials?.idInstance],
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      if (!credentials) return null;

      // Очищаем всю доступную очередь за один цикл (Drain Queue)
      while (!signal.aborted) {
        let notification: ReceiveNotificationResponse = null;

        try {
          // Забираем следующее уведомление из очереди
          notification = await receiveNotification(credentials, { signal });
        } catch (error) {
          // fetch при отмене кидает DOMException с name="AbortError", а не просто
          // выставляет signal.aborted — проверяем явно, чтобы не путать отмену с ошибкой сети.
          if (error instanceof DOMException && error.name === "AbortError") break;

          // Если запрос прерван штатно (размонтирование/отмена) — прерываем цикл
          if (signal.aborted) break;

          // Сетевая ошибка получения уведомления — прерываем этот такт, попробуем на следующем интервале
          break;
        }

        // Очередь пуста — завершаем текущий такт
        if (!notification) break;

        // Обрабатываем уведомление для записи в стор message
        try {
          const mapped = mapNotificationToMessage(notification.body);

          if (mapped) {
            const sender = notification.body.senderData;

            const resolved = resolveChatFromNotification({
              chatId: mapped.chatId,
              title: sender?.chatName || sender?.senderName,
              phone:
                sender?.senderPhoneNumber !== undefined
                  ? String(sender.senderPhoneNumber)
                  : undefined,
            });

            if (resolved) {
              if (resolved.previousChatId) {
                rekeyChatMessages(resolved.previousChatId, resolved.chatId);
              }
              appendMessage({ ...mapped, chatId: resolved.chatId });
            }
          }
        } catch (_error) {
          // Ошибка парсинга или обновления стора
        } finally {
          // Гарантированно удаляем обработанный/пропущенный webhook из очереди
          await deleteNotification(credentials, notification.receiptId);
        }
      }

      return true;
    },
    enabled: enabled && Boolean(credentials),
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false, // Отключает поллинг на неактивной вкладке
    refetchOnWindowFocus: true, // Сразу запрашивает новые сообщения при возврате на вкладку
    retry: false, // Ошибки сети обрабатываются на следующем интервале
    gcTime: 0, // Не хранить закешированный результат в памяти
  });
}
