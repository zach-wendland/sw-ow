# Combat System Code Review

## Executive Summary

This review analyzes the combat system implementation across 8 core files, evaluating game design, enemy AI, combat feel, and player feedback mechanisms. The assessment draws from successful Star Wars games (Jedi: Fallen Order, KOTOR, Battlefront II) and modern action RPGs to provide actionable improvement recommendations.

---

## 1. Game Design and Star Wars-Inspired Mechanics Assessment

### Current Implementation Analysis

#### Strengths
- **Alignment System**: The `-100 to +100` alignment scale in `usePlayerStore.ts` mirrors KOTOR's light/dark side mechanic, a beloved Star Wars RPG staple
- **Attribute-Based Scaling**: Strength, dexterity, intelligence, vitality system follows classic Bioware RPG design
- **Combo System**: The combo mechanic with timeout (`COMBO_TIMEOUT = 3000ms`) and damage bonus (`5% per combo, max 50%`) encourages aggressive play similar to Jedi: Fallen Order

#### Gaps Identified

1. **No Force Powers Integration**
   - The alignment system exists but has no mechanical impact on combat
   - Star Wars games thrive on Force ability choices affecting gameplay

2. **Missing Defensive Mechanics**
   - No blocking, parrying, or dodging system
   - Jedi: Fallen Order's success heavily relied on its parry/deflect timing window
   - Current implementation is attack-spam focused

3. **No Enemy Stagger/Hitstun System**
   - Enemies continue attacking regardless of being hit
   - Breaks combat flow and reduces impact feel

4. **Limited Combat Actions**
   - Only basic attack exists (`KeyF` or left-click)
   - No heavy attacks, Force abilities, or special moves

### Technical Implementation Recommendations

```typescript
// Suggested additions to types/enemies.ts
export interface EnemyTypeConfig {
  // ... existing fields
  staggerThreshold: number;      // Damage needed to stagger
  staggerDuration: number;       // How long stagger lasts
  isForceResistant: boolean;     // Can resist Force powers
  weakness?: 'force' | 'melee' | 'ranged';
  attackPattern: AttackPattern[];
}

export interface AttackPattern {
  name: string;
  damage: number;
  range: number;
  windupTime: number;            // Telegraphing window
  recoveryTime: number;          // Punish window
  isBlockable: boolean;
  isParryable: boolean;
}
```

```typescript
// Suggested additions to useCombatStore.ts
interface CombatStore {
  // ... existing fields

  // Defensive actions
  isBlocking: boolean;
  isParrying: boolean;
  parryWindowActive: boolean;
  lastDodgeTime: number;

  // Force powers
  selectedForcePower: ForcePower | null;
  forcePowerCooldowns: Map<string, number>;

  // New actions
  startBlock: () => void;
  endBlock: () => void;
  attemptParry: () => { success: boolean; perfectParry: boolean };
  dodge: (direction: Vector3) => boolean;
  useForcePower: (power: ForcePower, target?: Enemy) => boolean;
}

// Parry window implementation
const PARRY_WINDOW_DURATION = 200;  // ms - tight timing like Sekiro
const PERFECT_PARRY_WINDOW = 50;     // ms - for bonus damage/stagger
```

---

## 2. Enemy AI Behavior and Balance Analysis

### Current AI State Machine Review

**File**: `components/game/entities/Enemy.tsx` (lines 54-129)

#### Current States
- `idle`: Detection range check only
- `chase`: Linear pursuit with basic pathfinding
- `attack`: Cooldown-based attacking
- `dead`: No behavior

#### Critical Issues

1. **Predictable Movement**
   ```typescript
   // Current implementation (line 67-75)
   const direction = playerPos.clone().sub(enemyPos).normalize();
   const moveDistance = config.speed * delta;
   ```
   - Enemies move directly toward player in straight lines
   - No obstacle avoidance or terrain consideration
   - Easily kited indefinitely

2. **No Attack Telegraphing**
   ```typescript
   // Current attack code (line 105-117)
   if (timeSinceLastAttack >= config.attackCooldown) {
     if (distanceToPlayer <= config.attackRange) {
       const damage = calculateEnemyDamage(enemy.type, 0);
       takeDamage(damage);  // Instant damage, no telegraph
     }
   }
   ```
   - Attacks are instant with no windup animation
   - Player has no reaction window
   - Contradicts modern action game design principles

