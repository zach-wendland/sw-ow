"use client";

import { ScrollText, ChevronRight } from "lucide-react";

// Placeholder quest data - will be replaced with Zustand store
const MOCK_QUESTS = [
  {
    id: "1",
    title: "Explore the World",
    objectives: [
      { id: "1a", text: "Visit the mountain region", completed: false },
      { id: "1b", text: "Find the ancient ruins", completed: false },
    ],
  },
];

export function QuestTracker() {
  const activeQuest = MOCK_QUESTS[0];

  if (!activeQuest) return null;

  return (
    <div className="w-64 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border-b border-white/10">
        <ScrollText className="h-4 w-4 text-yellow-500" />
        <span className="text-sm font-medium text-white/90">Active Quest</span>
      </div>

      {/* Quest Content */}
      <div className="p-3">
        <h4 className="text-sm font-medium text-white mb-2">
          {activeQuest.title}
        </h4>
        <ul className="space-y-1.5">
          {activeQuest.objectives.map((objective) => (
            <li
              key={objective.id}
              className={`flex items-start gap-2 text-xs ${
                objective.completed ? "text-white/40 line-through" : "text-white/70"
              }`}
            >
              <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>{objective.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
