import type { GreenNotificationBody } from "@/shared/api/types";
import type { Message, MessageDirection } from "./types";

const WEBHOOK_DIRECTION: Record<string, MessageDirection> = {
  incomingMessageReceived: "incoming",
  outgoingMessageReceived: "outgoing",
  outgoingAPIMessageReceived: "outgoing",
};

function extractText(body: GreenNotificationBody): string | undefined {
  const data = body.messageData;
  if (!data) return undefined;

  if (data.typeMessage === "textMessage") {
    return data.textMessageData?.textMessage;
  }

  if (data.typeMessage === "extendedTextMessage") {
    return data.extendedTextMessageData?.text;
  }

  return (
    data.textMessageData?.textMessage ?? data.extendedTextMessageData?.text
  );
}

/* Преобразует webhook GREEN-API в доменное Message или null */
export function mapNotificationToMessage(
  body: GreenNotificationBody,
): Message | null {
  const direction = WEBHOOK_DIRECTION[body.typeWebhook];

  if (!direction) {
    return null;
  }

  // Собственные отправки через API уже добавляем в sendMessage — не дублируем
  if (body.typeWebhook === "outgoingAPIMessageReceived") {
    return null;
  }

  // Игнорируем пересланные сообщения
  if (body.messageData?.isForwarded) {
    return null;
  }

  const chatId = body.senderData?.chatId;
  const text = extractText(body);

  if (!chatId || text === undefined) {
    return null;
  }

  const timestampSec = body.timestamp ?? Math.floor(Date.now() / 1000);

  return {
    id: body.idMessage ?? `${timestampSec}`,
    chatId,
    text,
    direction,
    timestamp: timestampSec * 1000,
    idMessage: body.idMessage,
  };
}
