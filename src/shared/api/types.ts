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

// https://green-api.com/v3/docs/api/receiving/notifications-format/incoming-message/TextMessage/
export type GreenNotificationBody = {
  typeWebhook: string;
  instanceData: {
    idInstance: number;
    wid: string;
    typeInstance: string;
  };
  timestamp: number;
  idMessage: string;
  senderData: {
    chatId: string;
    chatType: string;
    chatName?: string;
    sender: string;
    senderType: string;
    senderName?: string;
    senderContactName?: string;
    senderPhoneNumber: number | string;
  };
  messageData?: {
    typeMessage: string;
    isForwarded?: boolean;
    textMessageData: {
      textMessage: string;
    };
    extendedTextMessageData?: {
      text: string;
    };
  };
};
