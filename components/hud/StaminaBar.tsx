"use client";

import { usePlayerStore } from "@/lib/stores/usePlayerStore";
import { Zap } from "lucide-react";

export function StaminaBar() {
  const { stamina, maxStamina } = usePlayerStore((state) => state.stats);
  const percentage = (stamina / maxStamina) * 100;

  return (
    <div className="flex items-center gap-2">
      <Zap className="h-4 w-4 text-green-500" />
      <div className="w-48">
        <div className="stamina-bar bg-black/50 border border-green-900/50">
          <div
            className="stamina-bar-fill bg-gradient-to-r from-green-600 to-green-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="mt-0.5 flex justify-between text-xs">
          <span className="text-white/60">STA</span>
          <span className="text-white/60">
            {Math.round(stamina)} / {maxStamina}
          </span>
        </div>
      </div>
    </div>
  );
}
