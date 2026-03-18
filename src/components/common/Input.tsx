import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="text-sm font-medium text-text-main">
            {label}
          </label>
        )}
        <input
          type={type}
          ref={ref}
          className={cn(
            "flex h-12 w-full rounded-xl bg-bg-alt px-4 py-2 text-base transition-all placeholder:text-text-sub focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white border border-transparent focus:border-primary/30",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-500 mt-1 pl-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
