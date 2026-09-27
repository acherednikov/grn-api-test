import { createBrowserRouter, Navigate } from "react-router-dom";
import { RequireAuth } from "./RequireAuth";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/chat" replace />,
  },
  {
    path: "/login",
    lazy: async () => {
      const { AuthPage } = await import("@/pages/AuthPage/ui/AuthPage");
      return { Component: AuthPage };
    },
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: "/chat",
        lazy: async () => {
          const { ChatPage } = await import("@/pages/ChatPage/ui/ChatPage");
          return { Component: ChatPage };
        },
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/chat" replace />,
  },
]);
