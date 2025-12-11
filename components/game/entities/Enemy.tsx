"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Mesh, Vector3 } from "three";
import { Enemy as EnemyType, getEnemyConfig } from "@/types/enemies";
import { useEnemyStore } from "@/lib/stores/useEnemyStore";
import { usePlayerStore } from "@/lib/stores/usePlayerStore";
import { useCombatStore } from "@/lib/stores/useCombatStore";

interface EnemyProps {
  enemy: EnemyType;
}

export function Enemy({ enemy }: EnemyProps) {
  const meshRef = useRef<Mesh>(null);
  const config = useMemo(() => getEnemyConfig(enemy.type), [enemy.type]);

  const playerPosition = usePlayerStore((state) => state.position);
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

  const isSelected = selectedEnemyId === enemy.id;
  const healthPercent = (enemy.health / enemy.maxHealth) * 100;
  const isDead = enemy.state === "dead";

  // Handle death cleanup with proper timer management
  useEffect(() => {
    if (isDead) {
      const timer = setTimeout(() => {
        removeEnemy(enemy.id);
      }, 2000);
      return () => clearTimeout(timer); // Cleanup on unmount
    }
  }, [isDead, enemy.id, removeEnemy]);

  // AI behavior
  useFrame((_, delta) => {
    if (!meshRef.current || isDead) return;

    const enemyPos = new Vector3(
      enemy.position.x,
      enemy.position.y,
      enemy.position.z
    );
    const playerPos = new Vector3(
      playerPosition.x,
      playerPosition.y,
      playerPosition.z
    );
    const distanceToPlayer = enemyPos.distanceTo(playerPos);

    // State machine
    switch (enemy.state) {
      case "idle":
        // Check if player is in detection range
        if (distanceToPlayer <= config.detectionRange) {
          setEnemyState(enemy.id, "chase");
          setEnemyTarget(enemy.id, "player");
        }
        break;

      case "chase":
        // Move towards player
        if (distanceToPlayer > config.attackRange) {
          const direction = playerPos.clone().sub(enemyPos).normalize();
          const moveDistance = config.speed * delta;

          const newPos = {
            x: enemy.position.x + direction.x * moveDistance,
            y: enemy.position.y,
            z: enemy.position.z + direction.z * moveDistance,
          };
          setEnemyPosition(enemy.id, newPos);

          // Face player
          const angle = Math.atan2(direction.x, direction.z);
          setEnemyRotation(enemy.id, angle);

          // Update mesh position
          meshRef.current.position.set(newPos.x, newPos.y, newPos.z);
        } else {
          // In attack range
          setEnemyState(enemy.id, "attack");
        }

        // Lost player
        if (distanceToPlayer > config.detectionRange * 1.5) {
          setEnemyState(enemy.id, "idle");
          setEnemyTarget(enemy.id, null);
        }
        break;

      case "attack":
        // Face player
        const dir = playerPos.clone().sub(enemyPos).normalize();
        const attackAngle = Math.atan2(dir.x, dir.z);
        setEnemyRotation(enemy.id, attackAngle);

        // Check if can attack
        const now = Date.now();
        const timeSinceLastAttack = (now - enemy.lastAttackTime) / 1000;

        if (timeSinceLastAttack >= config.attackCooldown) {
          if (distanceToPlayer <= config.attackRange) {
            // Attack player
            const damage = calculateEnemyDamage(enemy.type, 0);
            takeDamage(damage);
            recordEnemyAttack(enemy.id);

            addDamageNumber(damage, playerPosition, false, false);
            addCombatEvent(
              "damage",
              `${config.name} hits you for ${damage} damage!`
            );
          }
        }

        // Player moved out of range
        if (distanceToPlayer > config.attackRange * 1.2) {
          setEnemyState(enemy.id, "chase");
        }
        break;

      case "dead":
        // Do nothing, wait for removal
        break;
    }
  });

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
    <group
      position={[enemy.position.x, enemy.position.y, enemy.position.z]}
      rotation={[0, enemy.rotation, 0]}
    >
      {/* Enemy mesh */}
      <mesh
        ref={meshRef}
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

      {/* Health bar (only show when damaged or selected) */}
      {!isDead && (healthPercent < 100 || isSelected) && (
        <Html
          position={[0, 2, 0]}
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

      {/* Selection indicator */}
      {isSelected && !isDead && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
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
  const enemies = useEnemyStore((state) => state.getEnemiesArray());

  return (
    <>
      {enemies.map((enemy) => (
        <Enemy key={enemy.id} enemy={enemy} />
      ))}
    </>
  );
}
