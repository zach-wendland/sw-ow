"use client";

import { usePlayerStore } from "@/lib/stores/usePlayerStore";
import { Compass } from "lucide-react";

export function Minimap() {
  const position = usePlayerStore((state) => state.position);

  return (
    <div className="relative w-40 h-40 rounded-full bg-black/60 backdrop-blur-sm border-2 border-white/20 overflow-hidden">
      {/* Compass ring */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-full relative">
          {/* Cardinal directions */}
          <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white/60">
            N
          </span>
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white/40">
            S
          </span>
          <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/40">
            W
          </span>
          <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/40">
            E
          </span>
        </div>
      </div>

      {/* Grid lines */}
      <div className="absolute inset-4 border border-white/10 rounded-full" />
      <div className="absolute inset-8 border border-white/10 rounded-full" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-0.5 bg-white/10" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-full w-0.5 bg-white/10" />
      </div>

      {/* Player indicator */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-lg shadow-blue-500/50" />
      </div>

      {/* Coordinates */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] text-white/50 bg-black/50 px-1.5 py-0.5 rounded">
        {Math.round(position.x)}, {Math.round(position.z)}
      </div>
    </div>
  );
}
