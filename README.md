# SW-OW

A browser-based 3D open world RPG built with Next.js, Three.js, and React Three Fiber. The game runs entirely offline in your browser with all progress saved to localStorage.

## What is SW-OW?

SW-OW is a single-player open world adventure game featuring:

- **3D Open World Exploration** - Navigate a procedurally generated terrain with third-person camera controls
- **Real-time Combat System** - Attack enemies, deal damage, and watch floating damage numbers
- **Character Progression** - Create characters with customizable attributes (Strength, Dexterity, Intelligence, Vitality)
- **Multiple Character Slots** - Support for up to 5 different characters per browser
- **Persistent Save System** - All progress automatically saves to browser localStorage
- **HUD System** - Health, stamina, mana bars, XP tracker, minimap, and quest tracker

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend Framework | Next.js 14 (App Router) |
| 3D Rendering | Three.js + React Three Fiber |
| Physics | @react-three/rapier |
| State Management | Zustand |
| Styling | Tailwind CSS |
| UI Components | Radix UI + shadcn/ui |
| Persistence | Browser localStorage |
| Backend API | FastAPI (Python) |

## Project Structure

```
sw-ow/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Landing page
│   ├── characters/        # Character selection screen
│   └── game/              # Main game page
├── components/
│   ├── game/
│   │   ├── canvas/        # 3D canvas, scene, camera
│   │   ├── entities/      # Player, Enemy components
│   │   ├── effects/       # Damage numbers, particles
│   │   └── world/         # Terrain generation
│   ├── hud/               # Health bars, minimap, etc.
│   ├── providers/         # React context providers
│   └── ui/                # Reusable UI components
├── lib/
│   ├── stores/            # Zustand state stores
│   │   ├── usePlayerStore.ts
│   │   ├── useCombatStore.ts
│   │   └── useEnemyStore.ts
│   ├── storage/           # localStorage persistence
│   └── api/               # API client
├── api/                   # FastAPI Python backend
└── types/                 # TypeScript type definitions
```

## How It Works

### Game Loop
1. **Character Creation** - Players create characters with distributed attribute points
2. **World Loading** - Procedural terrain generates using simplex noise
3. **Player Control** - WASD movement with mouse-look camera
4. **Combat** - Click to attack nearby enemies, dealing damage based on stats
5. **Persistence** - Auto-saves every 60 seconds + on page unload

### State Management
- **usePlayerStore** - Character data, position, stats, inventory
- **useCombatStore** - Attack state, damage calculations, cooldowns
- **useEnemyStore** - Enemy spawning, health, AI state

### Data Flow
```
User Input → Zustand Store → React State → Three.js Scene
                ↓
           localStorage (auto-save)
```

## Running the App Offline

### Prerequisites
- Node.js 18+
- npm or yarn

### Quick Start

```bash
# Clone the repository
git clone https://github.com/zach-wendland/sw-ow.git
cd sw-ow

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Create optimized production build |
| `npm start` | Run production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript compiler check |
| `npm test` | Run tests with Vitest |

### Running the Python API (Optional)

The Python FastAPI backend is optional for single-player mode but provides health endpoints:

```bash
# Create virtual environment
python -m venv myenv
source myenv/bin/activate  # On Windows: myenv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run API server
uvicorn api.index:app --reload --port 8000
```

## Game Controls

| Key | Action |
|-----|--------|
| W / Up Arrow | Move forward |
| S / Down Arrow | Move backward |
| A / Left Arrow | Strafe left |
| D / Right Arrow | Strafe right |
| Mouse Move | Look around |
| Left Click | Attack |
| ESC | Pause menu |

## Character Attributes

| Attribute | Effect |
|-----------|--------|
| **Strength** | Increases melee damage |
| **Dexterity** | Increases max stamina, attack speed |
| **Intelligence** | Increases max mana, magic damage |
| **Vitality** | Increases max health |

## Save Data

All game data is stored in browser localStorage under these keys:

- `sw-ow-characters` - List of character summaries
- `sw-ow-save-{characterId}` - Full save data per character
- `player-store` - Active session state

To clear all save data:
```javascript
// In browser console
localStorage.clear()
```

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Application URL | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_NAME` | Display name | `SW-OW` |

## Browser Compatibility

- Chrome 90+ (recommended)
- Firefox 88+
- Safari 14+
- Edge 90+

WebGL 2.0 support required for 3D rendering.

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
