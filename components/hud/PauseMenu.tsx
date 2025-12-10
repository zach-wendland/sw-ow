"use client";

import { useUIStore } from "@/lib/stores/useUIStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Settings, Save, Home, X } from "lucide-react";
import Link from "next/link";

export function PauseMenu() {
  const { closeMenu } = useUIStore();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm hud-interactive">
      <Card className="w-80 bg-slate-900/95 border-slate-700">
        <CardHeader className="relative">
          <CardTitle className="text-center text-white">Paused</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 text-white/60 hover:text-white"
            onClick={closeMenu}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={closeMenu}
          >
            <Play className="h-4 w-4" />
            Resume Game
          </Button>

          <Button variant="outline" className="w-full justify-start gap-3">
            <Save className="h-4 w-4" />
            Save Game
          </Button>

          <Button variant="outline" className="w-full justify-start gap-3">
            <Settings className="h-4 w-4" />
            Settings
          </Button>

          <Link href="/" className="block">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 text-red-400 hover:text-red-300"
            >
              <Home className="h-4 w-4" />
              Exit to Menu
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
