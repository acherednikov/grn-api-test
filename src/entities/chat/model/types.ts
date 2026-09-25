export type Chat = {
  id: string;
  chatId: string;
  title: string;
  /** Имя контакта из профиля MAX или контактной книги */
  contactName?: string;
  /** Ссылка на аватар контакта */
  avatar?: string;
  /** Цифры телефона, если чат создан по номеру */
  phone?: string;
  createdAt: number;
};
