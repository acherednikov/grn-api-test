import type { Message } from "@/entities/message/model/types";
import { useMessageStore } from "@/entities/message/model/messageStore";
import { MessageBubble } from "@/entities/message/ui/MessageBubble";

const EMPTY_MESSAGES: Message[] = [];

type MessageListProps = {
  chatId: string | null;
  className?: string;
};

export function MessageList({ chatId, className }: MessageListProps) {
  const messages = useMessageStore(
    (s) => chatId ? (s.byChatId[chatId] ?? EMPTY_MESSAGES) : EMPTY_MESSAGES,
  );

  return (
    <div className={className}>
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}
