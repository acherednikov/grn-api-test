import type { Chat } from "@/entities/chat";
import type { SessionCredentials } from "@/entities/session";

import { checkAccount } from "../api/checkAccount";
import { getContactInfo } from "../api/getContactInfo";
import { AccountNotFoundError } from "./errors";

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Создаёт чат по номеру телефона.
 * Через CheckAccount получает MAX chatId (например "105456231"),
 * После получения chatId подтягивает аватар и имя контакта через GetContactInfo.
 */
export async function createChatFromPhone(
  phone: string,
  credentials: SessionCredentials | null,
): Promise<Chat | null> {
  const digits = digitsOnly(phone);
  if (!digits) {
    throw new Error("Укажите номер телефона");
  }

  let chatId: string | undefined;
  let contactName: string | undefined;
  let avatar: string | undefined;

  if (credentials) {
    const result = await checkAccount(credentials, digits);

    if (result.exist && result.chatId) {
      chatId = result.chatId;
    } else {
      throw new AccountNotFoundError();
    }

    try {
      const info = await getContactInfo(credentials, chatId);
      contactName = info.contactName || info.name || undefined;
      avatar = info.avatar || undefined;
    } catch {
      // GetContactInfo недоступен — оставляем без аватара и имени
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

  return null;
}
