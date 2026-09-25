export class AccountNotFoundError extends Error {
  constructor(message = "Аккаунт MAX на этом номере не найден") {
    super(message);
    this.name = "AccountNotFoundError";
    // Для корректной работы instanceof при транспиляции в ES5
    Object.setPrototypeOf(this, AccountNotFoundError.prototype);
  }
}