3. **Static Aggro Range**
   - `detectionRange * 1.5` for losing aggro is too simplistic
   - No aggro transfer between enemies
   - No "alert" state for nearby enemies

4. **Missing Patrol Behavior**
   - `patrolRadius` and `patrolTarget` exist in types but are never used
   - Idle enemies just stand still

### Balance Concerns

| Enemy Type | Health | Damage | Speed | Assessment |
|------------|--------|--------|-------|------------|
| Slime | 30 | 5 | 2 | Appropriate cannon fodder |
| Wolf | 50 | 8 | 5 | High speed makes kiting difficult |
| Bandit | 80 | 12 | 4 | Balanced mid-tier |
| Skeleton | 60 | 10 | 3.5 | Needs distinguishing mechanic |
| Golem | 200 | 25 | 2 | Good tank archetype, needs wind-up attacks |

### Recommended AI Improvements

```typescript
// Enhanced AI state machine
export type EnemyState =
  | 'idle'
  | 'patrol'
  | 'alert'      // New: heard/saw something suspicious
  | 'investigate' // New: moving to last known position
  | 'chase'
  | 'attack'
  | 'windup'     // New: telegraphing attack
  | 'recovery'   // New: vulnerable after attacking
  | 'staggered'  // New: hit reaction
  | 'dead';

// Attack with telegraph
case "attack":
  if (canStartAttack) {
    setEnemyState(enemy.id, "windup");
    // Start windup animation
    setTimeout(() => {
      if (enemy.state === "windup" && distanceToPlayer <= config.attackRange) {
        // Actually deal damage
        takeDamage(damage);
        setEnemyState(enemy.id, "recovery");
        // Recovery window for player to punish
        setTimeout(() => {
          setEnemyState(enemy.id, "chase");
        }, config.recoveryTime);
      }
    }, config.windupTime);
  }
  break;
```

```typescript
// Group behavior for pack enemies (wolves)
interface PackBehavior {
  packId: string;
  role: 'alpha' | 'flanker' | 'support';
  flankAngle: number;
}

// Alpha attacks directly, flankers circle around
function calculateFlankPosition(
  playerPos: Vector3,
  packCenter: Vector3,
  flankAngle: number
): Vector3 {
  // Position wolves to surround player
}
```

---

## 3. Combat Feel and Player Feedback

### Current Feedback Systems

#### Visual Feedback
- **Damage Numbers**: Implemented in `DamageNumber.tsx`
  - Float upward with `FLOAT_SPEED = 1.5`
  - Fade over `LIFETIME = 1500ms`
  - Color coding: red (damage), orange (critical), green (heal)
  - Critique: Numbers are small and lack impact

- **Enemy Selection**: Yellow emissive glow and ring indicator
  - Good visibility but static

- **Attack Animation**: Player scale pulse (`1 + 0.2` scale)
  - Minimal feedback, not satisfying

- **Enemy State Colors**:
  - Attack: Red emissive
  - Chase: Orange emissive
  - Dead: Opacity fade

#### Audio Feedback
- **NOT IMPLEMENTED** - Major gap
- No attack sounds, hit sounds, or enemy vocalizations

#### Haptic/Screen Effects
- **NOT IMPLEMENTED**
- No screen shake, hit pause (hitstop), or camera effects

### Star Wars Game Feedback Reference

**Jedi: Fallen Order** techniques:
1. **Hitstop**: 2-3 frame pause on lightsaber contact
2. **Camera Shake**: Scaled to damage dealt
3. **Slow Motion**: On parries and critical hits
4. **Particle Effects**: Sparks, slash trails
5. **Directional Indicators**: Show incoming attack direction

### Technical Implementation for Improved Feel

