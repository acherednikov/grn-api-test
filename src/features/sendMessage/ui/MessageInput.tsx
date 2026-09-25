import { useState, type SubmitEvent } from "react";
import { MAX_MESSAGE_LENGTH } from "@/shared/config/constants";
import { Button, Input } from "@/shared/ui";
import { useSendMessage } from "../model/useSendMessage";

type MessageInputProps = {
  chatId: string | null;
};

export function MessageInput({ chatId }: MessageInputProps) {
  const [text, setText] = useState("");

  const { send, isSending, error } = useSendMessage(chatId);

  const onSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    await send(text);
    setText("");
  };

  const disabled = !chatId || isSending;

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-2 rounded-lg bg-dark-bg p-3 max-xl:mx-3"
    >
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
      <div className="flex gap-2">
        <Input
          className="border-none"
          placeholder={chatId ? "Сообщение…" : "Выберите чат"}
          value={text}
          maxLength={MAX_MESSAGE_LENGTH}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
        />
        <Button type="submit" disabled={disabled || !text.trim()}>
          {isSending ? "Отправка…" : "Отправить"}
        </Button>
      </div>
    </form>
  );
}
