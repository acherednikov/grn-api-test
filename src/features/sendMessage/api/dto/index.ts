export type SendMessageRequest = {
  chatId: string;
  message: string;
};

// https://green-api.com/v3/docs/api/sending/SendMessage/
export type SendMessageResponse = {
  idMessage: string;
};
