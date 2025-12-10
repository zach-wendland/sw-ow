"use client";

import { usePlayerStore } from "@/lib/stores/usePlayerStore";
import { Star } from "lucide-react";

export function XPBar() {
  const { xp, xpToNextLevel, level } = usePlayerStore((state) => state.stats);
  const percentage = (xp / xpToNextLevel) * 100;

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Star className="h-5 w-5 text-yellow-500" />
        <span className="absolute -bottom-1 -right-1 text-[10px] font-bold text-white bg-slate-800 rounded-full w-4 h-4 flex items-center justify-center">
          {level}
        </span>
      </div>
      <div className="w-48">
        <div className="xp-bar bg-black/50 border border-yellow-900/50">
          <div
            className="xp-bar-fill bg-gradient-to-r from-yellow-600 to-yellow-400"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="mt-0.5 flex justify-between text-xs">
          <span className="text-white/50">XP</span>
          <span className="text-white/50">
            {xp} / {xpToNextLevel}
          </span>
        </div>
      </div>
    </div>
  );
}
