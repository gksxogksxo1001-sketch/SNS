"use client";

import React from "react";
import { Clock, Navigation } from "lucide-react";

interface RouteCardProps {
  place: {
    id: string;
    name: string;
    image: string;
    tags: string[];
    order: number;
    description: string;
  };
  isActive: boolean;
}

export const RouteCard: React.FC<RouteCardProps> = ({ place, isActive }) => {
  return (
    <div
      className={`relative flex-shrink-0 w-72 rounded-2xl bg-bg-base p-3 shadow-lg transition-all duration-300 ${
        isActive ? "scale-100 opacity-100 ring-2 ring-primary" : "scale-95 opacity-80"
      }`}
    >
      <div className="flex space-x-3">
        {/* Image */}
        <div className="h-20 w-20 overflow-hidden rounded-xl bg-bg-alt">
          <img src={place.image} alt={place.name} className="h-full w-full object-cover" />
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col justify-between overflow-hidden">
          <div>
            <div className="flex items-center space-x-1.5 overflow-hidden">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                {place.order}
              </span>
              <h3 className="truncate text-sm font-bold text-text-main">{place.name}</h3>
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {place.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="text-[10px] text-primary">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-[10px] text-text-sub">
             <span className="flex items-center space-x-0.5">
               <Navigation size={10} />
               <span>정체 없음</span>
             </span>
          </div>
        </div>
      </div>
      
      {isActive && (
        <div className="mt-2 text-[11px] leading-tight text-text-sub line-clamp-2 italic">
          "{place.description}"
        </div>
      )}
    </div>
  );
};
