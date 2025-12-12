"use client";

import { useRef, useMemo, useEffect, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Mesh, Vector3 } from "three";
import { Enemy as EnemyType, getEnemyConfig } from "@/types/enemies";
import { useEnemyStore } from "@/lib/stores/useEnemyStore";
import { usePlayerStore } from "@/lib/stores/usePlayerStore";
import { useCombatStore } from "@/lib/stores/useCombatStore";

interface EnemyProps {
  enemyId: string;
}

export function Enemy({ enemyId }: EnemyProps) {
  const meshRef = useRef<Mesh>(null);
  // Reuse Vector3 to avoid GC pressure (60 allocations/sec per enemy otherwise)
  const tempPlayerPos = useRef(new Vector3());

  // Only subscribe to non-position data to avoid re-render loops
  // Position is read directly in useFrame like Player.tsx does
  const enemy = useEnemyStore(
    useCallback(
      (state) => {
        const e = state.enemies.get(enemyId);
        if (!e) return null;
        // Return only data that should trigger re-renders
        return {
          id: e.id,
          type: e.type,
          health: e.health,
          maxHealth: e.maxHealth,
          state: e.state,
          lastAttackTime: e.lastAttackTime,
        };
      },
      [enemyId]
    )
  );

  const config = useMemo(() => getEnemyConfig(enemy?.type || "slime"), [enemy?.type]);

  // Get player position directly from store (not reactive) - same as Player.tsx
  const getPlayerPosition = useCallback(() => usePlayerStore.getState().position, []);

  // Get enemy position directly from store (not reactive) - same pattern as Player.tsx
  const getEnemyData = useCallback(() => useEnemyStore.getState().enemies.get(enemyId), [enemyId]);

  // Store actions (stable references)
  const setEnemyPosition = useEnemyStore((state) => state.setEnemyPosition);
  const setEnemyRotation = useEnemyStore((state) => state.setEnemyRotation);
  const setEnemyState = useEnemyStore((state) => state.setEnemyState);
  const setEnemyTarget = useEnemyStore((state) => state.setEnemyTarget);
  const recordEnemyAttack = useEnemyStore((state) => state.recordEnemyAttack);
  const selectEnemy = useEnemyStore((state) => state.selectEnemy);
  const selectedEnemyId = useEnemyStore((state) => state.selectedEnemyId);

  const takeDamage = usePlayerStore((state) => state.takeDamage);
  const calculateEnemyDamage = useCombatStore((state) => state.calculateEnemyDamage);
  const addDamageNumber = useCombatStore((state) => state.addDamageNumber);
  const addCombatEvent = useCombatStore((state) => state.addCombatEvent);

  const removeEnemy = useEnemyStore((state) => state.removeEnemy);

  // Derived state (safe to compute before hooks since enemy might be undefined)
  const isSelected = selectedEnemyId === enemyId;
  const healthPercent = enemy ? (enemy.health / enemy.maxHealth) * 100 : 0;
  const isDead = enemy?.state === "dead";

  // Handle death cleanup with proper timer management
  useEffect(() => {
    if (isDead && enemy) {
      const timer = setTimeout(() => {
        removeEnemy(enemy.id);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isDead, enemy?.id, removeEnemy]);

  // Initialize mesh position from store
  useEffect(() => {
    const fullEnemy = getEnemyData();
    if (fullEnemy && meshRef.current) {
      meshRef.current.position.set(fullEnemy.position.x, fullEnemy.position.y, fullEnemy.position.z);
      meshRef.current.rotation.y = fullEnemy.rotation;
    }
  }, [enemyId, getEnemyData]);

  // AI behavior - same pattern as Player.tsx
  useFrame((_, delta) => {
    if (!meshRef.current || isDead || !enemy) return;

    const fullEnemy = getEnemyData();
    if (!fullEnemy) return;

    const playerPosition = getPlayerPosition();
    const enemyPos = meshRef.current.position;
    // Reuse Vector3 instead of creating new one every frame
    tempPlayerPos.current.set(playerPosition.x, playerPosition.y, playerPosition.z);
    const distanceToPlayer = enemyPos.distanceTo(tempPlayerPos.current);

    // State machine
    switch (fullEnemy.state) {
      case "idle":
        // Check if player is in detection range
        if (distanceToPlayer <= config.detectionRange) {
          setEnemyState(fullEnemy.id, "chase");
          setEnemyTarget(fullEnemy.id, "player");
        }
        break;

      case "chase":
        // Move towards player
        if (distanceToPlayer > config.attackRange) {
          const direction = tempPlayerPos.current.clone().sub(enemyPos).normalize();
          const moveDistance = config.speed * delta;

          // Update mesh position
          meshRef.current.position.x += direction.x * moveDistance;
          meshRef.current.position.z += direction.z * moveDistance;

          // Face player
          meshRef.current.rotation.y = Math.atan2(direction.x, direction.z);
        } else {
          setEnemyState(fullEnemy.id, "attack");
        }

        // Lost player
        if (distanceToPlayer > config.detectionRange * 1.5) {
          setEnemyState(fullEnemy.id, "idle");
          setEnemyTarget(fullEnemy.id, null);
        }
        break;

      case "attack":
        // Face player
        const dir = tempPlayerPos.current.clone().sub(enemyPos).normalize();
        meshRef.current.rotation.y = Math.atan2(dir.x, dir.z);

        // Check if can attack
        const now = Date.now();
        const timeSinceLastAttack = (now - fullEnemy.lastAttackTime) / 1000;

        if (timeSinceLastAttack >= config.attackCooldown) {
          if (distanceToPlayer <= config.attackRange) {
            // Attack player
            const damage = calculateEnemyDamage(fullEnemy.type, 0);
            takeDamage(damage);
            recordEnemyAttack(fullEnemy.id);

            addDamageNumber(damage, playerPosition, false, false);
            addCombatEvent("damage", `${config.name} hits you for ${damage} damage!`);
          }
        }

        // Player moved out of range
        if (distanceToPlayer > config.attackRange * 1.2) {
          setEnemyState(fullEnemy.id, "chase");
        }
        break;

      case "dead":
        // Do nothing, wait for removal
        break;
    }

    // Update store every frame - same as Player.tsx does
    setEnemyPosition(fullEnemy.id, {
      x: meshRef.current.position.x,
      y: meshRef.current.position.y,
      z: meshRef.current.position.z,
    });
    setEnemyRotation(fullEnemy.id, meshRef.current.rotation.y);
  });

  // Early return after all hooks if enemy doesn't exist
  if (!enemy) return null;

  // Get full enemy data for rendering (position not in reactive subscription)
  const fullEnemy = getEnemyData();
  if (!fullEnemy) return null;

  // Click to select
  const handleClick = (e: any) => {
    e.stopPropagation();
    if (!isDead) {
      selectEnemy(enemy.id);
    }
  };

  // Visual state based on enemy state
  const getEmissiveColor = () => {
    if (isDead) return "#000000";
    if (isSelected) return "#ffff00";
    if (enemy.state === "attack") return "#ff0000";
    if (enemy.state === "chase") return "#ff6600";
    return "#000000";
  };

  return (
    <group>
      {/* Enemy mesh - position controlled in useFrame, initial position from store */}
      <mesh
        ref={meshRef}
        position={[fullEnemy.position.x, fullEnemy.position.y, fullEnemy.position.z]}
        rotation={[0, fullEnemy.rotation, 0]}
        onClick={handleClick}
        castShadow
        receiveShadow
        scale={isDead ? [config.scale, 0.1, config.scale] : config.scale}
      >
        {/* Placeholder: Capsule for humanoid, sphere for others */}
        {enemy.type === "slime" ? (
          <sphereGeometry args={[0.5, 16, 16]} />
        ) : enemy.type === "golem" ? (
          <boxGeometry args={[1, 1.5, 0.8]} />
        ) : (
          <capsuleGeometry args={[0.4, 0.8, 8, 16]} />
        )}
        <meshStandardMaterial
          color={config.color}
          emissive={getEmissiveColor()}
          emissiveIntensity={isSelected ? 0.3 : 0.1}
          transparent={isDead}
          opacity={isDead ? 0.5 : 1}
        />
      </mesh>

      {/* Health bar (only show when damaged or selected) - follows mesh via Html tracking */}
      {!isDead && (healthPercent < 100 || isSelected) && meshRef.current && (
        <Html
          position={[
            meshRef.current.position.x,
            meshRef.current.position.y + 2,
            meshRef.current.position.z,
          ]}
          center
          distanceFactor={15}
          occlude={false}
          style={{
            pointerEvents: "none",
          }}
        >
          <div className="flex flex-col items-center gap-1">
            {/* Name */}
            <span
              className="text-xs font-bold text-white drop-shadow-lg"
              style={{ textShadow: "0 0 3px black" }}
            >
              {config.name}
            </span>

            {/* Health bar */}
            <div className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-600">
              <div
                className="h-full transition-all duration-200"
                style={{
                  width: `${healthPercent}%`,
                  backgroundColor:
                    healthPercent > 50
                      ? "#22c55e"
                      : healthPercent > 25
                      ? "#eab308"
                      : "#ef4444",
                }}
              />
            </div>

            {/* Health text */}
            <span className="text-[10px] text-gray-300">
              {enemy.health}/{enemy.maxHealth}
            </span>
          </div>
        </Html>
      )}

      {/* Selection indicator - follows mesh */}
      {isSelected && !isDead && meshRef.current && (
        <mesh
          position={[
            meshRef.current.position.x,
            0.1,
            meshRef.current.position.z,
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.8, 1, 32]} />
          <meshBasicMaterial color="#ffff00" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}

// ============================================================================
// ENEMY LIST COMPONENT
// ============================================================================

export function EnemyList() {
  // Use useShallow to ensure referential stability of the array
  // This prevents infinite re-renders in React 19 with Zustand 5
  const enemyIds = useEnemyStore(
    useShallow((state) => Array.from(state.enemies.keys()))
  );

  return (
    <>
      {enemyIds.map((id) => (
        <Enemy key={id} enemyId={id} />
      ))}
    </>
  );
}
