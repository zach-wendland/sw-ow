"use client";

import { useRef, useEffect, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import { Vector3, type Mesh } from "three";
import { usePlayerStore } from "@/lib/stores/usePlayerStore";
import { useEnemyStore } from "@/lib/stores/useEnemyStore";
import { useCombatStore } from "@/lib/stores/useCombatStore";

interface PlayerProps {
  position?: [number, number, number];
}

const MOVE_SPEED = 5;
const SPRINT_MULTIPLIER = 1.8;
const JUMP_FORCE = 8;
const GRAVITY = -20;
const ATTACK_RANGE = 3;
const ATTACK_STAMINA_COST = 10;
const BASE_WEAPON_DAMAGE = 10;

export function Player({ position = [0, 0, 0] }: PlayerProps) {
  const meshRef = useRef<Mesh>(null);
  const velocityRef = useRef(new Vector3(0, 0, 0));
  const isGroundedRef = useRef(true);
  const attackAnimRef = useRef(0);

  // Player store
  const setPosition = usePlayerStore((state) => state.setPosition);
  const setRotation = usePlayerStore((state) => state.setRotation);
  const playerPosition = usePlayerStore((state) => state.position);
  const useStamina = usePlayerStore((state) => state.useStamina);
  const stats = usePlayerStore((state) => state.stats);
  const attributes = usePlayerStore((state) => state.attributes);
  const addXP = usePlayerStore((state) => state.addXP);
  const addGold = usePlayerStore((state) => state.addGold);
  const isDead = usePlayerStore((state) => state.isDead);

  // Enemy store
  const getEnemiesInRange = useEnemyStore((state) => state.getEnemiesInRange);
  const damageEnemy = useEnemyStore((state) => state.damageEnemy);
  const selectEnemy = useEnemyStore((state) => state.selectEnemy);

  // Combat store
  const startPlayerAttack = useCombatStore((state) => state.startPlayerAttack);
  const isPlayerAttacking = useCombatStore((state) => state.isPlayerAttacking);
  const canPlayerAttack = useCombatStore((state) => state.canPlayerAttack);
  const calculatePlayerDamage = useCombatStore((state) => state.calculatePlayerDamage);
  const addDamageNumber = useCombatStore((state) => state.addDamageNumber);
  const addCombatEvent = useCombatStore((state) => state.addCombatEvent);
  const incrementCombo = useCombatStore((state) => state.incrementCombo);

  const [, getKeys] = useKeyboardControls();

  // Attack handler
  const performAttack = useCallback(() => {
    if (isDead || !canPlayerAttack()) return;
    if (!useStamina(ATTACK_STAMINA_COST)) return;

    if (startPlayerAttack()) {
      // Find enemies in range
      const nearbyEnemies = getEnemiesInRange(playerPosition, ATTACK_RANGE);

      if (nearbyEnemies.length > 0) {
        // Attack the first enemy (or selected enemy if exists)
        const target = nearbyEnemies[0];
        selectEnemy(target.id);

        // Calculate damage
        const { damage, isCritical } = calculatePlayerDamage(
          attributes.strength,
          BASE_WEAPON_DAMAGE,
          stats.level
        );

        // Apply damage
        const result = damageEnemy(target.id, damage);

        // Show damage number
        addDamageNumber(damage, target.position, isCritical, false);

        // Combat log
        if (result.killed) {
          addCombatEvent(
            "kill",
            `You killed the enemy! +${result.xp} XP, +${result.gold} Gold`
          );
          addXP(result.xp);
          addGold(result.gold);
        } else {
          addCombatEvent(
            "damage",
            `You hit for ${damage}${isCritical ? " (CRIT!)" : ""} damage!`
          );
        }

        // Increment combo
        incrementCombo();
      }
    }
  }, [
    isDead,
    canPlayerAttack,
    useStamina,
    startPlayerAttack,
    getEnemiesInRange,
    playerPosition,
    selectEnemy,
    calculatePlayerDamage,
    attributes.strength,
    stats.level,
    damageEnemy,
    addDamageNumber,
    addCombatEvent,
    addXP,
    addGold,
    incrementCombo,
  ]);

  // Initialize position
  useEffect(() => {
    setPosition({ x: position[0], y: position[1], z: position[2] });
  }, [position, setPosition]);

  // Listen for mouse click to attack
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        // Left click to attack
        performAttack();
      }
    };

    window.addEventListener("mousedown", handleMouseDown);
    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, [performAttack]);

  useFrame((_, delta) => {
    if (!meshRef.current || isDead) return;

    const { forward, backward, left, right, jump, sprint, attack } = getKeys();

    // Handle attack key
    if (attack) {
      performAttack();
    }

    // Calculate movement direction
    const moveX = (right ? 1 : 0) - (left ? 1 : 0);
    const moveZ = (backward ? 1 : 0) - (forward ? 1 : 0);

    // Apply sprint multiplier
    const speed = sprint ? MOVE_SPEED * SPRINT_MULTIPLIER : MOVE_SPEED;

    // Update horizontal velocity
    velocityRef.current.x = moveX * speed;
    velocityRef.current.z = moveZ * speed;

    // Handle jumping
    if (jump && isGroundedRef.current) {
      velocityRef.current.y = JUMP_FORCE;
      isGroundedRef.current = false;
    }

    // Apply gravity
    if (!isGroundedRef.current) {
      velocityRef.current.y += GRAVITY * delta;
    }

    // Update position
    meshRef.current.position.x += velocityRef.current.x * delta;
    meshRef.current.position.y += velocityRef.current.y * delta;
    meshRef.current.position.z += velocityRef.current.z * delta;

    // Ground check (simple floor at y=0)
    if (meshRef.current.position.y <= 1) {
      meshRef.current.position.y = 1;
      velocityRef.current.y = 0;
      isGroundedRef.current = true;
    }

    // Update rotation based on movement direction
    if (moveX !== 0 || moveZ !== 0) {
      const angle = Math.atan2(moveX, moveZ);
      meshRef.current.rotation.y = angle;
      setRotation(angle);
    }

    // Attack animation (scale pulse)
    if (isPlayerAttacking) {
      attackAnimRef.current = Math.min(attackAnimRef.current + delta * 10, 1);
    } else {
      attackAnimRef.current = Math.max(attackAnimRef.current - delta * 5, 0);
    }

    // Update store
    setPosition({
      x: meshRef.current.position.x,
      y: meshRef.current.position.y,
      z: meshRef.current.position.z,
    });
  });

  // Attack visual scale
  const attackScale = 1 + attackAnimRef.current * 0.2;

  return (
    <group>
      <mesh
        ref={meshRef}
        position={position}
        castShadow
        scale={[attackScale, 1, attackScale]}
      >
        {/* Placeholder player model - capsule shape */}
        <capsuleGeometry args={[0.5, 1, 8, 16]} />
        <meshStandardMaterial
          color={isPlayerAttacking ? "#ff6b6b" : "#4a9eff"}
          emissive={isPlayerAttacking ? "#ff0000" : "#000000"}
          emissiveIntensity={isPlayerAttacking ? 0.3 : 0}
        />
      </mesh>

      {/* Attack range indicator (only when attacking) */}
      {isPlayerAttacking && (
        <mesh
          position={[playerPosition.x, 0.1, playerPosition.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[ATTACK_RANGE - 0.2, ATTACK_RANGE, 32]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
}
