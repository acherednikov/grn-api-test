import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/shared/lib/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm cursor-pointer transition-colors disabled:opacity-50",
        variant === "primary" &&
          "bg-violet-500 text-white hover:bg-violet-600",
        variant === "ghost" &&
          "bg-transparent text-violet-500 hover:text-white",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
