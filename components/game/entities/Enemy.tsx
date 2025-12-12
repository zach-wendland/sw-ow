"use client";

import { useRef, useMemo, useEffect, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Mesh, Vector3 } from "three";
import { Enemy as EnemyType, getEnemyConfig } from "@/types/enemies";
import { useEnemyStore } from "@/lib/stores/useEnemyStore";
import { usePlayerStore } from "@/lib/stores/usePlayerStore";
import { useCombatStore, COMBAT_FEEL } from "@/lib/stores/useCombatStore";

interface EnemyProps {
  enemyId: string;
}

export function Enemy({ enemyId }: EnemyProps) {
  const meshRef = useRef<Mesh>(null);
  // Reuse Vector3 to avoid GC pressure (60 allocations/sec per enemy otherwise)
  const tempPlayerPos = useRef(new Vector3());
  // Track windup timer for attack telegraph
  const windupTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Only subscribe to non-position data to avoid re-render loops
  // Position is read directly in useFrame like Player.tsx does
  // Using useShallow to prevent infinite re-renders (shallow compares object properties)
  const enemy = useEnemyStore(
    useShallow((state) => {
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
    })
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
  const getTimeScale = useCombatStore((state) => state.getTimeScale);
  const triggerHitStop = useCombatStore((state) => state.triggerHitStop);
  const triggerScreenShake = useCombatStore((state) => state.triggerScreenShake);

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

  // Cleanup windup timer on unmount
  useEffect(() => {
    return () => {
      if (windupTimerRef.current) {
        clearTimeout(windupTimerRef.current);
      }
    };
  }, []);

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

    // Check hitstop - pause all behavior during hitstop
    const timeScale = getTimeScale();
    if (timeScale === 0) return;

    // Apply time scale to delta for consistent timing
    const scaledDelta = delta * timeScale;

    const playerPosition = getPlayerPosition();
    const enemyPos = meshRef.current.position;
    // Reuse Vector3 instead of creating new one every frame
    tempPlayerPos.current.set(playerPosition.x, playerPosition.y, playerPosition.z);
    const distanceToPlayer = enemyPos.distanceTo(tempPlayerPos.current);

    // State machine with windup/recovery telegraph system
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
          const moveDistance = config.speed * scaledDelta;

          // Update mesh position
          meshRef.current.position.x += direction.x * moveDistance;
          meshRef.current.position.z += direction.z * moveDistance;

          // Face player
          meshRef.current.rotation.y = Math.atan2(direction.x, direction.z);
        } else {
          // Start attack - transition to windup state first (telegraph)
          const now = Date.now();
          const timeSinceLastAttack = (now - fullEnemy.lastAttackTime) / 1000;

          if (timeSinceLastAttack >= config.attackCooldown) {
            setEnemyState(fullEnemy.id, "windup");
            recordEnemyAttack(fullEnemy.id); // Mark attack start time

            // Schedule the actual attack after windup time
            windupTimerRef.current = setTimeout(() => {
              const currentEnemy = getEnemyData();
              if (!currentEnemy || currentEnemy.state !== "windup") return;

              // Check if player still in range
              const currentPlayerPos = getPlayerPosition();
              const currentEnemyPos = meshRef.current?.position;
              if (!currentEnemyPos) return;

              tempPlayerPos.current.set(currentPlayerPos.x, currentPlayerPos.y, currentPlayerPos.z);
              const currentDistance = currentEnemyPos.distanceTo(tempPlayerPos.current);

              if (currentDistance <= config.attackRange * 1.3) {
                // Deal damage
                const damage = calculateEnemyDamage(currentEnemy.type, 0);
                takeDamage(damage);

                addDamageNumber(damage, currentPlayerPos, false, false);
                addCombatEvent("damage", `${config.name} hits you for ${damage} damage!`);

                // Trigger screen shake for player being hit
                triggerScreenShake(0.15, 150);
              }

              // Transition to recovery state
              setEnemyState(currentEnemy.id, "recovery");

              // After recovery, go back to chase or attack
              setTimeout(() => {
                const afterRecoveryEnemy = getEnemyData();
                if (afterRecoveryEnemy && afterRecoveryEnemy.state === "recovery") {
                  setEnemyState(afterRecoveryEnemy.id, "chase");
                }
              }, config.recoveryTime);
            }, config.windupTime);
          }
        }

        // Lost player
        if (distanceToPlayer > config.detectionRange * 1.5) {
          setEnemyState(fullEnemy.id, "idle");
          setEnemyTarget(fullEnemy.id, null);
        }
        break;

      case "windup":
        // Face player during windup (tracking)
        const windupDir = tempPlayerPos.current.clone().sub(enemyPos).normalize();
        meshRef.current.rotation.y = Math.atan2(windupDir.x, windupDir.z);

        // Can be interrupted by player moving far away
        if (distanceToPlayer > config.attackRange * 2) {
          if (windupTimerRef.current) {
            clearTimeout(windupTimerRef.current);
            windupTimerRef.current = null;
          }
          setEnemyState(fullEnemy.id, "chase");
        }
        break;

      case "recovery":
        // Enemy is vulnerable during recovery - can't move or attack
        // Just face player
        const recoveryDir = tempPlayerPos.current.clone().sub(enemyPos).normalize();
        meshRef.current.rotation.y = Math.atan2(recoveryDir.x, recoveryDir.z);
        break;

      case "attack":
        // Legacy state - redirect to new system
        setEnemyState(fullEnemy.id, "chase");
        break;

      case "staggered":
        // Enemy is staggered - can't do anything (future: implement stagger system)
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

  // Visual state based on enemy state - enhanced for combat feel
  const getEmissiveColor = () => {
    if (isDead) return "#000000";
    if (isSelected) return "#ffff00";
    // WINDUP: Bright red flash - DANGER telegraph!
    if (enemy.state === "windup") return "#ff0000";
    // RECOVERY: Dim blue - vulnerable, punish window
    if (enemy.state === "recovery") return "#4444ff";
    // STAGGERED: Bright white - super vulnerable
    if (enemy.state === "staggered") return "#ffffff";
    if (enemy.state === "attack") return "#ff0000";
    if (enemy.state === "chase") return "#ff6600";
    return "#000000";
  };

  // Emissive intensity varies by state for visual feedback
  const getEmissiveIntensity = () => {
    if (isSelected) return 0.3;
    if (enemy.state === "windup") return 0.8; // Bright flash during windup
    if (enemy.state === "recovery") return 0.2;
    if (enemy.state === "staggered") return 0.6;
    return 0.1;
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
          emissiveIntensity={getEmissiveIntensity()}
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
