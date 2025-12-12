"use client";

import { useUIStore } from "@/lib/stores/useUIStore";
import { HealthBar } from "./HealthBar";
import { StaminaBar } from "./StaminaBar";
import { XPBar } from "./XPBar";
import { QuestTracker } from "./QuestTracker";
import { Minimap } from "./Minimap";
import { Crosshair } from "./Crosshair";
import { PauseMenu } from "./PauseMenu";
import { Notifications } from "./Notifications";
import { TutorialOverlay } from "../tutorial/TutorialOverlay";

export function HUD() {
  const { showHUD, showMinimap, showQuestTracker, isPaused, activeMenu } =
    useUIStore();

  if (!showHUD) return null;

  return (
    <div className="hud-overlay">
      {/* Top Left - Player Stats */}
      <div className="absolute left-4 top-4 space-y-2 hud-interactive">
        <HealthBar />
        <StaminaBar />
        <XPBar />
      </div>

      {/* Top Right - Minimap */}
      {showMinimap && (
        <div className="absolute right-4 top-4 hud-interactive">
          <Minimap />
        </div>
      )}

      {/* Right Side - Quest Tracker */}
      {showQuestTracker && (
        <div className="absolute right-4 top-48 hud-interactive">
          <QuestTracker />
        </div>
      )}

      {/* Center - Crosshair */}
      <Crosshair />

      {/* Bottom Center - Notifications */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
        <Notifications />
      </div>

      {/* Bottom - Controls Hint */}
      <div className="absolute bottom-4 left-4 text-xs text-white/50">
        <p>WASD - Move | Space - Jump | Shift - Sprint | E - Interact | ESC - Menu</p>
      </div>

      {/* Pause Menu Overlay */}
      {isPaused && activeMenu === "settings" && <PauseMenu />}

      {/* Tutorial Overlay */}
      <TutorialOverlay />
    </div>
  );
}
