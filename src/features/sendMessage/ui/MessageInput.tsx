import { useState, type SubmitEvent } from "react";

import { MAX_MESSAGE_LENGTH } from "@/shared/config/constants";
import { Button, Input } from "@/shared/ui";
import { SendIcon } from "@/shared/ui/icons";

import { useSendMessage } from "../model/useSendMessage";

type MessageInputProps = {
  chatId: string | null;
};

export function MessageInput({ chatId }: MessageInputProps) {
  const [text, setText] = useState("");

  const { send, error } = useSendMessage(chatId);

  const onSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    send(text);
    setText("");
  };

  const disabled = !chatId;

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-2 rounded-lg bg-dark-bg p-3 max-xl:mx-3"
    >
      {!!error ? <p className="text-xs text-red-500">{error.message}</p> : null}
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
          <SendIcon />
        </Button>
      </div>
    </form>
  );
}
