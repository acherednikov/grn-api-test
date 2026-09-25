import { createBrowserRouter, Navigate } from "react-router-dom";
import { AuthPage } from "@/pages/AuthPage";
import { ChatPage } from "@/pages/ChatPage";
import { RequireAuth } from "./RequireAuth";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/chat" replace />,
  },
  {
    path: "/login",
    element: <AuthPage />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: "/chat",
        element: <ChatPage />,
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/chat" replace />,
  },
]);
