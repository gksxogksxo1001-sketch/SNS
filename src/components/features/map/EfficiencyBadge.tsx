"use client";

import React from "react";
import { Info, AlertCircle, CheckCircle2 } from "lucide-react";

interface EfficiencyBadgeProps {
  type: "info" | "warning" | "success";
  message: string;
}

export const EfficiencyBadge: React.FC<EfficiencyBadgeProps> = ({ type, message }) => {
  const styles = {
    info: "bg-blue-50 text-blue-600 border-blue-100",
    warning: "bg-orange-50 text-orange-600 border-orange-100",
    success: "bg-teal-50 text-teal-600 border-teal-100",
  };

  const icons = {
    info: <Info size={14} />,
    warning: <AlertCircle size={14} />,
    success: <CheckCircle2 size={14} />,
  };

  return (
    <div className={`flex items-center space-x-2 rounded-full border px-4 py-2 text-xs font-semibold shadow-sm backdrop-blur-md ${styles[type]}`}>
      {icons[type]}
      <span>{message}</span>
    </div>
  );
};
