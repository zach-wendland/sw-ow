"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useCombatStore } from "@/lib/stores/useCombatStore";

interface DamageNumberProps {
  id: string;
  amount: number;
  position: { x: number; y: number; z: number };
  isCritical: boolean;
  isHeal: boolean;
  createdAt: number;
}

const FLOAT_SPEED = 1.5;
const LIFETIME = 1500;

function DamageNumberDisplay({
  id,
  amount,
  position,
  isCritical,
  isHeal,
  createdAt,
}: DamageNumberProps) {
  const yOffset = useRef(0);
  const opacity = useRef(1);

  useFrame((_, delta) => {
    // Float upward
    yOffset.current += FLOAT_SPEED * delta;

    // Fade out based on lifetime
    const age = Date.now() - createdAt;
    opacity.current = Math.max(0, 1 - age / LIFETIME);
  });

  const color = isHeal ? "#22c55e" : isCritical ? "#f97316" : "#ef4444";
  const fontSize = isCritical ? "text-2xl" : isHeal ? "text-lg" : "text-xl";

  return (
    <Html
      position={[position.x, position.y + yOffset.current, position.z]}
      center
      distanceFactor={10}
      style={{
        pointerEvents: "none",
        opacity: opacity.current,
        transition: "opacity 0.1s",
      }}
    >
      <div
        className={`font-bold ${fontSize} drop-shadow-lg select-none`}
        style={{
          color,
          textShadow: `0 0 5px ${color}, 0 2px 4px rgba(0,0,0,0.8)`,
          transform: isCritical ? "scale(1.2)" : "scale(1)",
        }}
      >
        {isHeal ? "+" : "-"}
        {amount}
        {isCritical && <span className="text-sm ml-1">CRIT!</span>}
      </div>
    </Html>
  );
}

export function DamageNumbers() {
  const damageNumbers = useCombatStore((state) => state.damageNumbers);

  return (
    <>
      {damageNumbers.map((dn) => (
        <DamageNumberDisplay
          key={dn.id}
          id={dn.id}
          amount={dn.amount}
          position={dn.position}
          isCritical={dn.isCritical}
          isHeal={dn.isHeal}
          createdAt={dn.createdAt}
        />
      ))}
    </>
  );
}
