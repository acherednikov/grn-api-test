import { MessageBubble, useMessageStore, type Message } from "@/entities/message";

const EMPTY_MESSAGES: Message[] = [];

type MessageListProps = {
  chatId: string | null;
  className?: string;
};

export function MessageList({ chatId, className }: MessageListProps) {
  const messages = useMessageStore(
    (s) => (chatId ? s.byChatId[chatId] : undefined) ?? EMPTY_MESSAGES,
  );

  return (
    <div className={className}>
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}
