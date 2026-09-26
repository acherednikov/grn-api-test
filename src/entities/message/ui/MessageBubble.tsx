import { memo } from "react";
import { cn } from "@/shared/lib/cn";
import { Spinner } from "@/shared/ui";

import { MessageStatus, type Message } from "../model/types";

type MessageBubbleProps = {
  message: Message;
};

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);

  return date.toLocaleTimeString("ru-RU", { 
    hour: "2-digit", 
    minute: "2-digit",
    hour12: false 
  });
}

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
          "max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words relative pr-9",
          isOutgoing
            ? "rounded-br-md bg-violet-500 text-white"
            : "rounded-bl-md bg-white text-neutral-900 shadow-sm",
        )}
      >
        <div className="flex items-end justify-between gap-2">
          <span className="flex-1">{message.text}</span>
          <div className="absolute bottom-0.75 right-0.75 flex items-center gap-1 text-xs">
            {message.status === MessageStatus.Sent && (
              <span className="text-[11px] opacity-70 shrink-0">
                {formatTime(message.timestamp)}
              </span>
            )}
            {isOutgoing && message.status !== MessageStatus.Sent && (
              <span className="flex items-center">
                {message.status === MessageStatus.Pending && <Spinner className="!size-3" />}
                {message.status === MessageStatus.Failed && "✗"}
              </span>
            )}
          </div>

        </div>
      </div>
    </div>
  );
});
