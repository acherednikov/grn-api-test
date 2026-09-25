import { useCallback, useState } from "react";

import { useSessionStore } from "@/entities/session";
import { useMessageStore } from "@/entities/message";

import { sendMessage } from "../api/sendMessage";

export function useSendMessage(chatId?: string) {
  const credentials = useSessionStore((s) => s.credentials);
  const appendMessage = useMessageStore((s) => s.appendMessage);

  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (text: string) => {
      if (!credentials || !chatId || !text.trim()) return;

      setIsSending(true);
      setError(null);

      try {
        const res = await sendMessage(credentials, {
          chatId,
          message: text.trim(),
        });

        appendMessage({
          id: res.idMessage,
          chatId,
          text: text.trim(),
          direction: "outgoing",
          timestamp: Date.now(),
          idMessage: res.idMessage,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось отправить");
      } finally {
        setIsSending(false);
      }
    },
    [appendMessage, chatId, credentials],
  );

  return { send, isSending, error };
}
