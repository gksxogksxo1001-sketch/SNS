import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  rightElement?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type, rightElement, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5 transition-all">
        {label && (
          <label className="text-sm font-medium text-text-main pl-1">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <input
            type={type}
            ref={ref}
            className={cn(
              "flex h-12 w-full rounded-xl bg-bg-alt px-4 py-2 text-base transition-all placeholder:text-text-sub focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-bg-base border border-transparent focus:border-primary/30",
              error && "border-error focus:border-error focus:ring-error/20",
              rightElement && "pr-12",
              className
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 flex items-center justify-center">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-error mt-1 pl-1 animate-in fade-in slide-in-from-top-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
