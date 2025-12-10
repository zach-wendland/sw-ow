"use client";

export function Crosshair() {
  return (
    <div className="crosshair">
      {/* Simple dot crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white/80 rounded-full" />
    </div>
  );
}
