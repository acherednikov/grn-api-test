import { useMutation } from "@tanstack/react-query";

import { useSessionStore } from "@/entities/session/model/sessionStore";

import { getContactInfo } from "../api/getContactInfo";
import type { GetContactInfoResponse } from "../api/dto/types";

export function useGetContactInfo() {
  const credentials = useSessionStore((s) => s.credentials);

  return useMutation<GetContactInfoResponse, Error, string>({
    mutationFn: (chatId) => {
      if (!credentials) throw new Error("Отсутствуют данные авторизации");
      return getContactInfo(credentials, chatId);
    },
  });
}
