import { useEffect, useRef } from "react";

import { useChatStore } from "@/entities/chat";
import {
  mapNotificationToMessage,
  useMessageStore,
} from "@/entities/message";
import { useSessionStore } from "@/entities/session";
import { POLL_INTERVAL_MS } from "@/shared/config/constants";

import { receiveNotification } from "../api/receiveNotification";
import { deleteNotification } from "../api/deleteNotification";

/**
 * Один цикл: receive → map → resolve chat → (rekey if needed) → append → delete
 * (не-text webhook тоже удаляем, чтобы очередь не вставала).
 */
export function useMessagePolling(enabled: boolean) {
  const credentials = useSessionStore((s) => s.credentials);

  const appendMessage = useMessageStore((s) => s.appendMessage);
  const rekeyChatMessages = useMessageStore((s) => s.rekeyChatMessages);

  const resolveChatFromNotification = useChatStore(
    (s) => s.resolveChatFromNotification,
  );

  const ticking = useRef(false);

  useEffect(() => {
    if (!enabled || !credentials) return;

    let cancelled = false;

    const tick = async () => {
      if (cancelled || ticking.current) return;

      ticking.current = true;

      try {
        // 1) Забираем одно уведомление из очереди GREEN-API
        const notification = await receiveNotification(credentials);
        console.log("notification incoming >", notification);
        if (!notification) return;

        // 2) Превращаем его в доменное Message (фильтруем неподдерживаемые типы)
        const mapped = mapNotificationToMessage(notification.body);
        if (mapped) {
          const sender = notification.body.senderData;

          // 3) Связываем уведомление с локальным чатом:
          // - либо находим уже существующий по MAX chatId,
          // - либо переключаем временный чат phone@c.us в настоящий MAX chatId
          // (если CheckAccount раньше не сработал),
          // - либо возвращаем null (новый чат из уведомления не создаём).
          const resolved = resolveChatFromNotification({
            chatId: mapped.chatId,
            title: sender?.chatName || sender?.senderName,
            phone:
              sender?.senderPhoneNumber !== undefined
                ? String(sender.senderPhoneNumber)
                : undefined,
          });

          if (resolved) {
            // 4) Если чат был переключен на новый ключ — переносим накопленные
            // сообщения из старого ключа в новый (в messageStore).
            if (resolved.previousChatId) {
              rekeyChatMessages(resolved.previousChatId, resolved.chatId);
            }
            // 5) Добавляем новое сообщение в уже актуальный чат
            appendMessage({ ...mapped, chatId: resolved.chatId });
          }
        }

        // 6) В любом случае (даже если webhook не текстовый) удаляем уведомление
        // из очереди GREEN-API, чтобы оно не блокировало следующие.
        await deleteNotification(credentials, notification.receiptId);
      } catch {
        /* сеть/API — следующий интервал */
      } finally {
        ticking.current = false;
      }
    };

    const id = window.setInterval(tick, POLL_INTERVAL_MS);
    void tick();

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [
    appendMessage,
    credentials,
    enabled,
    rekeyChatMessages,
    resolveChatFromNotification,
  ]);
}
