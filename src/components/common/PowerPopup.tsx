"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PowerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  contentClassName?: string;
}

export const PowerPopup: React.FC<PowerPopupProps> = ({
  isOpen,
  onClose,
  title,
  children,
  icon,
  contentClassName
}) => {
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      document.body.style.overflow = "hidden";
    } else {
      const timer = setTimeout(() => {
        setIsRendered(false);
        document.body.style.overflow = "auto";
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isRendered && !isOpen) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300 ease-out",
        isOpen ? "bg-black/40 backdrop-blur-sm" : "bg-transparent backdrop-blur-0 pointer-events-none"
      )}
      onClick={onClose}
    >
      <div 
        className={cn(
          "relative w-full sm:max-w-xl bg-bg-base/90 backdrop-blur-xl rounded-t-[40px] sm:rounded-[40px] shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] border border-border-base transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
          isOpen ? "translate-y-0 opacity-100 scale-100" : "translate-y-full sm:translate-y-10 opacity-0 sm:scale-95"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Indicator for Mobile */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1 bg-border-base rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-border-base">
          <div className="flex items-center space-x-3">
            {icon && <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">{icon}</div>}
            <h3 className="text-[20px] font-black tracking-tight text-text-main">{title}</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 bg-bg-alt hover:bg-bg-base rounded-full transition-all group active:scale-90"
          >
            <X size={20} className="text-text-sub group-hover:text-text-main" />
          </button>
        </div>

        {/* Content */}
        <div className={cn("flex-1 overflow-y-auto scrollbar-hide", contentClassName || "px-6 py-6")}>
          {children}
        </div>
      </div>
    </div>
  );
};
