import { useMutation } from "@tanstack/react-query";

import { useSessionStore } from "@/entities/session/model/sessionStore";

import { checkAccount } from "../api/checkAccount";
import type { CheckAccountResponse } from "../api/dto/types";

export function useCheckAccount() {
  const credentials = useSessionStore((s) => s.credentials);

  return useMutation<CheckAccountResponse, Error, string>({
    mutationFn: async (phone) => {
      if (!credentials) throw new Error("Отсутствуют данные авторизации");

      const data = await checkAccount(credentials, phone);

      if (!data.exist || !data.chatId) {
        throw new Error("Аккаунт MAX на этом номере не найден");
      }

      return data;
    },
  });
}
