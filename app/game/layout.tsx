import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SW-OW | Play",
  description: "Enter the game world",
};

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="game-mode h-screen w-screen overflow-hidden bg-black">
      {children}
    </div>
  );
}
