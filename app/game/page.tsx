"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { usePlayerStore } from "@/lib/stores/usePlayerStore";
import { useTutorialStore, selectHasCompletedTutorial } from "@/lib/stores/useTutorialStore";
import { HUD } from "@/components/hud/HUD";
import { LoadingScreen } from "@/components/game/LoadingScreen";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";

// Dynamic import for R3F Canvas to avoid SSR issues
const GameCanvas = dynamic(
  () => import("@/components/game/canvas/GameCanvas").then((mod) => mod.GameCanvas),
  {
    ssr: false,
    loading: () => <LoadingScreen />,
  }
);

export default function GamePage() {
  const router = useRouter();
  const { isLoading: authLoading, activeCharacterId } = useAuth();
  const { loadCharacter, characterId, isLoading: charLoading, autoSave, saveCharacter } = usePlayerStore();
  const hasCompletedTutorial = useTutorialStore(selectHasCompletedTutorial);
  const startTutorial = useTutorialStore((state) => state.startTutorial);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [tutorialChecked, setTutorialChecked] = useState(false);

  // Load character on mount
  useEffect(() => {
    const load = async () => {
      // If we have an active character selected but not loaded
      if (activeCharacterId && !characterId) {
        const success = await loadCharacter(activeCharacterId);
        if (!success) {
          setLoadError("Failed to load character. Please try again.");
        }
      }
    };

    load();
  }, [activeCharacterId, characterId, loadCharacter]);

  // Start tutorial if not completed (runs once after character loads)
  useEffect(() => {
    if (characterId && !tutorialChecked) {
      setTutorialChecked(true);
      if (!hasCompletedTutorial) {
        // Small delay to let the game fully load
        setTimeout(() => {
          startTutorial();
        }, 500);
      }
    }
  }, [characterId, hasCompletedTutorial, tutorialChecked, startTutorial]);

  // Auto-save interval
  useEffect(() => {
    const interval = setInterval(() => {
      autoSave();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [autoSave]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveCharacter();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveCharacter]);

  // Show loading states
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // No character selected - redirect to character select
  if (!activeCharacterId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">No character selected</p>
        <Button onClick={() => router.push("/characters")}>
          Select Character
        </Button>
      </div>
    );
  }

  // Character loading
  if (charLoading || !characterId) {
    return <LoadingScreen message="Loading character..." />;
  }

  // Load error
  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-destructive">{loadError}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/characters")}>
            Back to Characters
          </Button>
          <Button onClick={() => {
            setLoadError(null);
            loadCharacter(activeCharacterId);
          }}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Suspense fallback={<LoadingScreen />}>
        <GameCanvas />
      </Suspense>
      <HUD />
    </>
  );
}
