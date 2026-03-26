"use client";

import React from "react";
import { Info, AlertCircle, CheckCircle2 } from "lucide-react";

interface EfficiencyBadgeProps {
  type: "high" | "medium" | "low" | "info"; // Updated type to match new styles
  message: string;
}

export const EfficiencyBadge: React.FC<EfficiencyBadgeProps> = ({ type, message }) => {
  const styles = {
    high: "bg-success/10 text-success border-success/20",
    medium: "bg-secondary/10 text-secondary border-secondary/20",
    low: "bg-error/10 text-error border-error/20",
    info: "bg-primary/10 text-primary border-primary/20",
  };

  const icons = {
    info: <Info size={14} />,
    // Assuming 'high' maps to success, 'medium' to warning, 'low' to alertCircle
    high: <CheckCircle2 size={14} />,
    medium: <AlertCircle size={14} />,
    low: <AlertCircle size={14} />,
  };

  return (
    <div className={`flex items-center space-x-2 rounded-full border px-4 py-2 text-xs font-semibold shadow-sm backdrop-blur-md ${styles[type]}`}>
      {icons[type]}
      <span>{message}</span>
    </div>
  );
};
