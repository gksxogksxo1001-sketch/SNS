"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { DEFAULT_AVATAR } from "@/core/constants";
import { cn } from "@/lib/utils";
import { User as UserIcon } from "lucide-react";

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: number | string;
  className?: string;
  priority?: boolean;
}

export const Avatar = ({ 
  src, 
  alt = "User Avatar", 
  size = 40, 
  className,
  priority = false 
}: AvatarProps) => {
  const [imgSrc, setImgSrc] = useState<string>(src || DEFAULT_AVATAR);
  const [hasError, setHasError] = useState(false);

  // Sync with prop changes
  useEffect(() => {
    setImgSrc(src || DEFAULT_AVATAR);
    setHasError(false);
  }, [src]);

  const handleError = () => {
    if (!hasError) {
      setImgSrc(DEFAULT_AVATAR);
      setHasError(true);
    }
  };

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-full flex items-center justify-center bg-bg-alt flex-shrink-0",
        className
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={imgSrc}
        alt={alt}
        className="h-full w-full object-cover"
        onError={handleError}
        loading={priority ? "eager" : "lazy"}
      />
      
      {/* Fallback icon if even default fails or while loading if needed, though img handles it */}
      {hasError && imgSrc === DEFAULT_AVATAR && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-alt">
          <UserIcon size={typeof size === 'number' ? size * 0.5 : 20} className="text-text-sub opacity-50" />
        </div>
      )}
    </div>
  );
};
