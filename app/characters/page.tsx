"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type CharacterSummary } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Loader2,
  Plus,
  Play,
  Trash2,
  Clock,
  MapPin,
  Sword,
  Shield,
  Brain,
  Heart,
} from "lucide-react";

// ============================================================================
// CHARACTER SLOT COMPONENT
// ============================================================================

interface CharacterSlotProps {
  character: CharacterSummary | null;
  slotNumber: number;
  onSelect: (character: CharacterSummary) => void;
  onCreate: (slotNumber: number) => void;
  onDelete: (character: CharacterSummary) => void;
}

function CharacterSlot({
  character,
  slotNumber,
  onSelect,
  onCreate,
  onDelete,
}: CharacterSlotProps) {
  if (!character) {
    return (
      <Card
        className="cursor-pointer border-dashed border-2 border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30 transition-all duration-200"
        onClick={() => onCreate(slotNumber)}
      >
        <CardContent className="flex flex-col items-center justify-center h-48 gap-2">
          <div className="p-3 bg-muted rounded-full">
            <Plus className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Create Character</p>
          <p className="text-xs text-muted-foreground/60">Slot {slotNumber}</p>
        </CardContent>
      </Card>
    );
  }

  const playTimeHours = Math.floor(character.totalPlayTime / 3600);
  const playTimeMinutes = Math.floor((character.totalPlayTime % 3600) / 60);

  return (
    <Card className="hover:border-primary/50 transition-all duration-200 group">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{character.name}</CardTitle>
            <CardDescription>Level {character.level}</CardDescription>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(character);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="capitalize">{character.currentZone.replace(/_/g, " ")}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            {playTimeHours}h {playTimeMinutes}m played
          </span>
        </div>

        <Button className="w-full mt-2" onClick={() => onSelect(character)}>
          <Play className="mr-2 h-4 w-4" />
          Play
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// CREATE CHARACTER DIALOG
// ============================================================================

interface CreateCharacterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (name: string, attributes: { strength: number; dexterity: number; intelligence: number; vitality: number }) => void;
}

function CreateCharacterDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateCharacterDialogProps) {
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Attribute points (total 40, min 8 each, max 15 each)
  const [strength, setStrength] = useState(10);
  const [dexterity, setDexterity] = useState(10);
  const [intelligence, setIntelligence] = useState(10);
  const [vitality, setVitality] = useState(10);

  const totalPoints = strength + dexterity + intelligence + vitality;
  const pointsRemaining = 40 - totalPoints;

  const handleCreate = () => {
    if (!name.trim() || pointsRemaining !== 0) return;

    setIsCreating(true);

    // Create character via context
    onCreated(name.trim(), { strength, dexterity, intelligence, vitality });

    // Reset form
    setName("");
    setStrength(10);
    setDexterity(10);
    setIntelligence(10);
    setVitality(10);
    setIsCreating(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Character</DialogTitle>
          <DialogDescription>
            Create a new character for your adventure
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Character Name */}
          <div className="space-y-2">
            <Label htmlFor="charName">Character Name</Label>
            <Input
              id="charName"
              placeholder="Enter name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              maxLength={30}
            />
          </div>

          {/* Attribute Points */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Attribute Points</Label>
              <span
                className={`text-sm ${pointsRemaining === 0 ? "text-green-500" : "text-orange-400"}`}
              >
                {pointsRemaining} remaining
              </span>
            </div>

            {/* Strength */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Sword className="h-4 w-4 text-red-400" />
                  Strength
                </span>
                <span className="font-mono">{strength}</span>
              </div>
              <Slider
                value={[strength]}
                onValueChange={([v]) => setStrength(v)}
                min={8}
                max={15}
                step={1}
                className="py-2"
              />
            </div>

            {/* Dexterity */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-400" />
                  Dexterity
                </span>
                <span className="font-mono">{dexterity}</span>
              </div>
              <Slider
                value={[dexterity]}
                onValueChange={([v]) => setDexterity(v)}
                min={8}
                max={15}
                step={1}
                className="py-2"
              />
            </div>

            {/* Intelligence */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-blue-400" />
                  Intelligence
                </span>
                <span className="font-mono">{intelligence}</span>
              </div>
              <Slider
                value={[intelligence]}
                onValueChange={([v]) => setIntelligence(v)}
                min={8}
                max={15}
                step={1}
                className="py-2"
              />
            </div>

            {/* Vitality */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-pink-400" />
                  Vitality
                </span>
                <span className="font-mono">{vitality}</span>
              </div>
              <Slider
                value={[vitality]}
                onValueChange={([v]) => setVitality(v)}
                min={8}
                max={15}
                step={1}
                className="py-2"
              />
            </div>
          </div>

          {/* Stat Preview */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
            <p className="text-muted-foreground">Starting Stats:</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-red-400">HP:</span> {100 + vitality * 5}
              </div>
              <div>
                <span className="text-green-400">SP:</span> {100 + dexterity * 2}
              </div>
              <div>
                <span className="text-blue-400">MP:</span> {50 + intelligence * 3}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || pointsRemaining !== 0 || !name.trim()}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Character"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function CharacterSelectPage() {
  const router = useRouter();
  const {
    isLoading,
    characters,
    selectCharacter,
    createNewCharacter,
    deleteCharacterById,
  } = useAuth();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CharacterSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create slot array (1-5) with characters mapped
  const slots = [1, 2, 3, 4, 5].map((slotNum) => ({
    slotNumber: slotNum,
    character: characters.find((c) => c.slotNumber === slotNum) || null,
  }));

  const handleSelect = (character: CharacterSummary) => {
    selectCharacter(character.id);
    router.push("/game");
  };

  const handleCreate = (name: string, attributes: { strength: number; dexterity: number; intelligence: number; vitality: number }) => {
    createNewCharacter(name, attributes);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    deleteCharacterById(deleteTarget.id);
    setDeleteTarget(null);
    setIsDeleting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <h2 className="text-xl font-bold">SW-OW</h2>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Select Your Character</h1>
            <p className="text-muted-foreground mt-2">
              Choose a character to continue your journey, or create a new one
            </p>
          </div>

          {/* Character Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {slots.map(({ slotNumber, character }) => (
              <CharacterSlot
                key={slotNumber}
                character={character}
                slotNumber={slotNumber}
                onSelect={handleSelect}
                onCreate={() => setCreateDialogOpen(true)}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Create Character Dialog */}
      <CreateCharacterDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={handleCreate}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Character</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
