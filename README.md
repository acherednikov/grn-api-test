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

## Используемые библиотеки

### Основные зависимости
- **React 19**
- **TypeScript 5.7**
- **Vite 6**
  **React Router DOM 7**

### Управление состоянием
- **Zustand 5**
- **TanStack Query 5**

### Формы и валидация
- **React Hook Form 7**
- **Zod 4**
- **@hookform/resolvers**

### Стилизация
- **Tailwind CSS 4**
