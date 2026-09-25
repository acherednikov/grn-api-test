import type { ReactNode } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "@/app/routes/router";

type AppProvidersProps = {
  children?: ReactNode;
};

export function AppProviders(_props: AppProvidersProps) {
  return <RouterProvider router={router} />;
}
