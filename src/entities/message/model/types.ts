export type MessageDirection = "incoming" | "outgoing";

export type Message = {
  id: string;
  chatId: string;
  text: string;
  direction: MessageDirection;
  timestamp: number;
  idMessage?: string;
};
