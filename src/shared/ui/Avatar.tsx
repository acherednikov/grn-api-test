
import { useState } from "react";

import { cn } from "@/shared/lib/cn";

type AvatarProps = {
  name: string;
  src?: string;
  wrapperClassName?: string;
  imgClassName?: string;
  fallbackClassName?: string;
};

export function Avatar({
  name,
  src,
  wrapperClassName,
  imgClassName = "h-full w-full object-cover",
  fallbackClassName = "text-sm font-medium text-white/80",
}: AvatarProps) {
  const [failed, setFailed] = useState(false);

  const showImage = !!src && !failed;

  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-full bg-gray-800",
        wrapperClassName,
      )}
    >
      {showImage ? (
        <img
          src={src!}
          alt={name}
          className={imgClassName}
          onError={() => setFailed(true)}
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className={fallbackClassName}>
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}
