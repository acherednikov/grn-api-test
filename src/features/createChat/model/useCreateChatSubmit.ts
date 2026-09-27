import type { UseMutationResult } from "@tanstack/react-query";
import type { SubmitHandler } from "react-hook-form";

import type { Chat } from "@/entities/chat/model/types";
import { useChatStore } from "@/entities/chat/model/chatStore";

import type { CreateChatFormValues } from "./schema";
import type { CheckAccountResponse, GetContactInfoResponse } from "../api/dto/types";

export function useCreateChatSubmit(
  checkAccount: UseMutationResult<CheckAccountResponse, Error, string>,
  getContactInfo: UseMutationResult<GetContactInfoResponse, Error, string>,
) {
  const addChat = useChatStore((s) => s.addChat);

  const onSubmit: SubmitHandler<CreateChatFormValues> = async (values) => {
    const phone = values.phone;

    // Проверяем существование аккаунта
    const account = await checkAccount.mutateAsync(phone);
    const chatId = account.chatId;

    if (chatId) {
      let contactName: string | undefined;
      let avatar: string | undefined;

      // Получаем информацию о контакте
      try {
        const info = await getContactInfo.mutateAsync(chatId);
        contactName = info.contactName || info.name || undefined;
        avatar = info.avatar || undefined;
      } catch {
        // Если GetContactInfo не доступен, продолжаем без имени и аватара
      }

      const title = contactName || phone;

      const chat: Chat = {
        id: chatId,
        title,
        contactName,
        avatar,
        phone,
        createdAt: Date.now(),
      };

      addChat(chat);
    }
  };

  return { onSubmit };
}
