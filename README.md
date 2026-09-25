# GREEN-API Chat (тестовое задание)

React + Vite + TypeScript, архитектура FSD light.

## Запуск

```bash
npm install
npm run dev
```

## Структура `src/`

- `app/` — провайдеры, роутинг, глобальные стили
- `pages/` — экраны Auth и Chat
- `widgets/` — ChatSidebar, MessagePanel
- `features/` — auth, createChat, sendMessage, receiveMessages
- `entities/` — session, chat, message
- `shared/` — GREEN-API client, UI-kit, утилиты

В dev запросы к GREEN-API проксируются через `/api/green` (см. `vite.config.ts`).
