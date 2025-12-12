"use client";

import { useRef, useEffect, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import { Vector3, type Mesh } from "three";
import { usePlayerStore } from "@/lib/stores/usePlayerStore";
import { useEnemyStore } from "@/lib/stores/useEnemyStore";
import { useCombatStore, COMBAT_FEEL } from "@/lib/stores/useCombatStore";
import { getChunkManager } from "@/lib/voxel/ChunkManager";
import { isBlockSolid } from "@/lib/voxel/constants";

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

// Player collider approximation (for voxel collision)
const PLAYER_RADIUS = 0.5;
const PLAYER_HALF_HEIGHT = 1.0;
const STEP_HEIGHT = 1.05; // allow stepping up ~1 block for outdoor terrain
const COLLISION_EPS = 1e-4;

export function Player({ position = [0, 0, 0] }: PlayerProps) {
  const meshRef = useRef<Mesh>(null);
  const velocityRef = useRef(new Vector3(0, 0, 0));
  const isGroundedRef = useRef(true);
  const attackAnimRef = useRef(0);

  // Player store
  const setPosition = usePlayerStore((state) => state.setPosition);
  const setRotation = usePlayerStore((state) => state.setRotation);
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
  const triggerHitStop = useCombatStore((state) => state.triggerHitStop);
  const triggerScreenShake = useCombatStore((state) => state.triggerScreenShake);
  const getTimeScale = useCombatStore((state) => state.getTimeScale);

  const [, getKeys] = useKeyboardControls();

  // Attack key debounce to prevent spam when holding key
  const attackKeyWasDown = useRef(false);

  // Attack handler - FIX: Read position fresh from store to avoid stale closure
  const performAttack = useCallback(() => {
    if (isDead || !canPlayerAttack()) return;
    if (!useStamina(ATTACK_STAMINA_COST)) return;

    if (startPlayerAttack()) {
      // FIX: Read fresh position directly from store (not from closure)
      const currentPosition = usePlayerStore.getState().position;
      // Find enemies in range
      const nearbyEnemies = getEnemiesInRange(currentPosition, ATTACK_RANGE);

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

        // COMBAT FEEL: Trigger hitstop and screen shake based on hit type
        if (result.killed) {
          // Big hit - kill effect
          triggerHitStop(COMBAT_FEEL.HITSTOP_FRAMES_KILL);
          triggerScreenShake(0.3, 200); // Heavy shake for kills
          addCombatEvent(
            "kill",
            `You killed the enemy! +${result.xp} XP, +${result.gold} Gold`
          );
          addXP(result.xp);
          addGold(result.gold);
        } else if (isCritical) {
          // Critical hit
          triggerHitStop(COMBAT_FEEL.HITSTOP_FRAMES_CRITICAL);
          triggerScreenShake(0.2, 150); // Medium shake for crits
          addCombatEvent(
            "damage",
            `CRITICAL HIT for ${damage} damage!`
          );
        } else {
          // Normal hit
          triggerHitStop(COMBAT_FEEL.HITSTOP_FRAMES_NORMAL);
          triggerScreenShake(0.1, 100); // Light shake for normal hits
          addCombatEvent(
            "damage",
            `You hit for ${damage} damage!`
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
    // FIX: Removed playerPosition from deps - now read fresh from store
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
    triggerHitStop,
    triggerScreenShake,
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

    // Check hitstop - pause during hitstop for impact feel
    const timeScale = getTimeScale();
    if (timeScale === 0) return;

    const scaledDelta = delta * timeScale;

    const { forward, backward, left, right, jump, sprint, attack } = getKeys();

    // Handle attack key - FIX: Debounce to only trigger on keydown, not every frame
    if (attack && !attackKeyWasDown.current) {
      performAttack();
    }
    attackKeyWasDown.current = attack;

    // Calculate movement direction
    const moveX = (right ? 1 : 0) - (left ? 1 : 0);
    const moveZ = (backward ? 1 : 0) - (forward ? 1 : 0);

    // Normalize diagonal movement to prevent sqrt(2) speed boost
    let normalizedX = moveX;
    let normalizedZ = moveZ;
    if (moveX !== 0 && moveZ !== 0) {
      const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
      normalizedX = moveX / length;
      normalizedZ = moveZ / length;
    }

    // Apply sprint multiplier
    const speed = sprint ? MOVE_SPEED * SPRINT_MULTIPLIER : MOVE_SPEED;

    // Update horizontal velocity (local X/Z)
    velocityRef.current.x = normalizedX * speed;
    velocityRef.current.z = normalizedZ * speed;

    // Handle jumping
    if (jump && isGroundedRef.current) {
      velocityRef.current.y = JUMP_FORCE;
      isGroundedRef.current = false;
    }

    // Apply gravity
    if (!isGroundedRef.current) {
      velocityRef.current.y += GRAVITY * scaledDelta;
    }

    const manager = getChunkManager();

    const isSolidBlock = (x: number, y: number, z: number) => {
      const blockId = manager.getBlockAt(x, y, z);
      return isBlockSolid(blockId);
    };

    const collidesAt = (px: number, py: number, pz: number) => {
      const minX = px - PLAYER_RADIUS;
      const maxX = px + PLAYER_RADIUS;
      const minY = py - PLAYER_HALF_HEIGHT;
      const maxY = py + PLAYER_HALF_HEIGHT;
      const minZ = pz - PLAYER_RADIUS;
      const maxZ = pz + PLAYER_RADIUS;

      const x0 = Math.floor(minX + COLLISION_EPS);
      const x1 = Math.floor(maxX - COLLISION_EPS);
      const y0 = Math.floor(minY + COLLISION_EPS);
      const y1 = Math.floor(maxY - COLLISION_EPS);
      const z0 = Math.floor(minZ + COLLISION_EPS);
      const z1 = Math.floor(maxZ - COLLISION_EPS);

      for (let x = x0; x <= x1; x++) {
        for (let y = y0; y <= y1; y++) {
          for (let z = z0; z <= z1; z++) {
            if (isSolidBlock(x, y, z)) return true;
          }
        }
      }
      return false;
    };

    const resolveAxisX = (px: number, py: number, pz: number, dx: number) => {
      if (dx === 0) return px;
      let nextX = px + dx;

      if (dx > 0) {
        const maxX = nextX + PLAYER_RADIUS;
        const blockX = Math.floor(maxX - COLLISION_EPS);

        const minY = py - PLAYER_HALF_HEIGHT;
        const maxY = py + PLAYER_HALF_HEIGHT;
        const minZ = pz - PLAYER_RADIUS;
        const maxZ = pz + PLAYER_RADIUS;

        const y0 = Math.floor(minY + COLLISION_EPS);
        const y1 = Math.floor(maxY - COLLISION_EPS);
        const z0 = Math.floor(minZ + COLLISION_EPS);
        const z1 = Math.floor(maxZ - COLLISION_EPS);

        for (let y = y0; y <= y1; y++) {
          for (let z = z0; z <= z1; z++) {
            if (isSolidBlock(blockX, y, z)) {
              nextX = blockX - PLAYER_RADIUS - COLLISION_EPS;
              return nextX;
            }
          }
        }
      } else {
        const minX = nextX - PLAYER_RADIUS;
        const blockX = Math.floor(minX + COLLISION_EPS);

        const minY = py - PLAYER_HALF_HEIGHT;
        const maxY = py + PLAYER_HALF_HEIGHT;
        const minZ = pz - PLAYER_RADIUS;
        const maxZ = pz + PLAYER_RADIUS;

        const y0 = Math.floor(minY + COLLISION_EPS);
        const y1 = Math.floor(maxY - COLLISION_EPS);
        const z0 = Math.floor(minZ + COLLISION_EPS);
        const z1 = Math.floor(maxZ - COLLISION_EPS);

        for (let y = y0; y <= y1; y++) {
          for (let z = z0; z <= z1; z++) {
            if (isSolidBlock(blockX, y, z)) {
              nextX = blockX + 1 + PLAYER_RADIUS + COLLISION_EPS;
              return nextX;
            }
          }
        }
      }

      return nextX;
    };

    const resolveAxisZ = (px: number, py: number, pz: number, dz: number) => {
      if (dz === 0) return pz;
      let nextZ = pz + dz;

      if (dz > 0) {
        const maxZ = nextZ + PLAYER_RADIUS;
        const blockZ = Math.floor(maxZ - COLLISION_EPS);

        const minX = px - PLAYER_RADIUS;
        const maxX = px + PLAYER_RADIUS;
        const minY = py - PLAYER_HALF_HEIGHT;
        const maxY = py + PLAYER_HALF_HEIGHT;

        const x0 = Math.floor(minX + COLLISION_EPS);
        const x1 = Math.floor(maxX - COLLISION_EPS);
        const y0 = Math.floor(minY + COLLISION_EPS);
        const y1 = Math.floor(maxY - COLLISION_EPS);

        for (let x = x0; x <= x1; x++) {
          for (let y = y0; y <= y1; y++) {
            if (isSolidBlock(x, y, blockZ)) {
              nextZ = blockZ - PLAYER_RADIUS - COLLISION_EPS;
              return nextZ;
            }
          }
        }
      } else {
        const minZ = nextZ - PLAYER_RADIUS;
        const blockZ = Math.floor(minZ + COLLISION_EPS);

        const minX = px - PLAYER_RADIUS;
        const maxX = px + PLAYER_RADIUS;
        const minY = py - PLAYER_HALF_HEIGHT;
        const maxY = py + PLAYER_HALF_HEIGHT;

        const x0 = Math.floor(minX + COLLISION_EPS);
        const x1 = Math.floor(maxX - COLLISION_EPS);
        const y0 = Math.floor(minY + COLLISION_EPS);
        const y1 = Math.floor(maxY - COLLISION_EPS);

        for (let x = x0; x <= x1; x++) {
          for (let y = y0; y <= y1; y++) {
            if (isSolidBlock(x, y, blockZ)) {
              nextZ = blockZ + 1 + PLAYER_RADIUS + COLLISION_EPS;
              return nextZ;
            }
          }
        }
      }

      return nextZ;
    };

    const resolveAxisY = (px: number, py: number, pz: number, dy: number) => {
      if (dy === 0) return { y: py, hit: false };
      let nextY = py + dy;

      if (dy > 0) {
        const maxY = nextY + PLAYER_HALF_HEIGHT;
        const blockY = Math.floor(maxY - COLLISION_EPS);

        const minX = px - PLAYER_RADIUS;
        const maxX = px + PLAYER_RADIUS;
        const minZ = pz - PLAYER_RADIUS;
        const maxZ = pz + PLAYER_RADIUS;

        const x0 = Math.floor(minX + COLLISION_EPS);
        const x1 = Math.floor(maxX - COLLISION_EPS);
        const z0 = Math.floor(minZ + COLLISION_EPS);
        const z1 = Math.floor(maxZ - COLLISION_EPS);

        for (let x = x0; x <= x1; x++) {
          for (let z = z0; z <= z1; z++) {
            if (isSolidBlock(x, blockY, z)) {
              nextY = blockY - PLAYER_HALF_HEIGHT - COLLISION_EPS;
              return { y: nextY, hit: true };
            }
          }
        }
      } else {
        const minY = nextY - PLAYER_HALF_HEIGHT;
        const blockY = Math.floor(minY + COLLISION_EPS);

        const minX = px - PLAYER_RADIUS;
        const maxX = px + PLAYER_RADIUS;
        const minZ = pz - PLAYER_RADIUS;
        const maxZ = pz + PLAYER_RADIUS;

        const x0 = Math.floor(minX + COLLISION_EPS);
        const x1 = Math.floor(maxX - COLLISION_EPS);
        const z0 = Math.floor(minZ + COLLISION_EPS);
        const z1 = Math.floor(maxZ - COLLISION_EPS);

        for (let x = x0; x <= x1; x++) {
          for (let z = z0; z <= z1; z++) {
            if (isSolidBlock(x, blockY, z)) {
              nextY = blockY + 1 + PLAYER_HALF_HEIGHT + COLLISION_EPS;
              return { y: nextY, hit: true };
            }
          }
        }
      }

      return { y: nextY, hit: false };
    };

    const px0 = meshRef.current.position.x;
    const py0 = meshRef.current.position.y;
    const pz0 = meshRef.current.position.z;

    const desiredDx = velocityRef.current.x * scaledDelta;
    const desiredDz = velocityRef.current.z * scaledDelta;
    const desiredDy = velocityRef.current.y * scaledDelta;

    // Horizontal movement with optional 1-block step-up
    let px = px0;
    let py = py0;
    let pz = pz0;

    const attemptMoveAtY = (testY: number) => {
      let tx = resolveAxisX(px, testY, pz, desiredDx);
      let tz = resolveAxisZ(tx, testY, pz, desiredDz);
      return { x: tx, z: tz, y: testY };
    };

    const moved = attemptMoveAtY(py);
    const blocked =
      (Math.abs(moved.x - (px + desiredDx)) > 1e-3) ||
      (Math.abs(moved.z - (pz + desiredDz)) > 1e-3);

    if (blocked) {
      const steppedY = py + STEP_HEIGHT;
      if (!collidesAt(px, steppedY, pz)) {
        const stepped = attemptMoveAtY(steppedY);
        // Only accept step if it actually helps movement and doesn't interpenetrate.
        if (!collidesAt(stepped.x, stepped.y, stepped.z)) {
          px = stepped.x;
          py = stepped.y;
          pz = stepped.z;
        } else {
          px = moved.x;
          pz = moved.z;
        }
      } else {
        px = moved.x;
        pz = moved.z;
      }
    } else {
      px = moved.x;
      pz = moved.z;
    }

    // Vertical movement (gravity/jump), then resolve collisions
    const yResult = resolveAxisY(px, py, pz, desiredDy);
    py = yResult.y;

    // If we hit something while moving down, we are grounded.
    if (desiredDy < 0 && yResult.hit) {
      velocityRef.current.y = 0;
      isGroundedRef.current = true;
    } else if (desiredDy > 0 && yResult.hit) {
      velocityRef.current.y = 0;
    } else {
      // Recompute grounded status if nearly still vertically.
      isGroundedRef.current = false;
    }

    // Extra grounding stabilization: if feet are barely above ground, snap down a tiny amount.
    if (!isGroundedRef.current) {
      const snap = resolveAxisY(px, py, pz, -COLLISION_EPS * 10);
      if (snap.hit) {
        py = snap.y;
        isGroundedRef.current = true;
        velocityRef.current.y = 0;
      }
    }

    meshRef.current.position.set(px, py, pz);

    // Update rotation based on movement direction
    if (moveX !== 0 || moveZ !== 0) {
      const angle = Math.atan2(moveX, moveZ);
      meshRef.current.rotation.y = angle;
      setRotation(angle);
    }

    // Attack animation (scale pulse)
    if (isPlayerAttacking) {
      attackAnimRef.current = Math.min(attackAnimRef.current + scaledDelta * 10, 1);
    } else {
      attackAnimRef.current = Math.max(attackAnimRef.current - scaledDelta * 5, 0);
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
