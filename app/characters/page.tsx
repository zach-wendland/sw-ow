"use client";

import { useEffect, useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { getSupabase } from "@/lib/supabase/client";
import {
  Loader2,
  Plus,
  Play,
  Trash2,
  User,
  Clock,
  MapPin,
  Sword,
  Shield,
  Brain,
  Heart,
  LogOut,
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

  const alignmentColor =
    character.alignment > 30
      ? "text-blue-400"
      : character.alignment < -30
        ? "text-red-400"
        : "text-gray-400";

  const alignmentLabel =
    character.alignment > 30
      ? "Light Side"
      : character.alignment < -30
        ? "Dark Side"
        : "Neutral";

  const playTimeHours = Math.floor(character.total_play_time_seconds / 3600);
  const playTimeMinutes = Math.floor((character.total_play_time_seconds % 3600) / 60);

  return (
    <Card className="hover:border-primary/50 transition-all duration-200 group">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{character.name}</CardTitle>
            <CardDescription className="flex items-center gap-1">
              Level {character.level}
              <span className={`ml-2 text-xs ${alignmentColor}`}>
                ({alignmentLabel})
              </span>
            </CardDescription>
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
          <span className="capitalize">{character.current_zone.replace(/_/g, " ")}</span>
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
  slotNumber: number;
  onCreated: () => void;
  playerId: string;
}

function CreateCharacterDialog({
  open,
  onOpenChange,
  slotNumber,
  onCreated,
  playerId,
}: CreateCharacterDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Attribute points (total 40, min 8 each, max 15 each)
  const [strength, setStrength] = useState(10);
  const [dexterity, setDexterity] = useState(10);
  const [intelligence, setIntelligence] = useState(10);
  const [vitality, setVitality] = useState(10);

  const totalPoints = strength + dexterity + intelligence + vitality;
  const pointsRemaining = 40 - totalPoints;

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for your character.",
        variant: "destructive",
      });
      return;
    }

    if (pointsRemaining !== 0) {
      toast({
        title: "Attribute Points",
        description: "Please allocate all attribute points before continuing.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const supabase = getSupabase();

      // Calculate initial stats
      const maxHealth = 100 + vitality * 5;
      const maxStamina = 100 + dexterity * 2;
      const maxMana = 50 + intelligence * 3;

      const { error } = await supabase.from("characters").insert({
        player_id: playerId,
        name: name.trim(),
        slot_number: slotNumber,
        strength,
        dexterity,
        intelligence,
        vitality,
        max_health: maxHealth,
        health: maxHealth,
        max_stamina: maxStamina,
        stamina: maxStamina,
        max_mana: maxMana,
        mana: maxMana,
      });

      if (error) throw error;

      toast({
        title: "Character Created!",
        description: `${name} is ready for adventure.`,
      });

      onCreated();
      onOpenChange(false);

      // Reset form
      setName("");
      setStrength(10);
      setDexterity(10);
      setIntelligence(10);
      setVitality(10);
    } catch (err) {
      console.error("Failed to create character:", err);
      toast({
        title: "Creation Failed",
        description: "Could not create character. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Character</DialogTitle>
          <DialogDescription>
            Create a new character in Slot {slotNumber}
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
              onChange={(e) => setName(e.target.value)}
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
          <Button onClick={handleCreate} disabled={isCreating || pointsRemaining !== 0}>
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
    isAuthenticated,
    isLoading,
    player,
    characters,
    selectCharacter,
    refreshCharacters,
    signOut,
  } = useAuth();
  const { toast } = useToast();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createSlot, setCreateSlot] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<CharacterSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Create slot array (1-5) with characters mapped
  const slots = [1, 2, 3, 4, 5].map((slotNum) => ({
    slotNumber: slotNum,
    character: characters.find((c) => c.slot_number === slotNum) || null,
  }));

  const handleSelect = (character: CharacterSummary) => {
    selectCharacter(character.id);
    router.push("/game");
  };

  const handleOpenCreate = (slotNumber: number) => {
    setCreateSlot(slotNumber);
    setCreateDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from("characters")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) throw error;

      toast({
        title: "Character Deleted",
        description: `${deleteTarget.name} has been deleted.`,
      });

      refreshCharacters();
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete character:", err);
      toast({
        title: "Delete Failed",
        description: "Could not delete character. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  if (isLoading || !player) {
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
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{player.display_name || player.username}</p>
              <p className="text-xs text-muted-foreground">@{player.username}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
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
                onCreate={handleOpenCreate}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Create Character Dialog */}
      {player && (
        <CreateCharacterDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          slotNumber={createSlot}
          onCreated={refreshCharacters}
          playerId={player.id}
        />
      )}

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
