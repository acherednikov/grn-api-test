import { CreateChatForm } from "@/features/createChat";
import { cn } from "@/shared/lib/cn";

import { ChatList } from "./ChatList";
import { LogoutIcon } from "@/shared/ui/icons";
import { Button } from "@/shared/ui";
import { useNavigate } from "react-router-dom";
import { useSessionStore } from "@/entities/session";

export function ChatSidebar({ className }: { className?: string }) {
   const navigate = useNavigate();

   const clearSession = useSessionStore((s) => s.clearSession);
   
  const onLogout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <aside
      className={cn(
        "flex h-full w-72 shrink-0 flex-col bg-dark-bg border-r border-gray-700",
        className,
      )}
    >
      <CreateChatForm />
      <ChatList />
      <Button
        className="self-start my-4 mb-2"
        variant="ghost"
        onClick={onLogout}
      >
        <LogoutIcon />
      </Button>
    </aside>
  );
}
