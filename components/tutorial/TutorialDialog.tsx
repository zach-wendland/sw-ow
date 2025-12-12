"use client";

import { useEffect, useState } from "react";
import { useTutorialStore, type TutorialStepConfig } from "@/lib/stores/useTutorialStore";
import { MessageCircle } from "lucide-react";

interface TutorialDialogProps {
  config: TutorialStepConfig;
  onContinue: () => void;
}

export function TutorialDialog({ config, onContinue }: TutorialDialogProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  const fullText = config.dialogText || "";

  // Typewriter effect
  useEffect(() => {
    setDisplayedText("");
    setIsTyping(true);

    if (!fullText) {
      setIsTyping(false);
      return;
    }

    let index = 0;
    const interval = setInterval(() => {
      if (index < fullText.length) {
        setDisplayedText(fullText.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 30); // 30ms per character

    return () => clearInterval(interval);
  }, [fullText]);

  // Skip typing animation on click
  const handleSkipTyping = () => {
    if (isTyping) {
      setDisplayedText(fullText);
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="max-w-2xl w-full mx-4 bg-slate-900/95 border-2 border-amber-500/50 rounded-lg shadow-2xl overflow-hidden"
        onClick={handleSkipTyping}
      >
        {/* Header */}
        <div className="bg-amber-500/20 px-6 py-3 border-b border-amber-500/30">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-amber-400" />
            <span className="text-amber-400 font-semibold">
              {config.dialogSpeaker || "Tutorial"}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-2">{config.title}</h2>
          <p className="text-slate-400 text-sm mb-4">{config.description}</p>

          {/* Dialog text with typewriter */}
          <div className="bg-slate-800/50 rounded-lg p-4 min-h-[100px]">
            <p className="text-white text-lg leading-relaxed">
              {displayedText}
              {isTyping && (
                <span className="inline-block w-2 h-5 bg-amber-400 ml-1 animate-pulse" />
              )}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 flex justify-end">
          <button
            onClick={onContinue}
            disabled={isTyping}
            className={`
              px-6 py-2 rounded-lg font-semibold transition-all
              ${
                isTyping
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-amber-500 text-black hover:bg-amber-400 active:scale-95"
              }
            `}
          >
            {isTyping ? "..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
