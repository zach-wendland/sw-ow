"use client";

import { AlertCircle } from "lucide-react";

interface WebGLFallbackProps {
  error?: string;
}

export function WebGLFallback({ error }: WebGLFallbackProps) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-900">
      <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
      <h2 className="text-2xl font-bold text-white mb-2">WebGL Not Supported</h2>
      <p className="text-slate-400 text-center max-w-md mb-6">
        Your browser does not support WebGL, which is required to run this game.
      </p>
      {error && (
        <p className="text-slate-500 text-sm mb-4">
          Error: {error}
        </p>
      )}
      <div className="text-sm text-slate-500 space-y-1">
        <p className="font-medium text-slate-400">Try the following:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Update your browser to the latest version</li>
          <li>Enable hardware acceleration in browser settings</li>
          <li>Use Chrome, Firefox, or Edge</li>
          <li>Update your graphics drivers</li>
        </ul>
      </div>
    </div>
  );
}
