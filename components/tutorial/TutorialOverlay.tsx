"use client";

import { useEffect, useRef } from "react";
import {
  useTutorialStore,
  selectTutorialActive,
  selectCurrentStep,
  selectShowDialog,
  TUTORIAL_STEP_CONFIGS,
} from "@/lib/stores/useTutorialStore";
import { usePlayerStore } from "@/lib/stores/usePlayerStore";
import { useCombatStore } from "@/lib/stores/useCombatStore";
import { TutorialDialog } from "./TutorialDialog";
import { TutorialObjective } from "./TutorialObjective";

const TOTAL_STEPS = 6;

export function TutorialOverlay() {
  const isActive = useTutorialStore(selectTutorialActive);
  const currentStep = useTutorialStore(selectCurrentStep);
  const showDialog = useTutorialStore(selectShowDialog);
  const nextStep = useTutorialStore((state) => state.nextStep);
  const setShowDialog = useTutorialStore((state) => state.setShowDialog);
  const setStartPosition = useTutorialStore((state) => state.setStartPosition);
  const startPosition = useTutorialStore((state) => state.startPosition);
  const getStepIndex = useTutorialStore((state) => state.getStepIndex);

  // Player state for detection
  const playerPosition = usePlayerStore((state) => state.position);
  const playerStamina = usePlayerStore((state) => state.stats.stamina);
  const playerMaxStamina = usePlayerStore((state) => state.stats.maxStamina);

  // Combat state for detection
  const comboCount = useCombatStore((state) => state.comboCount);
  const combatLogLength = useCombatStore((state) => state.combatLog.length);

  // Track if step objectives have been met
  const objectiveMetRef = useRef(false);
  const initialCombatLogLengthRef = useRef(0);

  // Reset objective tracker when step changes
  useEffect(() => {
    objectiveMetRef.current = false;
    // Record initial combat log length for combat step detection
    initialCombatLogLengthRef.current = combatLogLength;
  }, [currentStep]);

  // Record start position when movement step begins
  useEffect(() => {
    if (currentStep === "movement" && !startPosition) {
      setStartPosition({ x: playerPosition.x, z: playerPosition.z });
    }
  }, [currentStep, startPosition, playerPosition, setStartPosition]);

  // Step completion detection
  useEffect(() => {
    if (!isActive || showDialog || objectiveMetRef.current) return;

    switch (currentStep) {
      case "movement": {
        // Check if player moved > 5 units from start
        if (startPosition) {
          const dx = playerPosition.x - startPosition.x;
          const dz = playerPosition.z - startPosition.z;
          const distance = Math.sqrt(dx * dx + dz * dz);
          if (distance > 5) {
            objectiveMetRef.current = true;
            // Small delay before advancing
            setTimeout(() => nextStep(), 500);
          }
        }
        break;
      }

      case "combat": {
        // Check if player has dealt damage (combat log increased)
        if (combatLogLength > initialCombatLogLengthRef.current) {
          objectiveMetRef.current = true;
          setTimeout(() => nextStep(), 800);
        }
        break;
      }

      case "stamina": {
        // Check if stamina dropped below 50%
        const staminaPercent = (playerStamina / playerMaxStamina) * 100;
        if (staminaPercent < 50) {
          objectiveMetRef.current = true;
          setTimeout(() => nextStep(), 500);
        }
        break;
      }

      case "combo": {
        // Check if combo reached 3+
        if (comboCount >= 3) {
          objectiveMetRef.current = true;
          setTimeout(() => nextStep(), 500);
        }
        break;
      }
    }
  }, [
    isActive,
    showDialog,
    currentStep,
    playerPosition,
    startPosition,
    playerStamina,
    playerMaxStamina,
    comboCount,
    combatLogLength,
    nextStep,
  ]);

  // Handle dialog continue
  const handleContinue = () => {
    setShowDialog(false);

    // For welcome and complete steps, immediately advance
    if (currentStep === "welcome") {
      setTimeout(() => nextStep(), 100);
    } else if (currentStep === "complete") {
      // Tutorial finished
      nextStep();
    }
  };

  // Don't render if tutorial not active
  if (!isActive || !currentStep) return null;

  const config = TUTORIAL_STEP_CONFIGS[currentStep];
  const stepIndex = getStepIndex();

  return (
    <>
      {/* Dialog overlay */}
      {showDialog && config && (
        <TutorialDialog config={config} onContinue={handleContinue} />
      )}

      {/* Objective display (when dialog is closed) */}
      {!showDialog && config && (
        <TutorialObjective
          config={config}
          stepIndex={stepIndex}
          totalSteps={TOTAL_STEPS}
        />
      )}
    </>
  );
}
