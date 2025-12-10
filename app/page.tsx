"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Gamepad2, Globe, Sword, Users } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/stars.png')] opacity-30" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                SW-OW
              </span>
            </h1>
            <p className="mt-4 text-xl text-slate-300">
              An Open World Adventure Awaits
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
              Explore vast planets, complete quests, battle enemies, and forge your
              own path in this browser-based 3D open world experience.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/game">
                <Button size="lg" className="gap-2">
                  <Gamepad2 className="h-5 w-5" />
                  Play Now
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="gap-2">
                <Users className="h-5 w-5" />
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
            <CardHeader>
              <Globe className="h-10 w-10 text-blue-400" />
              <CardTitle className="text-white">Open World</CardTitle>
              <CardDescription>
                Explore multiple planets with unique environments, from lush
                forests to barren deserts.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
            <CardHeader>
              <Sword className="h-10 w-10 text-red-400" />
              <CardTitle className="text-white">Combat System</CardTitle>
              <CardDescription>
                Engage in real-time combat with various weapons and abilities.
                Master your skills to defeat powerful enemies.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
            <CardHeader>
              <Users className="h-10 w-10 text-green-400" />
              <CardTitle className="text-white">Quest System</CardTitle>
              <CardDescription>
                Take on quests from NPCs across the galaxy. Make choices that
                shape your character&apos;s alignment.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* System Status */}
      <div className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">System Status</CardTitle>
            <CardDescription>
              Backend API and game services status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-slate-300">All systems operational</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              API Endpoint: <code className="text-blue-400">/api/py/health</code>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="text-center text-sm text-slate-500">
            Built with Next.js, Three.js, FastAPI, and Supabase
          </p>
        </div>
      </footer>
    </main>
  );
}
