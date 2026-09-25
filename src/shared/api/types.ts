/** Сырые DTO GREEN-API (упрощённо; расширить при реализации) */

export type GreenApiCredentials = {
  idInstance: string;
  apiTokenInstance: string;
  apiUrl: string;
};

export type SendMessageRequest = {
  chatId: string;
  message: string;
};

export type SendMessageResponse = {
  idMessage: string;
};

export type ReceiveNotificationResponse = {
  receiptId: number;
  body: GreenNotificationBody;
} | null;

export type GreenNotificationBody = {
  typeWebhook: string;
  instanceData?: {
    idInstance: number;
    wid: string;
    typeInstance: string;
  };
  timestamp?: number;
  idMessage?: string;
  senderData?: {
    chatId: string;
    chatName?: string;
    chatType?: string;
    sender: string;
    senderName?: string;
    senderType?: string;
    senderContactName?: string;
    senderPhoneNumber?: number | string;
  };
  messageData?: {
    typeMessage: string;
    isForwarded?: boolean;
    textMessageData?: {
      textMessage: string;
    };
    extendedTextMessageData?: {
      text: string;
    };
  };
};