```typescript
// Add to useCombatStore.ts
interface CombatStore {
  // ... existing

  // Screen effects
  screenShakeIntensity: number;
  hitStopFrames: number;
  slowMotionScale: number;

  // Actions
  triggerHitStop: (frames: number) => void;
  triggerScreenShake: (intensity: number, duration: number) => void;
  triggerSlowMotion: (scale: number, duration: number) => void;
}

const HITSTOP_FRAMES = 3;
const CRIT_HITSTOP_FRAMES = 6;
const KILL_SLOWMO_DURATION = 300; // ms
const KILL_SLOWMO_SCALE = 0.3;

// Implementation
triggerHitStop: (frames) => {
  set({ hitStopFrames: frames });
  // Pause game time
  const pauseDuration = frames * (1000 / 60);
  setTimeout(() => {
    set({ hitStopFrames: 0 });
  }, pauseDuration);
},

triggerScreenShake: (intensity, duration) => {
  set({ screenShakeIntensity: intensity });
  setTimeout(() => {
    set({ screenShakeIntensity: 0 });
  }, duration);
},
```

```typescript
// Enhanced damage number component
interface DamageNumberConfig {
  amount: number;
  position: Position;
  isCritical: boolean;
  isHeal: boolean;
  isKillingBlow: boolean;  // NEW: bigger effect
  damageType: 'physical' | 'force' | 'blaster';  // NEW: color coding
}

// Add scale animation for critical hits
const getScale = () => {
  if (isKillingBlow) return 'scale-150 animate-bounce';
  if (isCritical) return 'scale-125 animate-pulse';
  return 'scale-100';
};
```

---

## 4. Engagement Improvement Recommendations

### Priority 1: Core Combat Feel (High Impact, Medium Effort)

1. **Implement Hitstop**
   - Pause time for 2-3 frames on hit
   - Longer pause on critical hits and kills
   - Reference: Every successful action game uses this

2. **Add Attack Windup to Enemies**
   - 300-500ms telegraph before enemy attacks
   - Visual cue (color flash, raised weapon pose)
   - Creates timing-based gameplay

3. **Implement Blocking/Parry**
   - Hold to block, tap to parry
   - Parry window: 150-200ms
   - Successful parry staggers enemy

4. **Add Sound Effects**
   - Minimum: attack whoosh, hit impact, enemy death
   - Star Wars specific: lightsaber hum, blaster bolts

### Priority 2: Enemy Variety (High Impact, Medium Effort)

1. **Implement Patrol Behavior**
   - Use existing `patrolRadius` and `patrolTarget` fields
   - Makes world feel alive

2. **Add Enemy Attack Patterns**
   - Light attack: Fast, blockable
   - Heavy attack: Slow, unblockable, must dodge
   - Combo: Chain of attacks with recovery window

3. **Group AI**
   - Pack behavior for wolves
   - Flanking for bandits
   - Support calls for reinforcements

### Priority 3: Progression Feel (Medium Impact, Low Effort)

1. **More Impactful Level Ups**
   - Screen flash, sound effect
   - Temporary invincibility during level-up

2. **Combo Multiplier UI**
   - Show current combo count prominently
   - Bonus damage indicator

3. **Kill Streak Rewards**
   - Bonus XP for quick successive kills
   - Special animations/effects for streaks

### Priority 4: Star Wars Identity (High Impact, High Effort)

1. **Force Powers System**
   ```typescript
   interface ForcePower {
     id: string;
     name: string;
     manaCost: number;
     cooldown: number;
     alignmentRequirement?: number;  // Positive = light, negative = dark
     effect: (target: Enemy | Position) => void;
   }

   const FORCE_POWERS: Record<string, ForcePower> = {
     push: {
       id: 'force_push',
       name: 'Force Push',
       manaCost: 20,
       cooldown: 5000,
       effect: (target) => {
         // Knockback enemies in cone
       }
     },
     lightning: {
       id: 'force_lightning',
       name: 'Force Lightning',
       manaCost: 35,
       cooldown: 8000,
       alignmentRequirement: -30,  // Dark side only
       effect: (target) => {
         // Chain damage to nearby enemies
       }
     },
     heal: {
       id: 'force_heal',
       name: 'Force Heal',
       manaCost: 40,
       cooldown: 15000,
       alignmentRequirement: 30,  // Light side only
       effect: () => {
         // Restore health
       }
     }
   };
   ```

2. **Lightsaber Combat**
   - Clash system when both attacking simultaneously
   - Blade lock mini-game
   - Deflect blaster bolts

---

## 5. Code Quality Assessment

### Architecture Strengths
- Clean separation of concerns (stores, components, types)
- Zustand with `subscribeWithSelector` enables efficient re-renders
- TypeScript interfaces are well-defined

### Technical Debt Identified

