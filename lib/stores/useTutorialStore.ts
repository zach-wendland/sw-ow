"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

// Tutorial steps in order
export type TutorialStep =
  | "welcome"
  | "movement"
  | "combat"
  | "stamina"
  | "combo"
  | "complete";

const TUTORIAL_STEPS: TutorialStep[] = [
  "welcome",
  "movement",
  "combat",
  "stamina",
  "combo",
  "complete",
];

// Step configuration for detection and UI
export interface TutorialStepConfig {
  title: string;
  description: string;
  objective: string;
  dialogText?: string;
  dialogSpeaker?: string;
}

export const TUTORIAL_STEP_CONFIGS: Record<TutorialStep, TutorialStepConfig> = {
  welcome: {
    title: "Welcome, Padawan",
    description: "Your training begins now.",
    objective: "Read the introduction",
    dialogText:
      "Welcome, young Padawan. The galaxy is in turmoil, and we need warriors like you. Let me teach you the ways of combat. Pay attention, for this knowledge may save your life.",
    dialogSpeaker: "Jedi Master",
  },
  movement: {
    title: "Basic Movement",
    description: "Learn to move through the battlefield.",
    objective: "Move around using WASD keys",
    dialogText:
      "First, you must learn to move. Use the W, A, S, D keys to navigate. Press SPACE to jump, and hold SHIFT to sprint. Try moving around now.",
    dialogSpeaker: "Jedi Master",
  },
  combat: {
    title: "Combat Training",
    description: "Face your first enemy.",
    objective: "Attack the enemy (F key or left-click)",
    dialogText:
      "An enemy approaches! Press F or left-click to attack. Strike true, young one.",
    dialogSpeaker: "Jedi Master",
  },
  stamina: {
    title: "Stamina Management",
    description: "Learn about your limits.",
    objective: "Deplete your stamina through combat",
    dialogText:
      "Watch your stamina bar - each attack costs energy. A wise warrior knows when to strike and when to recover.",
    dialogSpeaker: "Jedi Master",
  },
  combo: {
    title: "Combo Attacks",
    description: "Chain attacks for bonus damage.",
    objective: "Build a 3-hit combo",
    dialogText:
      "Strike quickly in succession to build combos. Each hit in a combo deals more damage. Show me you can chain 3 hits together!",
    dialogSpeaker: "Jedi Master",
  },
  complete: {
    title: "Training Complete",
    description: "You are ready for the real fight.",
    objective: "Begin your adventure",
    dialogText:
      "Excellent work, Padawan! You have learned the basics of combat. The galaxy awaits you. May the Force be with you, always.",
    dialogSpeaker: "Jedi Master",
  },
};

interface TutorialState {
  // State
  isActive: boolean;
  currentStep: TutorialStep | null;
  completedSteps: TutorialStep[];
  hasCompletedTutorial: boolean;
  showDialog: boolean;
  startPosition: { x: number; z: number } | null;

  // Actions
  startTutorial: () => void;
  completeStep: (step: TutorialStep) => void;
  nextStep: () => void;
  completeTutorial: () => void;
  resetTutorial: () => void;
  setShowDialog: (show: boolean) => void;
  setStartPosition: (pos: { x: number; z: number }) => void;

  // Helpers
  getCurrentStepConfig: () => TutorialStepConfig | null;
  getStepIndex: () => number;
}

// LocalStorage key for tutorial completion
const TUTORIAL_COMPLETED_KEY = "sw-ow-tutorial-completed";

// Check if tutorial was completed before
const getInitialCompletedState = (): boolean => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(TUTORIAL_COMPLETED_KEY) === "true";
};

export const useTutorialStore = create<TutorialState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    isActive: false,
    currentStep: null,
    completedSteps: [],
    hasCompletedTutorial: getInitialCompletedState(),
    showDialog: false,
    startPosition: null,

    // Actions
    startTutorial: () => {
      set({
        isActive: true,
        currentStep: "welcome",
        completedSteps: [],
        showDialog: true,
      });
    },

    completeStep: (step: TutorialStep) => {
      const { completedSteps, currentStep } = get();

      // Only complete if it's the current step
      if (step !== currentStep) return;

      // Add to completed
      if (!completedSteps.includes(step)) {
        set({
          completedSteps: [...completedSteps, step],
        });
      }
    },

    nextStep: () => {
      const { currentStep, completedSteps } = get();
      if (!currentStep) return;

      // Mark current as completed
      if (!completedSteps.includes(currentStep)) {
        set({
          completedSteps: [...completedSteps, currentStep],
        });
      }

      // Find next step
      const currentIndex = TUTORIAL_STEPS.indexOf(currentStep);
      const nextIndex = currentIndex + 1;

      if (nextIndex >= TUTORIAL_STEPS.length) {
        // Tutorial complete
        get().completeTutorial();
      } else {
        const nextStep = TUTORIAL_STEPS[nextIndex];
        set({
          currentStep: nextStep,
          showDialog: true, // Show dialog for each new step
        });
      }
    },

    completeTutorial: () => {
      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(TUTORIAL_COMPLETED_KEY, "true");
      }

      set({
        isActive: false,
        currentStep: null,
        hasCompletedTutorial: true,
        showDialog: false,
      });
    },

    resetTutorial: () => {
      // Clear localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem(TUTORIAL_COMPLETED_KEY);
      }

      set({
        isActive: false,
        currentStep: null,
        completedSteps: [],
        hasCompletedTutorial: false,
        showDialog: false,
        startPosition: null,
      });
    },

    setShowDialog: (show: boolean) => {
      set({ showDialog: show });
    },

    setStartPosition: (pos: { x: number; z: number }) => {
      set({ startPosition: pos });
    },

    // Helpers
    getCurrentStepConfig: () => {
      const { currentStep } = get();
      if (!currentStep) return null;
      return TUTORIAL_STEP_CONFIGS[currentStep];
    },

    getStepIndex: () => {
      const { currentStep } = get();
      if (!currentStep) return -1;
      return TUTORIAL_STEPS.indexOf(currentStep);
    },
  }))
);

// Selectors for optimized subscriptions
export const selectTutorialActive = (state: TutorialState) => state.isActive;
export const selectCurrentStep = (state: TutorialState) => state.currentStep;
export const selectShowDialog = (state: TutorialState) => state.showDialog;
export const selectHasCompletedTutorial = (state: TutorialState) =>
  state.hasCompletedTutorial;
