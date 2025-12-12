"use client";

import { useTutorialStore, type TutorialStepConfig } from "@/lib/stores/useTutorialStore";
import { Target, CheckCircle2 } from "lucide-react";

interface TutorialObjectiveProps {
  config: TutorialStepConfig;
  stepIndex: number;
  totalSteps: number;
}

export function TutorialObjective({
  config,
  stepIndex,
  totalSteps,
}: TutorialObjectiveProps) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40">
      <div className="bg-slate-900/90 border border-amber-500/50 rounded-lg px-6 py-3 shadow-xl backdrop-blur-sm">
        {/* Progress */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-amber-400 text-xs font-medium uppercase tracking-wider">
            Tutorial
          </span>
          <span className="text-slate-400 text-xs">
            Step {stepIndex + 1} of {totalSteps}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-64 h-1 bg-slate-700 rounded-full mb-3 overflow-hidden">
          <div
            className="h-full bg-amber-500 transition-all duration-500"
            style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>

        {/* Objective */}
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <span className="text-white font-medium">{config.objective}</span>
        </div>
      </div>
    </div>
  );
}
