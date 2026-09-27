import { useMutation } from "@tanstack/react-query";

import { useSessionStore } from "@/entities/session";
import type { CheckAccountResponse } from "@/shared/api/types";

import { checkAccount } from "../api/checkAccount";

class AccountNotFoundError extends Error {
  constructor(message = "Аккаунт MAX на этом номере не найден") {
    super(message);
    this.name = "AccountNotFoundError";
    Object.setPrototypeOf(this, AccountNotFoundError.prototype);
  }
}

export function useCheckAccount() {
  const credentials = useSessionStore((s) => s.credentials);

  return useMutation<CheckAccountResponse, Error, string>({
    mutationFn: async (phone) => {
      if (!credentials) throw new Error("Отсутствуют данные авторизации");

      const data = await checkAccount(credentials, phone);

      if (!data.exist || !data.chatId) {
        throw new AccountNotFoundError();
      }

      return data;
    },
  });
}
