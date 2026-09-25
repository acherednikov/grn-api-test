import type { Chat } from "@/entities/chat";
import type { SessionCredentials } from "@/entities/session";
import { phoneToChatId } from "@/shared/lib/formatPhone";

import { checkAccount } from "../api/checkAccount";
import { getContactInfo } from "../api/getContactInfo";
import { AccountNotFoundError } from "./errors";

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Создаёт чат по номеру.
 * Через CheckAccount получает MAX user id (например "105456231"),
 * иначе fallback на формат phone@c.us.
 * После получения chatId подтягивает аватар и имя контакта через GetContactInfo.
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
  let contactName: string | undefined;
  let avatar: string | undefined;

  if (credentials) {
    try {
      const result = await checkAccount(credentials, digits);
      if (result.exist && result.chatId) {
        chatId = result.chatId;
      } else if (result.exist === false) {
        throw new AccountNotFoundError();
      }
    } catch (e) {
      if (e instanceof AccountNotFoundError) {
        throw e;
      }
      // CheckAccount недоступен — оставляем phone@c.us, свяжем позже по уведомлению
    }

    try {
      const info = await getContactInfo(credentials, chatId);
      contactName = info.contactName || info.name || undefined;
      avatar = info.avatar || undefined;
    } catch {
      // GetContactInfo недоступен — оставляем без аватара и имени
    }
  }

  const title = contactName || digits;

  return {
    id: chatId,
    chatId,
    title,
    contactName,
    avatar,
    phone: digits,
    createdAt: Date.now(),
  };
}
