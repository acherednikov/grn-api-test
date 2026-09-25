import { CreateChatForm } from "@/features/createChat";
import { cn } from "@/shared/lib/cn";

import { ChatList } from "./ChatList";

export function ChatSidebar({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "flex h-full w-72 shrink-0 flex-col bg-dark-bg border-r border-gray-700",
        className,
      )}
    >
      <CreateChatForm />
      <ChatList />
    </aside>
  );
}
