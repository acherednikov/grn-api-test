import type { InputHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  wrapperClassName?: string;
};

export function Input({
  className,
  label,
  error,
  id,
  wrapperClassName,
  ...props
}: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label
      className={cn(
        "flex w-full flex-col gap-1 text-sm",
        wrapperClassName,
      )}
    >
      {label ? <span className="text-white">{label}</span> : null}
      <input
        id={inputId}
        className={cn(
          "rounded-lg border border-neutral-700 bg-dark-bg px-3 py-2 text-white outline-none focus:border-violet-500",
          error && "border-red-400",
          className,
        )}
        {...props}
      />
      {error ? <span className="text-xs text-red-500">{error}</span> : null}
    </label>
  );
}
