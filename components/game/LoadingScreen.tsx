"use client";

import { Progress } from "@/components/ui/progress";

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
  progress?: number;
}

export function LoadingScreen({
  message = "Loading game assets...",
  subMessage = "Initializing WebGL renderer...",
  progress = 33,
}: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-white">
          <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            SW-OW
          </span>
        </h1>
        <p className="mb-8 text-slate-400">{message}</p>
        <div className="w-64">
          <Progress value={progress} className="h-2" />
        </div>
        <p className="mt-4 text-sm text-slate-500">
          {subMessage}
        </p>
      </div>
    </div>
  );
}
