import { memo } from "react";
import { cn } from "@/shared/lib/cn";

import type { Message } from "../model/types";

type MessageBubbleProps = {
  message: Message;
};

export const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
  const isOutgoing = message.direction === "outgoing";

  return (
    <div
      className={cn(
        "flex w-full",
        isOutgoing ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
          isOutgoing
            ? "rounded-br-md bg-violet-500 text-white"
            : "rounded-bl-md bg-white text-neutral-900 shadow-sm",
        )}
      >
        {message.text}
      </div>
    </div>
  );
});
