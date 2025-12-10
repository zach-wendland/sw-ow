"use client";

import { usePlayerStore } from "@/lib/stores/usePlayerStore";
import { Heart } from "lucide-react";

export function HealthBar() {
  const { health, maxHealth } = usePlayerStore((state) => state.stats);
  const percentage = (health / maxHealth) * 100;

  // Color based on health percentage
  const getBarColor = () => {
    if (percentage > 60) return "from-green-600 to-green-500";
    if (percentage > 30) return "from-yellow-600 to-yellow-500";
    return "from-red-600 to-red-500";
  };

  return (
    <div className="flex items-center gap-2">
      <Heart className="h-5 w-5 text-red-500" />
      <div className="w-48">
        <div className="health-bar bg-black/50 border border-red-900/50">
          <div
            className={`health-bar-fill bg-gradient-to-r ${getBarColor()}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="mt-0.5 flex justify-between text-xs">
          <span className="text-white/80">HP</span>
          <span className="text-white/80">
            {Math.round(health)} / {maxHealth}
          </span>
        </div>
      </div>
    </div>
  );
}
