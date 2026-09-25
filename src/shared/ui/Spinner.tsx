import { cn } from "@/shared/lib/cn";

type SpinnerProps = {
  className?: string;
};

export function Spinner({ className }: SpinnerProps) {
  return (
    <span
      className={cn(
        "inline-block size-5 animate-spin rounded-full border-2 border-neutral-200 border-t-[#007AFF]",
        className,
      )}
      aria-hidden
    />
  );
}
