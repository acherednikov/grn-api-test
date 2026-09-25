import type { Chat } from "@/entities/chat";
import type { SessionCredentials } from "@/entities/session";
import { phoneToChatId } from "@/shared/lib/formatPhone";
import { checkAccount } from "../api/checkAccount";

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Создаёт чат по номеру.
 * Через CheckAccount получает MAX user id (например "105456231"),
 * иначе fallback на формат phone@c.us.
 */
export async function createChatFromPhone(
  phone: string,
  credentials: SessionCredentials | null,
): Promise<Chat> {
  const digits = digitsOnly(phone);
  if (!digits) {
    throw new Error("Укажите номер телефона");
  }

  let chatId = phoneToChatId(digits);

  if (credentials) {
    try {
      const result = await checkAccount(credentials, digits);
      if (result.exist && result.chatId) {
        chatId = result.chatId;
      } else if (result.exist === false) {
        throw new Error("Аккаунт MAX на этом номере не найден");
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("не найден")) {
        throw e;
      }
      // CheckAccount недоступен — оставляем phone@c.us, свяжем позже по уведомлению
    }
  }

  return {
    id: chatId,
    chatId,
    title: digits,
    phone: digits,
    createdAt: Date.now(),
  };
}
