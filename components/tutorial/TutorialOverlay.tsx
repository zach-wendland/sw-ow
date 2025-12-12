"use client";

import { useEffect, useRef, useCallback } from "react";
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
const DETECTION_INTERVAL_MS = 200; // Check objectives every 200ms instead of every frame

export function TutorialOverlay() {
  const isActive = useTutorialStore(selectTutorialActive);
  const currentStep = useTutorialStore(selectCurrentStep);
  const showDialog = useTutorialStore(selectShowDialog);
  const nextStep = useTutorialStore((state) => state.nextStep);
  const setShowDialog = useTutorialStore((state) => state.setShowDialog);
  const setStartPosition = useTutorialStore((state) => state.setStartPosition);
  const startPosition = useTutorialStore((state) => state.startPosition);
  const getStepIndex = useTutorialStore((state) => state.getStepIndex);

  // Track if step objectives have been met
  const objectiveMetRef = useRef(false);
  const initialCombatLogLengthRef = useRef(0);

  // Reset objective tracker when step changes
  useEffect(() => {
    objectiveMetRef.current = false;
    // Record initial combat log length for combat step detection
    initialCombatLogLengthRef.current = useCombatStore.getState().combatLog.length;
  }, [currentStep]);

  // Record start position when movement step begins
  useEffect(() => {
    if (currentStep === "movement" && !startPosition) {
      const pos = usePlayerStore.getState().position;
      setStartPosition({ x: pos.x, z: pos.z });
    }
  }, [currentStep, startPosition, setStartPosition]);

  // Polling-based objective detection (prevents re-render storm)
  // Instead of subscribing to position/stamina/combo (which update every frame),
  // we poll the stores at a fixed interval
  useEffect(() => {
    if (!isActive || showDialog || objectiveMetRef.current) return;

    const checkObjective = () => {
      if (objectiveMetRef.current) return;

      // Get current state directly from stores (no subscription)
      const playerState = usePlayerStore.getState();
      const combatState = useCombatStore.getState();
      const tutorialState = useTutorialStore.getState();

      switch (currentStep) {
        case "movement": {
          const start = tutorialState.startPosition;
          if (start) {
            const dx = playerState.position.x - start.x;
            const dz = playerState.position.z - start.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance > 5) {
              objectiveMetRef.current = true;
              setTimeout(() => nextStep(), 500);
            }
          }
          break;
        }

        case "combat": {
          if (combatState.combatLog.length > initialCombatLogLengthRef.current) {
            objectiveMetRef.current = true;
            setTimeout(() => nextStep(), 800);
          }
          break;
        }

        case "stamina": {
          const staminaPercent = (playerState.stats.stamina / playerState.stats.maxStamina) * 100;
          if (staminaPercent < 50) {
            objectiveMetRef.current = true;
            setTimeout(() => nextStep(), 500);
          }
          break;
        }

        case "combo": {
          if (combatState.comboCount >= 3) {
            objectiveMetRef.current = true;
            setTimeout(() => nextStep(), 500);
          }
          break;
        }
      }
    };

    // Initial check
    checkObjective();

    // Set up polling interval
    const interval = setInterval(checkObjective, DETECTION_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isActive, showDialog, currentStep, nextStep]);

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
