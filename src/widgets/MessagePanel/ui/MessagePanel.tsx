import { useChatStore } from "@/entities/chat";
import { MessageInput } from "@/features/sendMessage";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui";
import { MessageList } from "./MessageList";

export function MessagePanel({ className }: { className?: string }) {
  const activeChatId = useChatStore((s) => s.activeChatId);
  const activeChatTitle = useChatStore((s) =>
    s.activeChatId
      ? s.chats.find((c) => c.chatId === s.activeChatId)?.title ?? ""
      : "",
  );
  const clearActiveChat = useChatStore((s) => s.clearActiveChat);

  return (
    <main
      className={cn(
        "flex min-w-0 flex-1 flex-col pb-3 bg-gray-600",
        className,
      )}
    >
      {activeChatId && (
        <div className="flex items-center gap-3 bg-dark-bg px-4 py-3">
          <Button
            variant="ghost"
            className="h-8 w-8 rounded-full p-0 text-lg"
            onClick={clearActiveChat}
            aria-label="Закрыть чат"
          >
            ←
          </Button>
          <h2 className="text-sm font-semibold text-white">
            {activeChatTitle}
          </h2>
        </div>
      )}
      <MessageList
        chatId={activeChatId ?? undefined}
        className="mx-auto flex w-full md:max-w-[700px] flex-1 flex-col gap-2 overflow-y-auto p-4"
      />
      <div className="mx-auto w-full md:max-w-[700px]">
        <MessageInput chatId={activeChatId ?? undefined} />
      </div>
    </main>
  );
}
