import { SPECIES } from "./simulation";

const BRUSH_SIZES = [2, 4, 8, 12, 18];

const ELEMENTS = [
  { id: "sand", label: "Sand", species: SPECIES.SAND, tone: "warm", description: "Heavy grains that avalanche, pile, and displace water or oil." },
  { id: "water", label: "Water", species: SPECIES.WATER, tone: "cool", description: "Standard liquid that falls, pools, spreads sideways, and extinguishes fire." },
  { id: "stone", label: "Stone", species: SPECIES.STONE, tone: "neutral", description: "Static barrier material for terrain, lettering, and structure." },
  { id: "wood", label: "Wood", species: SPECIES.WOOD, tone: "earth", description: "Static structural material that burns when fire reaches it." },
  { id: "fire", label: "Fire", species: SPECIES.FIRE, tone: "hot", description: "Rises, burns out over time, and ignites flammable materials." },
  { id: "firework", label: "Fireworks", species: SPECIES.FIREWORK, tone: "spark", description: "Launches upward, then bursts into a ring of bright sparks." },
  { id: "black-hole", label: "Black Hole", species: SPECIES.BLACK_HOLE, tone: "abyss", description: "Static singularity that consumes nearby loose matter and flame." },
  { id: "oil", label: "Oil", species: SPECIES.OIL, tone: "void", description: "Dark heavy liquid that flows and catches fire easily." },
  { id: "photo", label: "Photo", species: SPECIES.PHOTO, tone: "photo", description: "Stamps the selected local photo as solid image pixels that hold shape like stone." },
  { id: "erase", label: "Erase", species: SPECIES.EMPTY, tone: "ghost", description: "Clears cells back to empty space." },
];

const SCENES = [
  { id: "dunes", label: "Dunes" },
  { id: "fountain", label: "Fountain" },
  { id: "bonfire", label: "Bonfire" },
  { id: "cascade", label: "Cascade" },
];

function createAppState() {
  return {
    paused: false,
    activeElement: SPECIES.SAND,
    brushIndex: 2,
    activeScene: "dunes",
    photoIndex: 0,
    hudSection: null,
    tiltAvailable: false,
    tiltEnabled: false,
  };
}

export { BRUSH_SIZES, ELEMENTS, SCENES, createAppState };
