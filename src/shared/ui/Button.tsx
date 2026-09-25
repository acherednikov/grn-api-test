import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/shared/lib/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
        variant === "primary" &&
          // "bg-[#007AFF] text-white hover:bg-[#0066DD]",
          "bg-violet-500 text-white hover:bg-violet-600",
        variant === "ghost" &&
          // "bg-transparent text-[#007AFF] hover:bg-black/5",
          "bg-transparent text-violet-500 hover:bg-violet-600 hover:text-white",
        className,
      )}
      {...props}
    />
  );
}
