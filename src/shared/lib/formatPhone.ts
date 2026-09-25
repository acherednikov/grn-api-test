/** Нормализует ввод и возвращает chatId для личного чата GREEN-API */
export function phoneToChatId(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) {
    throw new Error("Укажите номер телефона");
  }
  return `${digits}@c.us`;
}
