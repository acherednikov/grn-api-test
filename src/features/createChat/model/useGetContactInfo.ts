import { useMutation } from "@tanstack/react-query";

import { useSessionStore } from "@/entities/session";
import { GetContactInfoResponse } from "@/shared/api/types";

import { getContactInfo } from "../api/getContactInfo";

export function useGetContactInfo() {
  const credentials = useSessionStore((s) => s.credentials);

  return useMutation<GetContactInfoResponse, Error, string>({
    mutationFn: (chatId) => {
      if (!credentials) throw new Error("Отсутствуют данные авторизации");
      return getContactInfo(credentials, chatId);
    },
  });
}