1. **Performance Concern** - `Enemy.tsx` line 239:
   ```typescript
   const enemies = useEnemyStore((state) => state.getEnemiesArray());
   ```
   - Creates new array every render
   - Should memoize or use stable selector

2. **State Duplication**:
   - Enemy position stored in both store AND mesh.position
   - Potential for desync

3. **Magic Numbers**:
   - Constants scattered across files
   - Should centralize in config file

4. **Missing Error Boundaries**:
   - No handling for combat calculation edge cases

### Recommended Refactors

```typescript
// Create centralized combat config
// lib/config/combat.ts
export const COMBAT_CONFIG = {
  player: {
    baseAttackCooldown: 0.6,
    attackRange: 3,
    attackStaminaCost: 10,
    baseWeaponDamage: 10,
  },
  combo: {
    timeout: 3000,
    bonusPerHit: 0.05,
    maxBonus: 0.5,
  },
  critical: {
    baseChance: 0.15,
    multiplier: 2,
  },
  defense: {
    parryWindow: 200,
    perfectParryWindow: 50,
    blockDamageReduction: 0.7,
    dodgeIFrames: 300,
  },
  feedback: {
    hitStopFrames: 3,
    critHitStopFrames: 6,
    killSlowMoDuration: 300,
    killSlowMoScale: 0.3,
    damageNumberLifetime: 1500,
  }
} as const;
```

---

## 6. Research Citations and References

### Successful Star Wars Combat Systems

1. **Star Wars Jedi: Fallen Order / Survivor** (Respawn Entertainment)
   - Souls-like combat with parry timing
   - Force powers as combat multipliers
   - Meditation points for difficulty/progression
   - Source: GDC 2020 - "Designing Lightsaber Combat"

2. **Knights of the Old Republic I/II** (BioWare/Obsidian)
   - D20-based combat with real-time pause
   - Force power trees based on alignment
   - Companion synergy systems
   - Reference for alignment-locked abilities

3. **Star Wars Battlefront II** (DICE)
   - Hero abilities with cooldowns
   - Stamina-based blocking for lightsaber heroes
   - Card-based loadout customization

### Modern Action RPG Combat References

4. **God of War (2018)** - Combo system, hit reactions
5. **Sekiro: Shadows Die Twice** - Posture/stagger system
6. **Hades** - Fast-paced feedback, dash-canceling
7. **Dark Souls series** - Stamina management, enemy telegraphs

---

## 7. Implementation Roadmap

### Phase 1: Combat Feel (Week 1-2)
- [ ] Add hitstop system
- [ ] Implement enemy attack telegraphs
- [ ] Add basic sound effects
- [ ] Screen shake on hits

### Phase 2: Defensive Options (Week 3-4)
- [ ] Implement blocking
- [ ] Add parry with timing window
- [ ] Create dodge/roll mechanic
- [ ] Stamina cost for defensive actions

### Phase 3: Enemy Enhancement (Week 5-6)
- [ ] Patrol behavior AI
- [ ] Stagger/hitstun system
- [ ] Attack patterns per enemy type
- [ ] Group behavior for pack enemies

### Phase 4: Star Wars Identity (Week 7-8)
- [ ] Force Push/Pull abilities
- [ ] Alignment-locked powers
- [ ] Force meter UI
- [ ] Lightsaber visual effects

---

## File References

| File | Lines | Key Concerns |
|------|-------|--------------|
| `types/enemies.ts` | 164 | Missing stagger, attack patterns |
| `lib/stores/useEnemyStore.ts` | 259 | Good structure, needs stagger state |
| `lib/stores/useCombatStore.ts` | 272 | Missing defensive actions |
| `components/game/entities/Enemy.tsx` | 249 | AI too simple, no telegraphs |
| `components/game/entities/Player.tsx` | 246 | Only basic attack, needs defense |
| `components/game/effects/DamageNumber.tsx` | 89 | Functional but underwhelming |
| `components/game/canvas/Scene.tsx` | 87 | Static spawns, needs spawn system |
| `components/game/canvas/GameCanvas.tsx` | 57 | Good keyboard setup |
| `lib/stores/usePlayerStore.ts` | 603 | Solid foundation for progression |

---

*Review conducted: 2025-12-11*
*Reviewer: Claude (Star Wars Gaming Specialist)*
