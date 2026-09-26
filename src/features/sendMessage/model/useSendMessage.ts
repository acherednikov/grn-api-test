import { useMutation } from "@tanstack/react-query";

import { useSessionStore } from "@/entities/session";
import { MessageStatus, useMessageStore } from "@/entities/message";

import { sendMessage } from "../api/sendMessage";

export function useSendMessage(chatId: string | null) {
  const credentials = useSessionStore((s) => s.credentials);
  const appendMessage = useMessageStore((s) => s.appendMessage);
  const updateMessage = useMessageStore((s) => s.updateMessage);
  const removeMessage = useMessageStore((s) => s.removeMessage);

  const mutation = useMutation({
    mutationFn: async (text: string) => {
      if (!credentials || !chatId) throw new Error("Не удалось отправить сообщение");
      
      return sendMessage(credentials, {
        chatId,
        message: text.trim(),
      });
    },
    onMutate: async (text) => {
      if (!chatId) return;

      const tempId = `temp-${crypto.randomUUID()}`;
      const trimmedText = text.trim();

      // Оптимистичная добавление сообщения с статусом pending
      appendMessage({
        id: tempId,
        chatId,
        text: trimmedText,
        direction: "outgoing",
        timestamp: Date.now(),
        status: MessageStatus.Pending,
      });

      return { tempId };
    },
    onSuccess: (res, text, context) => {
      if (!chatId || !context) return;

      // Удаление временного сообщения и добавление реального
      removeMessage(context.tempId);
      appendMessage({
        id: res.idMessage,
        chatId,
        text: text.trim(),
        direction: "outgoing",
        timestamp: Date.now(),
        idMessage: res.idMessage,
        status: MessageStatus.Sent,
      });
    },
    onError: (_error, _text, context) => {
      if (!context) return;

      updateMessage(context.tempId, { status: MessageStatus.Failed });
    },
  });

  return {
    send: mutation.mutate,
    isSending: mutation.isPending,
    error: mutation.error,
  };
}
