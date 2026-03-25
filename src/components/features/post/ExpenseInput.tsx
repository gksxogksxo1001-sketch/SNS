"use client";

import React from "react";
import { Plane, Hotel, Utensils, MoreHorizontal, X } from "lucide-react";

interface ExpenseInputProps {
  expenses: {
    plane: string;
    stay: string;
    transport: string;
    food: string;
    other: string;
  };
  onExpenseChange: (category: string, value: string) => void;
}

export const ExpenseInput: React.FC<ExpenseInputProps> = ({ expenses, onExpenseChange }) => {
  const categories = [
    { id: "plane", label: "항공", icon: Plane, color: "text-[#2A9D8F]", bgColor: "bg-[#2A9D8F]/10" },
    { id: "stay", label: "숙소", icon: Hotel, color: "text-[#F4A261]", bgColor: "bg-[#F4A261]/10" },
    { id: "transport", label: "교통", icon: MoreHorizontal, color: "text-[#264653]", bgColor: "bg-[#264653]/10" },
    { id: "food", label: "식비", icon: Utensils, color: "text-[#E9C46A]", bgColor: "bg-[#E9C46A]/10" },
    { id: "other", label: "기타", icon: MoreHorizontal, color: "text-[#6C757D]", bgColor: "bg-[#6C757D]/10" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {categories.map((cat) => (
        <div key={cat.id} className="flex flex-col space-y-2">
          <label className="flex items-center space-x-2 px-1 text-[11px] font-bold text-[#6C757D]">
            <div className={`p-1.5 rounded-lg ${cat.bgColor} shadow-sm`}>
              <cat.icon size={12} className={cat.color} />
            </div>
            <span>{cat.label}</span>
          </label>
          <div className="group relative">
            <input
              type="text"
              inputMode="numeric"
              value={expenses[cat.id as keyof typeof expenses]}
              onChange={(e) => onExpenseChange(cat.id, e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="0"
              className="w-full rounded-2xl bg-[#F8F9FA] px-4 py-3.5 text-sm font-black text-[#212529] outline-none border border-transparent transition-all focus:bg-white focus:border-[#2A9D8F]/20 focus:ring-4 focus:ring-[#2A9D8F]/5 placeholder:text-[#CED4DA]"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#ADB5BD] transition-colors group-focus-within:text-[#2A9D8F]">
              원
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
