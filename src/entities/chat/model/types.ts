export type Chat = {
  id: string;
  chatId: string;
  title: string;
  /** Цифры телефона, если чат создан по номеру */
  phone?: string;
  createdAt: number;
};
