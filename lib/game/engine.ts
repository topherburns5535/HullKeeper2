import type {
  AbilityKey,
  BotKind,
  BotShot,
  Debris,
  DebrisCleanupStage,
  DebrisBehavior,
  DebrisKind,
  DebrisVisualState,
  DifficultyMode,
  EffectBurst,
  GameAction,
  GameState,
  IncomingBotWarning,
  MilestoneModifier,
  MilestoneModifierKey,
  Objective,
  ObjectiveKind,
  Pickup,
  PickupKind,
  RecoveryPowerup,
  SupportBot,
  ToastTone,
  UpgradeKey,
} from "@/lib/game/types";

const MAX_SHIELD = 100;
const MAX_HULL = 120;
const OBJECTIVE_REPLACE_DELAY = 1400;
const PASSIVE_INCOME_INTERVAL = 12000;
const BASE_VACUUM_POWER = 4.1;
const BASE_VACUUM_RANGE = 10.5;
const MAX_VACUUM_RANGE = 17.2;
const BASE_SPAWN_INTERVAL_S = 1.85;
const MAX_SPAWN_COUNT = 4;
const MAX_TARGET_ACTIVE_DEBRIS = 20;
const MAX_BURST_SPAWN_COUNT = 7;
const BASE_REGEN_DELAY_MS = 850;
const UPGRADE_CHOICE_COUNT = 3;
const COMBO_WINDOW_MS = 2200;
const PICKUP_RESPAWN_MIN_MS = 12000;
const PICKUP_RESPAWN_RANGE_MS = 9000;
const PICKUP_RETRY_MIN_MS = 5000;
const PICKUP_RETRY_RANGE_MS = 4000;
const PICKUP_FALL_MIN_MS = 1700;
const PICKUP_FALL_RANGE_MS = 700;
const MOVING_POWERUP_RESPAWN_MIN_MS = 16000;
const MOVING_POWERUP_RESPAWN_RANGE_MS = 10000;
const MOVING_POWERUP_RETRY_MIN_MS = 8000;
const MOVING_POWERUP_RETRY_RANGE_MS = 6000;
const MOVING_POWERUP_SPEED = 42;
const MOVING_POWERUP_SHIELD_VALUE = 50;
const MOVING_POWERUP_HULL_VALUE = 25;
const BOT_POWERUP_DROP_CHANCE = 0.48;
const BOT_RESPAWN_MIN_MS = 20000;
const BOT_RESPAWN_RANGE_MS = 15000;
const BOT_START_COOLDOWN_MS = 18000;
const BOT_WARNING_MS = 2300;
const ROGUE_BOT_MIN_LEVEL = 12;
const ROGUE_BOT_RESPAWN_MIN_MS = 16000;
const ROGUE_BOT_RESPAWN_RANGE_MS = 6000;
const ROGUE_BOT_START_COOLDOWN_MS = 11000;
const ROGUE_BOT_SPIT_MIN_MS = 1100;
const ROGUE_BOT_SPIT_RANGE_MS = 500;
const ROGUE_BOT_BLAST_RADIUS = 18;
const POST_NUKE_SLOW_DURATION_MS = 3200;
const POST_NUKE_SLOW_START_MULTIPLIER = 0.68;
const SPLATTER_DELAY_MS = 850;
const SPLATTER_EXPLOSION_DURATION_MS = 220;
const SPLATTER_CORROSIVE_SPAWN_COUNT = 4;
const CORROSIVE_DEBRIS_FLYING_SPRITE = "/assets/debris/CorrosiveDebris.png";
const CORROSIVE_DEBRIS_RESTING_SPRITE = "/assets/debris/CorrosiveDebris_Resting.png";
const CORROSIVE_RESTING_DAMAGE_MULTIPLIER = 0.2;
const HEAVY_DEBRIS_FLYING_SPRITE = "/assets/debris/LargeDebris.png";
const HEAVY_DEBRIS_RESTING_SPRITE = "/assets/debris/LargeDebris_Resting1.png";
const HEAVY_DEBRIS_CLEANUP_SPRITES = [
  "/assets/debris/LargeDebris_cleaning.png",
  "/assets/debris/CommonDebris3_Resting.png",
  "/assets/debris/CommonDebris3_Resting.png",
] as const;
const SPLATTER_DEBRIS_FLYING_SPRITE = "/assets/debris/SplatterDebris.png";
const SPLATTER_DEBRIS_RESTING_SPRITE = "/assets/debris/SplatterDebris_Resting.png";
const SPLATTER_DEBRIS_EXPLOSION_SPRITE = "/assets/effects/SplatterDebris_Resting2.png";
const SPLATTER_DEBRIS_VARIANT_TWO_FLYING_SPRITE = "/assets/debris/SplatterDebris2.png";
const SPLATTER_DEBRIS_VARIANT_TWO_RESTING_SPRITE = "/assets/debris/SplatterDebris2_Resting.png";
const SPLATTER_DEBRIS_VARIANT_TWO_EXPLOSION_SPRITE = "/assets/debris/SplatterDebris2_Resting2.png";

type DebrisSpriteVariant = {
  spriteFlying: string | null;
  spriteResting: string | null;
  spriteExploding?: string | null;
  cleanupSprites?: readonly string[];
};

export const NORMAL_DEBRIS_VARIANTS: DebrisSpriteVariant[] = [
  {
    spriteFlying: "/assets/debris/common/CommonDebris1.png",
    spriteResting: "/assets/debris/common/CommonDebris1_Resting.png",
  },
  {
    spriteFlying: "/assets/debris/CorrosiveDebris.png",
    spriteResting: "/assets/debris/CrashedDebris.png",
  },
  {
    spriteFlying: "/assets/debris/CommonDebris3.png",
    spriteResting: "/assets/debris/CommonDebris3_Resting.png",
  },
];

export const SPLATTER_DEBRIS_VARIANTS: DebrisSpriteVariant[] = [
  {
    spriteFlying: SPLATTER_DEBRIS_FLYING_SPRITE,
    spriteResting: SPLATTER_DEBRIS_RESTING_SPRITE,
    spriteExploding: SPLATTER_DEBRIS_EXPLOSION_SPRITE,
  },
  {
    spriteFlying: SPLATTER_DEBRIS_VARIANT_TWO_FLYING_SPRITE,
    spriteResting: SPLATTER_DEBRIS_VARIANT_TWO_RESTING_SPRITE,
    spriteExploding: SPLATTER_DEBRIS_VARIANT_TWO_EXPLOSION_SPRITE,
  },
];

const DEBRIS_SPRITE_SETS: Record<
  DebrisKind,
  {
    flying: string | null;
    resting: string | null;
    exploding: string | null;
    cleanupSprites: readonly string[];
  }
> = {
  normal: {
    flying: NORMAL_DEBRIS_VARIANTS[0]?.spriteFlying ?? null,
    resting: NORMAL_DEBRIS_VARIANTS[0]?.spriteResting ?? null,
    exploding: null,
    cleanupSprites: [],
  },
  heavy: {
    flying: HEAVY_DEBRIS_FLYING_SPRITE,
    resting: HEAVY_DEBRIS_RESTING_SPRITE,
    exploding: null,
    cleanupSprites: HEAVY_DEBRIS_CLEANUP_SPRITES,
  },
  corrosive: {
    flying: CORROSIVE_DEBRIS_FLYING_SPRITE,
    resting: CORROSIVE_DEBRIS_RESTING_SPRITE,
    exploding: null,
    cleanupSprites: [],
  },
  unstable: {
    flying: null,
    resting: null,
    exploding: null,
    cleanupSprites: [],
  },
  tank: {
    flying: null,
    resting: null,
    exploding: null,
    cleanupSprites: [],
  },
  splatter: {
    flying: SPLATTER_DEBRIS_VARIANTS[0]?.spriteFlying ?? null,
    resting: SPLATTER_DEBRIS_VARIANTS[0]?.spriteResting ?? null,
    exploding: SPLATTER_DEBRIS_VARIANTS[0]?.spriteExploding ?? null,
    cleanupSprites: [],
  },
};

const DIFFICULTY_MULTIPLIERS: Record<
  DifficultyMode,
  {
    spawnIntervalMultiplier: number;
    debrisHpMultiplier: number;
    incomingDamageMultiplier: number;
    shieldRegenMultiplier: number;
    pickupChanceMultiplier: number;
    helpfulBotRespawnMultiplier: number;
    rogueBotRespawnMultiplier: number;
  }
> = {
  Easy: {
    spawnIntervalMultiplier: 1.15,
    debrisHpMultiplier: 0.88,
    incomingDamageMultiplier: 0.85,
    shieldRegenMultiplier: 1.15,
    pickupChanceMultiplier: 1.15,
    helpfulBotRespawnMultiplier: 0.9,
    rogueBotRespawnMultiplier: 1.15,
  },
  Normal: {
    spawnIntervalMultiplier: 1,
    debrisHpMultiplier: 1,
    incomingDamageMultiplier: 1,
    shieldRegenMultiplier: 1,
    pickupChanceMultiplier: 1,
    helpfulBotRespawnMultiplier: 1,
    rogueBotRespawnMultiplier: 1,
  },
  Hard: {
    spawnIntervalMultiplier: 0.9,
    debrisHpMultiplier: 1.12,
    incomingDamageMultiplier: 1.15,
    shieldRegenMultiplier: 0.9,
    pickupChanceMultiplier: 0.9,
    helpfulBotRespawnMultiplier: 1.1,
    rogueBotRespawnMultiplier: 0.9,
  },
};

function getDifficultyMultipliers(difficulty: DifficultyMode) {
  return DIFFICULTY_MULTIPLIERS[difficulty];
}

function getDebrisSpriteSet(kind: DebrisKind) {
  return DEBRIS_SPRITE_SETS[kind];
}

export function getRandomNormalDebrisVariant(seed: number) {
  const rolled = roll(seed);
  const variant =
    NORMAL_DEBRIS_VARIANTS[Math.floor(rolled.value * NORMAL_DEBRIS_VARIANTS.length)] ??
    NORMAL_DEBRIS_VARIANTS[0];

  return {
    seed: rolled.seed,
    variant,
  };
}

export function getRandomSplatterDebrisVariant(seed: number) {
  const rolled = roll(seed);
  const variant =
    SPLATTER_DEBRIS_VARIANTS[Math.floor(rolled.value * SPLATTER_DEBRIS_VARIANTS.length)] ??
    SPLATTER_DEBRIS_VARIANTS[0];

  return {
    seed: rolled.seed,
    variant,
  };
}

export function getHeavyDebrisCleanupStage(progress: number): DebrisCleanupStage {
  if (progress <= 0) {
    return 0;
  }
  if (progress <= 0.33) {
    return 1;
  }
  if (progress <= 0.66) {
    return 2;
  }
  return 3;
}

function getDebrisCleanupProgress(kind: DebrisKind, hp: number, maxHp: number) {
  if (kind !== "heavy" || maxHp <= 0) {
    return 0;
  }
  return clamp(1 - hp / maxHp, 0, 1);
}

function createDebrisVisualState(
  kind: DebrisKind,
  state: DebrisVisualState,
  hp: number,
  maxHp: number,
  variantOverride?: DebrisSpriteVariant,
) {
  const sprites = variantOverride ?? {
    spriteFlying: getDebrisSpriteSet(kind).flying,
    spriteResting: getDebrisSpriteSet(kind).resting,
    spriteExploding: getDebrisSpriteSet(kind).exploding,
    cleanupSprites: getDebrisSpriteSet(kind).cleanupSprites,
  };
  const cleanupSprites = [...(sprites.cleanupSprites ?? [])];
  const cleanupProgress = getDebrisCleanupProgress(kind, hp, maxHp);
  return {
    type: kind,
    isCorrosive: kind === "corrosive",
    spriteFlying: sprites.spriteFlying,
    spriteResting: sprites.spriteResting,
    spriteExploding: sprites.spriteExploding ?? null,
    cleanupSprites,
    cleanupProgress,
    cleanupStage: kind === "heavy" ? getHeavyDebrisCleanupStage(cleanupProgress) : 0,
    state,
    stateTimerMs: 0,
  };
}

function transitionDebrisVisualState(
  debris: Debris,
  state: DebrisVisualState,
  hp = debris.hp,
  stateTimerMs = state === debris.state ? debris.stateTimerMs : 0,
) {
  return {
    ...createDebrisVisualState(debris.kind, state, hp, debris.maxHp, {
      spriteFlying: debris.spriteFlying,
      spriteResting: debris.spriteResting,
      spriteExploding: debris.spriteExploding,
      cleanupSprites: debris.cleanupSprites,
    }),
    stateTimerMs,
  };
}

export function getDebrisRenderSprite(debris: Debris) {
  if (debris.state === "flying") {
    return debris.spriteFlying;
  }

  if (debris.state === "exploding") {
    return debris.spriteExploding ?? debris.spriteResting;
  }

  if (debris.kind === "heavy" && debris.cleanupStage > 0) {
    return debris.cleanupSprites[debris.cleanupStage - 1] ?? debris.spriteResting;
  }

  return debris.spriteResting;
}

export const MAX_OBJECTIVES = 2;
export const UPGRADE_CAPS: Record<UpgradeKey, number> = {
  power: 12,
  range: 10,
  tempo: 10,
  ability: 8,
  shield: 8,
};

const UPGRADE_BASE_COSTS: Record<UpgradeKey, number> = {
  power: 25,
  range: 30,
  tempo: 35,
  ability: 40,
  shield: 38,
};

const STAGES = [
  {
    name: "Early",
    intro: "Calm hull. Normal debris only.",
    weights: { normal: 100 },
  },
  {
    name: "Corrosion",
    intro: "Corrosive debris detected.",
    weights: { normal: 82, corrosive: 18 },
  },
  {
    name: "Mass",
    intro: "Heavy debris entering the hull.",
    weights: { normal: 74, corrosive: 18, heavy: 8 },
  },
  {
    name: "Advanced",
    intro: "Unstable debris live. Stay sharp.",
    weights: { normal: 64, corrosive: 18, heavy: 8, unstable: 4, splatter: 6 },
  },
] as const;

const DEBRIS_STATS: Record<
  DebrisKind,
  {
    hp: number;
    damagePerSecond: number;
    salvage: number;
    xp: number;
    explosionDamage?: number;
    fuseMs?: number;
  }
> = {
  normal: { hp: 1, damagePerSecond: 1.8, salvage: 3, xp: 4 },
  heavy: { hp: 3, damagePerSecond: 3, salvage: 5, xp: 7 },
  corrosive: { hp: 2, damagePerSecond: 5.1, salvage: 6, xp: 9 },
  unstable: { hp: 2, damagePerSecond: 2.7, salvage: 8, xp: 12, explosionDamage: 11, fuseMs: 5400 },
  tank: { hp: 4.5, damagePerSecond: 4.2, salvage: 11, xp: 15 },
  splatter: {
    hp: 2.6,
    damagePerSecond: 4.2,
    salvage: 9,
    xp: 13,
    fuseMs: SPLATTER_DELAY_MS,
  },
};

export function getMovingPowerupTiming() {
  return {
    startMs: MOVING_POWERUP_RESPAWN_MIN_MS,
    minMs: MOVING_POWERUP_RESPAWN_MIN_MS,
    maxMs: MOVING_POWERUP_RESPAWN_MIN_MS + MOVING_POWERUP_RESPAWN_RANGE_MS,
    retryMinMs: MOVING_POWERUP_RETRY_MIN_MS,
    retryMaxMs: MOVING_POWERUP_RETRY_MIN_MS + MOVING_POWERUP_RETRY_RANGE_MS,
    botDropChance: BOT_POWERUP_DROP_CHANCE,
  };
}

export function getRogueBotTiming() {
  return {
    unlockLevel: ROGUE_BOT_MIN_LEVEL,
    startMs: ROGUE_BOT_START_COOLDOWN_MS,
    minMs: ROGUE_BOT_RESPAWN_MIN_MS,
    maxMs: ROGUE_BOT_RESPAWN_MIN_MS + ROGUE_BOT_RESPAWN_RANGE_MS,
  };
}

const EFFECT_TONE: Record<ToastTone, string> = {
  info: "border-cyan-300/70 bg-cyan-300/15 text-cyan-50",
  reward: "border-amber-300/70 bg-amber-300/15 text-amber-50",
  danger: "border-rose-300/70 bg-rose-300/15 text-rose-50",
};

export const PICKUP_APPEARANCE: Record<
  PickupKind,
  { short: string; tone: string; ring: string }
> = {
  shield: {
    short: "S",
    tone: "border-cyan-200/70 bg-[linear-gradient(160deg,_rgba(34,211,238,0.92),_rgba(8,145,178,0.88))] text-white",
    ring: "border-cyan-200/60 shadow-[0_0_34px_rgba(34,211,238,0.3)]",
  },
  hull: {
    short: "H",
    tone: "border-emerald-200/70 bg-[linear-gradient(160deg,_rgba(52,211,153,0.95),_rgba(5,150,105,0.88))] text-white",
    ring: "border-emerald-200/60 shadow-[0_0_34px_rgba(52,211,153,0.3)]",
  },
};

export const BOT_APPEARANCE: Record<
  BotKind,
  { short: string; tone: string; ring: string }
> = {
  shield: {
    short: "+",
    tone: "border-emerald-200/70 bg-[linear-gradient(160deg,_rgba(110,231,183,0.96),_rgba(16,185,129,0.88))] text-slate-950",
    ring: "border-emerald-200/40 shadow-[0_0_32px_rgba(52,211,153,0.28)]",
  },
  scrap: {
    short: "$",
    tone: "border-amber-200/70 bg-[linear-gradient(160deg,_rgba(253,230,138,0.96),_rgba(217,119,6,0.88))] text-slate-950",
    ring: "border-amber-200/40 shadow-[0_0_32px_rgba(251,191,36,0.24)]",
  },
  stabilizer: {
    short: "S",
    tone: "border-sky-200/70 bg-[linear-gradient(160deg,_rgba(125,211,252,0.96),_rgba(14,165,233,0.86))] text-slate-950",
    ring: "border-sky-200/40 shadow-[0_0_32px_rgba(56,189,248,0.24)]",
  },
  turret: {
    short: "T",
    tone: "border-fuchsia-200/70 bg-[linear-gradient(160deg,_rgba(240,171,252,0.96),_rgba(168,85,247,0.88))] text-slate-950",
    ring: "border-fuchsia-200/40 shadow-[0_0_32px_rgba(217,70,239,0.22)]",
  },
  rogue: {
    short: "!",
    tone: "border-rose-200/80 bg-[linear-gradient(160deg,_rgba(251,113,133,0.96),_rgba(190,24,93,0.9))] text-white",
    ring: "border-rose-200/45 shadow-[0_0_34px_rgba(244,63,94,0.3)]",
  },
};

export const DEBRIS_APPEARANCE: Record<
  DebrisKind,
  { short: string; shape: string; fill: string }
> = {
  normal: {
    short: "N",
    shape: "rounded-[28%]",
    fill: "border-slate-300/40 bg-[linear-gradient(160deg,_#94a3b8,_#64748b)]",
  },
  heavy: {
    short: "H",
    shape: "rounded-[22%]",
    fill: "border-amber-200/40 bg-[linear-gradient(160deg,_#f59e0b,_#b45309)]",
  },
  tank: {
    short: "T",
    shape: "rounded-[18%]",
    fill: "border-orange-100/45 bg-[linear-gradient(160deg,_#f97316,_#7c2d12)]",
  },
  corrosive: {
    short: "C",
    shape: "rotate-45 rounded-[22%]",
    fill: "border-lime-200/45 bg-[linear-gradient(160deg,_#84cc16,_#3f6212)]",
  },
  splatter: {
    short: "S",
    shape: "rounded-[42%_32%_46%_28%]",
    fill: "border-violet-200/45 bg-[linear-gradient(160deg,_#c084fc,_#6d28d9)]",
  },
  unstable: {
    short: "U",
    shape: "rounded-full",
    fill: "border-rose-200/45 bg-[linear-gradient(160deg,_#fb7185,_#be123c)]",
  },
};

export const ABILITY_DESCRIPTIONS: Record<AbilityKey, string> = {
  slowTime: "Slows incoming pressure for a clutch cleanup window.",
  nuke: "Emergency wipe that clears every debris piece on the hull.",
};

export const UPGRADE_DESCRIPTIONS: Record<UpgradeKey, string> = {
  power: "Stronger suction that breaks heavy debris faster.",
  range: "Wider vacuum radius for easier lane control.",
  tempo: "Vacuum responds faster and abilities recycle sooner.",
  ability: "Longer Slow Time, faster nuke cycle, and longer repair bot uptime.",
  shield: "Shield Tolerance widens the regeneration window under light pressure.",
};

const MILESTONE_LEVELS = [5, 10, 15, 20] as const;
const HELPFUL_MILESTONE_KEYS: MilestoneModifierKey[] = [
  "shieldRegenBoost",
  "rangeBoost",
  "pickupBoost",
];
const PRESSURE_MILESTONE_KEYS: MilestoneModifierKey[] = ["spawnRateBoost", "softCapBoost"];

export const MILESTONE_MODIFIER_LABELS: Record<MilestoneModifierKey, string> = {
  shieldRegenBoost: "Regen Grid",
  rangeBoost: "Sweep Lens",
  pickupBoost: "Supply Ping",
  spawnRateBoost: "Debris Surge",
  softCapBoost: "Hull Saturation",
};

export function getMilestoneLevels() {
  return [...MILESTONE_LEVELS];
}

export function getMilestoneModifierValue(key: MilestoneModifierKey) {
  switch (key) {
    case "shieldRegenBoost":
      return 0.1;
    case "rangeBoost":
      return 0.08;
    case "pickupBoost":
      return 0.12;
    case "spawnRateBoost":
      return 0.12;
    case "softCapBoost":
      return 1;
  }
}

export function getDebrisBehaviorRates(level: number) {
  return {
    drift: level >= 10 ? 0.12 : 0,
    sticky: level >= 20 ? (level >= 30 ? 0.16 : 0.12) : 0,
    swift: level >= 30 ? 0.05 : 0,
  };
}

function nextSeed(seed: number) {
  return (seed * 1664525 + 1013904223) % 4294967296;
}

function roll(seed: number) {
  const updated = nextSeed(seed);
  return { seed: updated, value: updated / 4294967296 };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getModifierCounts(modifiers: MilestoneModifier[]) {
  return modifiers.reduce(
    (counts, modifier) => {
      counts[modifier.key] += 1;
      return counts;
    },
    {
      shieldRegenBoost: 0,
      rangeBoost: 0,
      pickupBoost: 0,
      spawnRateBoost: 0,
      softCapBoost: 0,
    } as Record<MilestoneModifierKey, number>,
  );
}

function hasReachedMilestone(level: number) {
  return MILESTONE_LEVELS.includes(level as (typeof MILESTONE_LEVELS)[number]);
}

function pickMilestoneModifier(
  state: GameState,
  pool: MilestoneModifierKey[],
) {
  const existing = new Set(state.modifiers.map((modifier) => modifier.key));
  const preferredPool = pool.filter((key) => !existing.has(key));
  const availablePool = preferredPool.length > 0 ? preferredPool : pool;
  const rolled = roll(state.rngSeed);
  const picked = availablePool[Math.floor(rolled.value * availablePool.length)] ?? availablePool[0];

  return {
    seed: rolled.seed,
    picked,
  };
}

function getXpToNextLevel(level: number) {
  return Math.round(30 + Math.pow(level, 1.35) * 18);
}

export function getUpgradeCost(upgrade: UpgradeKey, level: number) {
  return Math.round(UPGRADE_BASE_COSTS[upgrade] * Math.pow(1.36, level));
}

function getAvailableUpgradeKeys(state: GameState) {
  return (Object.keys(state.upgrades) as UpgradeKey[]).filter(
    (upgrade) => state.upgrades[upgrade] < UPGRADE_CAPS[upgrade],
  );
}

function getUpgradeChoiceWeights(state: GameState, available: UpgradeKey[]) {
  const weights = Object.fromEntries(available.map((upgrade) => [upgrade, 1])) as Record<
    UpgradeKey,
    number
  >;
  const stageIndex = getStageIndex(state.level);
  const shieldRatio = state.shield / state.maxShield;
  const strengthScore = getStrengthScore(state);
  const targetActiveDebris = getTargetActiveDebris(state.elapsedMs / 1000, strengthScore, state.level);

  if (shieldRatio <= 0.55) {
    if (weights.shield !== undefined) {
      weights.shield += 2.8;
    }
    if (weights.tempo !== undefined) {
      weights.tempo += 1.8;
    }
  }

  if (strengthScore >= 10) {
    if (weights.shield !== undefined) {
      weights.shield += 1.5;
    }
    if (weights.ability !== undefined) {
      weights.ability += 1.2;
    }
  }

  if (stageIndex === 0) {
    if (weights.power !== undefined) {
      weights.power += 2.1;
    }
    if (weights.range !== undefined) {
      weights.range += 2.1;
    }
  } else {
    if (weights.shield !== undefined) {
      weights.shield += 1.1;
    }
    if (weights.ability !== undefined) {
      weights.ability += 1.1;
    }
  }

  if (state.debris.length >= Math.max(4, Math.floor(targetActiveDebris * 0.7))) {
    if (weights.power !== undefined) {
      weights.power += 0.9;
    }
    if (weights.shield !== undefined) {
      weights.shield += 0.8;
    }
  }

  if (state.upgrades.range <= 1 && weights.range !== undefined) {
    weights.range += 0.7;
  }

  return weights;
}

function pickWeightedUpgrade(
  seed: number,
  available: UpgradeKey[],
  weights: Record<UpgradeKey, number>,
) {
  let totalWeight = 0;
  for (const upgrade of available) {
    totalWeight += Math.max(0.1, weights[upgrade] ?? 1);
  }

  const rollResult = roll(seed);
  let cursor = rollResult.value * totalWeight;
  let picked = available[0];

  for (const upgrade of available) {
    cursor -= Math.max(0.1, weights[upgrade] ?? 1);
    if (cursor <= 0) {
      picked = upgrade;
      break;
    }
  }

  return { seed: rollResult.seed, picked };
}

function generateUpgradeChoices(state: GameState) {
  const available = getAvailableUpgradeKeys(state);
  if (available.length <= UPGRADE_CHOICE_COUNT) {
    return {
      seed: state.rngSeed,
      choices: available,
    };
  }

  const weights = getUpgradeChoiceWeights(state, available);
  const pool = [...available];
  const choices: UpgradeKey[] = [];
  let seed = state.rngSeed;

  while (pool.length > 0 && choices.length < UPGRADE_CHOICE_COUNT) {
    const choice = pickWeightedUpgrade(seed, pool, weights);
    seed = choice.seed;
    choices.push(choice.picked);
    pool.splice(pool.indexOf(choice.picked), 1);
  }

  return { seed, choices };
}

export function getStrengthScore(state: GameState) {
  return (
    state.upgrades.power * 1.2 +
    state.upgrades.range * 1.0 +
    state.upgrades.tempo * 0.9 +
    state.upgrades.ability * 0.8 +
    state.level * 0.6
  );
}

export function getSpawnIntervalSeconds(timeSurvivedSeconds: number, playerLevel: number) {
  return Math.max(
    0.34,
    BASE_SPAWN_INTERVAL_S - timeSurvivedSeconds * 0.00265 - playerLevel * 0.0105,
  );
}

export function getSpawnCount(timeSurvivedSeconds: number, _strengthScore: number, level: number) {
  const count = 1 + Math.floor(timeSurvivedSeconds / 55) + Math.floor(level / 13);
  return Math.min(MAX_SPAWN_COUNT + 1, count);
}

export function getTotalActiveDebrisCap(level: number) {
  return 8 + Math.floor(level / 4);
}

export function getNormalDebrisCap() {
  return 999;
}

export function getTargetActiveDebris(timeSurvivedSeconds: number, strengthScore: number, level: number) {
  return Math.min(
    MAX_TARGET_ACTIVE_DEBRIS,
    6 + Math.floor(level / 3) + Math.floor(timeSurvivedSeconds / 22) + Math.floor(strengthScore / 9),
  );
}

export function getActiveDebrisCaps(level: number) {
  return {
    normal: getDebrisTypeCap(level, "normal"),
    heavy: getDebrisTypeCap(level, "heavy"),
    corrosive: getDebrisTypeCap(level, "corrosive"),
    unstable: getDebrisTypeCap(level, "unstable"),
    tank: getDebrisTypeCap(level, "tank"),
    splatter: getDebrisTypeCap(level, "splatter"),
  };
}

export function getDebrisTypeCap(level: number, kind: DebrisKind) {
  if (kind === "normal") {
    return getNormalDebrisCap();
  }

  if (kind === "corrosive") {
    if (level < 3) return 0;
    return Math.min(7, 1 + Math.floor(level / 10));
  }

  if (kind === "heavy") {
    if (level < 10) return 0;
    return Math.min(6, 1 + Math.floor(level / 12));
  }

  if (kind === "splatter") {
    if (level < 12) return 0;
    if (level < 24) return 1;
    if (level < 38) return 2;
    if (level < 56) return 3;
    return 4;
  }

  if (kind === "tank") {
    if (level < 18) return 0;
    if (level < 30) return 1;
    if (level < 44) return 2;
    if (level < 60) return 3;
    return 4;
  }

  if (level < 18) return 0;
  return Math.min(5, Math.floor(level / 18));
}

export function getDebrisSpawnWeights(level: number): Partial<Record<DebrisKind, number>> {
  const weights: Partial<Record<DebrisKind, number>> = {
    normal: Math.max(20, 80 - level * 1.25),
    corrosive: 15 + level * 0.85,
  };

  if (level >= 10) {
    weights.heavy = 5 + level * 0.75;
  }

  if (level >= 12) {
    weights.splatter = 2.8 + level * 0.22;
  }

  if (level >= 18) {
    weights.unstable = level * 0.42;
  }

  if (level >= 18) {
    weights.tank = 1.8 + level * 0.18;
  }

  return weights;
}

export function getBurstWaveIntervalSeconds(strengthScore: number, level: number) {
  if (level < 8) {
    return 999;
  }
  if (level <= 15) {
    return Math.max(34, 44 - Math.floor(strengthScore * 0.1));
  }
  return Math.max(28, 40 - Math.floor(strengthScore * 0.18));
}

export function getBurstSpawnCount(timeSurvivedSeconds: number, strengthScore: number, level: number) {
  if (level < 8) {
    return 0;
  }
  if (level <= 15) {
    return Math.min(3, 2 + Math.floor(timeSurvivedSeconds / 80));
  }
  return Math.min(
    MAX_BURST_SPAWN_COUNT,
    3 + Math.floor(timeSurvivedSeconds / 60) + Math.floor(strengthScore / 18),
  );
}

function baseState(seed = 1337, difficulty: DifficultyMode = "Normal"): GameState {
  const difficultyMultipliers = getDifficultyMultipliers(difficulty);

  return {
    mode: "ready",
    difficulty,
    rngSeed: seed,
    elapsedMs: 0,
    shield: MAX_SHIELD,
    hull: MAX_HULL,
    maxShield: MAX_SHIELD,
    maxHull: MAX_HULL,
    salvage: 0,
    bestSalvage: 0,
    xp: 0,
    xpToNext: getXpToNextLevel(1),
    level: 1,
    pendingLevelChoices: 0,
    upgradeChoices: [],
    modifiers: [],
    debris: [],
    pickups: [],
    powerups: [],
    activeBot: undefined,
    incomingBotWarning: undefined,
    botShots: [],
    objectives: [],
    effects: [],
    abilities: {
      slowTime: { cooldownMs: 0 },
      nuke: { cooldownMs: 0 },
    },
    upgrades: {
      power: 0,
      range: 0,
      tempo: 0,
      ability: 0,
      shield: 0,
    },
    slowTimeMs: 0,
    nukeFlashMs: 0,
    postNukeSlowMs: 0,
    clearRecoveryMs: 0,
    comboCount: 0,
    comboTimerMs: 0,
    vacuumX: 50,
    vacuumY: 62,
    vacuumTargetX: 50,
    vacuumTargetY: 62,
    isVacuumActive: false,
    suctioningDebrisIds: [],
    spawnCooldownMs: BASE_SPAWN_INTERVAL_S * 1000 * difficultyMultipliers.spawnIntervalMultiplier,
    nextBurstAtMs: 22000,
    burstWavesTriggered: 0,
    incomeCooldownMs: PASSIVE_INCOME_INTERVAL,
    pickupCooldownMs: 15000,
    movingPowerupCooldownMs: MOVING_POWERUP_RESPAWN_MIN_MS,
    botCooldownMs: Math.round(
      BOT_START_COOLDOWN_MS * difficultyMultipliers.helpfulBotRespawnMultiplier,
    ),
    rogueBotCooldownMs: Math.round(
      ROGUE_BOT_START_COOLDOWN_MS * difficultyMultipliers.rogueBotRespawnMultiplier,
    ),
    nextDebrisId: 1,
    nextPickupId: 1,
    nextPowerupId: 1,
    nextBotShotId: 1,
    nextEffectId: 1,
    nextObjectiveId: 1,
    totalClears: 0,
    heavyClears: 0,
    dangerousClears: 0,
    lastHullDamageAt: 0,
  };
}

function createRunningState(
  seed: number,
  bestSalvage: number,
  difficulty: DifficultyMode,
) {
  let state = baseState(seed, difficulty);
  state.mode = "running";
  state.bestSalvage = bestSalvage;
  state.toast = { label: "Sweep live", tone: "info", ttlMs: 1800 };

  while (state.objectives.length < MAX_OBJECTIVES) {
    state = addObjective(state);
  }

  return state;
}

function createReadyState(
  seed: number,
  bestSalvage: number,
  difficulty: DifficultyMode,
) {
  const state = baseState(seed, difficulty);
  state.bestSalvage = bestSalvage;
  return state;
}

export function createInitialState() {
  return createReadyState(1337, 0, "Normal");
}

export function getStageConfig(level: number) {
  if (level >= 18) {
    return STAGES[3];
  }
  if (level >= 10) {
    return STAGES[2];
  }
  if (level >= 3) {
    return STAGES[1];
  }
  return STAGES[0];
}

function getStageIndex(level: number) {
  if (level >= 18) return 3;
  if (level >= 10) return 2;
  if (level >= 3) return 1;
  return 0;
}

export function getDebrisProgress(debris: Debris) {
  return clamp(debris.ageMs / debris.fallDurationMs, 0, 1);
}

export function getDebrisMotionState(debris: Debris) {
  if (debris.state === "exploding") {
    return "falling";
  }

  return debris.ageMs >= debris.fallDurationMs ? "resting" : "falling";
}

export function getRestingDebrisCount(debrisList: Debris[]) {
  return debrisList.filter((debris) => getDebrisMotionState(debris) === "resting").length;
}

export function getRestingCorrosiveDebrisCount(debrisList: Debris[]) {
  return debrisList.filter(
    (debris) => debris.kind === "corrosive" && getDebrisMotionState(debris) === "resting",
  ).length;
}

function getDebrisRestingBurden(debris: Debris) {
  return debris.kind === "tank" || debris.kind === "splatter" ? 3 : 1;
}

export function getRestingDebrisBurden(debrisList: Debris[]) {
  return debrisList.reduce((total, debris) => {
    if (getDebrisMotionState(debris) !== "resting") {
      return total;
    }
    return total + getDebrisRestingBurden(debris);
  }, 0);
}

export function getPickupProgress(pickup: Pickup) {
  return clamp(pickup.ageMs / pickup.fallDurationMs, 0, 1);
}

export function getFallingY(targetY: number, ageMs: number, fallDurationMs: number) {
  return -12 + (targetY + 12) * clamp(ageMs / fallDurationMs, 0, 1);
}

export function getDebrisFuseProgress(debris: Debris) {
  if (debris.kind === "splatter") {
    if (debris.state !== "resting") {
      return undefined;
    }

    return clamp(debris.stateTimerMs / SPLATTER_DELAY_MS, 0, 1);
  }

  const stats = DEBRIS_STATS[debris.kind];
  if (!stats.fuseMs || getDebrisMotionState(debris) !== "resting") {
    return undefined;
  }

  return clamp((debris.ageMs - debris.fallDurationMs) / stats.fuseMs, 0, 1);
}

export function getPostNukeFallSpeedMultiplier(postNukeSlowMs: number) {
  if (postNukeSlowMs <= 0) {
    return 1;
  }

  const progress = 1 - clamp(postNukeSlowMs / POST_NUKE_SLOW_DURATION_MS, 0, 1);
  return POST_NUKE_SLOW_START_MULTIPLIER + (1 - POST_NUKE_SLOW_START_MULTIPLIER) * progress;
}

export function getHullPressureDamagePerSecond(restingDebrisCount: number, maxHull: number) {
  if (restingDebrisCount <= 0) {
    return 0;
  }

  const effectivePressure = Math.pow(restingDebrisCount, 0.75);
  const baseHullDamage = maxHull * 0.015;
  const maxHullDamagePerSecond = maxHull * 0.06;

  return Math.min(maxHullDamagePerSecond, baseHullDamage * effectivePressure);
}

export function getCorrosiveHullDamagePerSecond(debrisList: Debris[]) {
  const restingCorrosiveCount = getRestingCorrosiveDebrisCount(debrisList);
  if (restingCorrosiveCount <= 0) {
    return 0;
  }

  return restingCorrosiveCount * DEBRIS_STATS.corrosive.damagePerSecond * CORROSIVE_RESTING_DAMAGE_MULTIPLIER;
}

export function formatTime(elapsedMs: number) {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function getShieldPickupChance(shieldPercent: number) {
  if (shieldPercent >= 0.6) {
    return 0;
  }
  if (shieldPercent > 0.35) {
    return 0.008;
  }
  if (shieldPercent > 0.15) {
    return 0.018;
  }
  return 0.035;
}

export function getHullPickupChance(hullPercent: number) {
  if (hullPercent >= 0.75) {
    return 0;
  }
  if (hullPercent > 0.5) {
    return 0.002;
  }
  if (hullPercent > 0.3) {
    return 0.005;
  }
  if (hullPercent > 0.15) {
    return 0.01;
  }
  return 0.02;
}

export function getDebrisHp(kind: DebrisKind, level: number) {
  if (kind === "normal") {
    if (level <= 10) return 1;
    if (level <= 24) return 1.1;
    if (level <= 39) return 1.2;
    return 1.35;
  }

  if (kind === "corrosive") {
    if (level <= 18) return 2;
    if (level <= 34) return 2.2;
    return 2.4;
  }

  if (kind === "heavy") {
    if (level <= 19) return 3;
    if (level <= 39) return 3.2;
    return 3.5;
  }

  if (kind === "tank") {
    if (level <= 19) return 4.5;
    if (level <= 39) return 4.8;
    return 5.25;
  }

  if (kind === "splatter") {
    if (level <= 29) return 2.6;
    if (level <= 49) return 2.9;
    return 3.2;
  }

  if (level <= 34) return 2;
  if (level <= 54) return 2.3;
  return 2.6;
}

function getDebrisRewardScale(debris: Debris) {
  return debris.isFragment ? 0.45 : 1;
}

function getDebrisRewards(debris: Debris) {
  const reward = DEBRIS_STATS[debris.kind];
  const scale = getDebrisRewardScale(debris);
  return {
    salvage: reward.salvage * scale,
    xp: reward.xp * scale,
  };
}

function getSplitChance(debris: Debris) {
  if (debris.isFragment) {
    return 0;
  }
  if (debris.kind === "heavy") {
    return 0.3;
  }
  if (debris.kind === "unstable") {
    return 0.42;
  }
  return 0;
}

function isHeavyClassDebris(debris: Debris) {
  return !debris.isFragment && (debris.kind === "heavy" || debris.kind === "tank");
}

function isDangerousDebris(debris: Debris) {
  return !debris.isFragment && (
    debris.kind === "corrosive" || debris.kind === "unstable" || debris.kind === "splatter"
  );
}

export function getVacuumRange(state: GameState) {
  return Math.min(
    MAX_VACUUM_RANGE,
    BASE_VACUUM_RANGE * Math.pow(1 + 0.082 * state.upgrades.range, 0.8),
  );
}

export function getComboMultiplier(comboCount: number) {
  return Math.min(2.5, 1 + comboCount * 0.05);
}

export function getDerivedStats(state: GameState) {
  const difficulty = getDifficultyMultipliers(state.difficulty);
  const strengthScore = getStrengthScore(state);
  const modifierCounts = getModifierCounts(state.modifiers);
  const tempoMultiplier = Math.min(1.68, 1 + 0.068 * state.upgrades.tempo);
  const abilityEffectMultiplier = Math.min(1.85, 1 + 0.1 * state.upgrades.ability);
  const abilityCooldownMultiplier = Math.max(0.6, 1 - 0.045 * state.upgrades.ability);
  const vacuumPower = Math.min(
    BASE_VACUUM_POWER * 2.38,
    BASE_VACUUM_POWER * Math.pow(1 + 0.115 * state.upgrades.power, 0.86),
  );
  const timeSurvivedSeconds = state.elapsedMs / 1000;
  const earlyIntervalBonus = state.level <= 4 ? 0.25 : state.level <= 9 ? 0.12 : state.level <= 14 ? 0.05 : 0;
  const spawnIntervalMultiplier =
    1 - modifierCounts.spawnRateBoost * getMilestoneModifierValue("spawnRateBoost");
  const spawnIntervalMs =
    (getSpawnIntervalSeconds(timeSurvivedSeconds, state.level) + earlyIntervalBonus) *
    Math.max(0.72, spawnIntervalMultiplier) *
    difficulty.spawnIntervalMultiplier *
    1000;
  const totalActiveDebrisCap =
    getTotalActiveDebrisCap(state.level) +
    modifierCounts.softCapBoost * getMilestoneModifierValue("softCapBoost");
  const targetActiveDebris = getTargetActiveDebris(timeSurvivedSeconds, strengthScore, state.level);
  const regenThreshold = Math.max(2, Math.floor(totalActiveDebrisCap * 0.35));
  const regenThresholdBonus = state.upgrades.shield * 0.81;
  const finalRegenThreshold = regenThreshold + regenThresholdBonus;
  const shieldRegenMultiplier =
    1 + modifierCounts.shieldRegenBoost * getMilestoneModifierValue("shieldRegenBoost");
  const rangeMultiplier = 1 + modifierCounts.rangeBoost * getMilestoneModifierValue("rangeBoost");
  const pickupChanceMultiplier =
    (1 + modifierCounts.pickupBoost * getMilestoneModifierValue("pickupBoost")) *
    difficulty.pickupChanceMultiplier;
  const helpfulBotRespawnMs = Math.round(
    Math.max(
      BOT_RESPAWN_MIN_MS,
      (BOT_RESPAWN_MIN_MS + BOT_RESPAWN_RANGE_MS) * abilityCooldownMultiplier,
    ) * difficulty.helpfulBotRespawnMultiplier,
  );

  return {
    difficulty,
    strengthScore,
    modifierCounts,
    tempoMultiplier,
    abilityEffectMultiplier,
    abilityCooldownMultiplier,
    suctionPowerPerSecond: vacuumPower,
    vacuumRange: Math.min(MAX_VACUUM_RANGE, getVacuumRange(state) * rangeMultiplier),
    vacuumFollow: clamp(0.195 * tempoMultiplier, 0.195, 0.34),
    slowDurationMs: Math.round(4500 * abilityEffectMultiplier),
    slowPressureMultiplier: Math.max(0.4, 0.6 - state.upgrades.ability * 0.025),
    slowCooldownMs: Math.round(22000 * abilityCooldownMultiplier),
    nukeCooldownMs: Math.round(42000 * abilityCooldownMultiplier),
    pullRadius: Math.min(29, getVacuumRange(state) * rangeMultiplier * 1.38),
    pullBasePerSecond: 24 * tempoMultiplier,
    pullMaxVelocity: 28,
    botLifetimeMs: Math.min(12000, Math.round(8500 + state.upgrades.ability * 450)),
    shieldBotRegenPerSecond: state.maxShield * 0.05 * difficulty.shieldRegenMultiplier,
    scrapBotPowerPerSecond: vacuumPower * 0.34,
    scrapBotRadius: 14.5,
    scrapBotMoveSpeed: 26,
    stabilizerRadius: 16,
    stabilizerFallMultiplier: 0.75,
    turretBotRespawnMs: helpfulBotRespawnMs,
    turretBotFireCooldownMs: Math.max(950, Math.round(1150 * abilityCooldownMultiplier)),
    turretBotRange: 26,
    turretBotDamage: 1.12 + state.upgrades.ability * 0.07,
    rogueBotBlastRadius: ROGUE_BOT_BLAST_RADIUS,
    rogueBotSpitDamage: 0.75,
    regenDelayMs: BASE_REGEN_DELAY_MS,
    baseRegenThreshold: regenThreshold,
    regenThresholdBonus,
    finalRegenThreshold,
    totalActiveDebrisCap,
    normalDebrisCap: getNormalDebrisCap(),
    shieldRegenPerSecond:
      state.maxShield * 0.08 * shieldRegenMultiplier * difficulty.shieldRegenMultiplier,
    pickupChanceMultiplier,
    spawnIntervalMs,
    spawnCount: getSpawnCount(timeSurvivedSeconds, strengthScore, state.level),
    targetActiveDebris:
      targetActiveDebris + modifierCounts.softCapBoost * getMilestoneModifierValue("softCapBoost"),
    burstWaveIntervalMs: getBurstWaveIntervalSeconds(strengthScore, state.level) * 1000,
    burstSpawnCount: getBurstSpawnCount(timeSurvivedSeconds, strengthScore, state.level),
  };
}

function pushEffect(
  state: GameState,
  effect: Omit<EffectBurst, "id" | "ageMs">,
): GameState {
  return {
    ...state,
    nextEffectId: state.nextEffectId + 1,
    effects: [
      ...state.effects,
      {
        id: state.nextEffectId,
        ageMs: 0,
        ...effect,
      },
    ],
  };
}

function setToast(state: GameState, label: string, tone: ToastTone): GameState {
  return {
    ...state,
    toast: { label, tone, ttlMs: 1700 },
  };
}

function rewardState(state: GameState, salvageDelta: number, xpDelta: number): GameState {
  const salvage = state.salvage + Math.max(0, Math.round(salvageDelta));
  const xp = state.xp + Math.max(0, Math.round(xpDelta));

  return {
    ...state,
    salvage,
    bestSalvage: Math.max(state.bestSalvage, salvage),
    xp,
  };
}

function applyMilestoneModifier(state: GameState) {
  if (!hasReachedMilestone(state.level) || state.modifiers.some((modifier) => modifier.level === state.level)) {
    return state;
  }

  const isHelpfulMilestone = state.level % 10 === 5;
  const pool = isHelpfulMilestone ? HELPFUL_MILESTONE_KEYS : PRESSURE_MILESTONE_KEYS;
  const picked = pickMilestoneModifier(state, pool);
  const tone: ToastTone = isHelpfulMilestone ? "reward" : "danger";

  return {
    ...state,
    rngSeed: picked.seed,
    modifiers: [...state.modifiers, { level: state.level, key: picked.picked }],
    toast: {
      label: `Milestone: ${MILESTONE_MODIFIER_LABELS[picked.picked]}`,
      tone,
      ttlMs: 2200,
    },
  };
}

function syncLevelUps(state: GameState) {
  let next = state;

  while (next.xp >= next.xpToNext) {
    const availableUpgrades = getAvailableUpgradeKeys(next);
    let leveledState: GameState = {
      ...next,
      xp: next.xp - next.xpToNext,
      level: next.level + 1,
      xpToNext: getXpToNextLevel(next.level + 1),
      pendingLevelChoices:
        availableUpgrades.length > 0 ? next.pendingLevelChoices + 1 : next.pendingLevelChoices,
      upgradeChoices: next.pendingLevelChoices > 0 ? next.upgradeChoices : [],
      isVacuumActive: false,
      suctioningDebrisIds: [],
      comboCount: 0,
      comboTimerMs: 0,
      toast: { label: "Upgrade ready", tone: "reward", ttlMs: 1900 },
    };

    if (availableUpgrades.length === 0) {
      leveledState = {
        ...leveledState,
        toast: { label: "Systems maxed", tone: "info", ttlMs: 1900 },
      };
    } else if (next.pendingLevelChoices <= 0) {
      const generated = generateUpgradeChoices(leveledState);
      leveledState = {
        ...leveledState,
        rngSeed: generated.seed,
        upgradeChoices: generated.choices,
      };
    }

    next = applyMilestoneModifier(leveledState);
  }

  return next;
}

function objectiveLabel(kind: ObjectiveKind, target: number) {
  switch (kind) {
    case "clearTotal":
      return `Clear ${target} debris`;
    case "clearHeavy":
      return `Clear ${target} heavy debris`;
    case "survive":
      return `Survive ${target}s`;
    case "earnSalvage":
      return `Earn ${target} salvage`;
    case "avoidHullDamage":
      return `Avoid hull damage for ${target}s`;
  }
}

function getObjectiveKinds(state: GameState) {
  const kinds: ObjectiveKind[] = ["clearTotal", "survive", "earnSalvage", "avoidHullDamage"];
  if (getStageIndex(state.level) >= 2) {
    kinds.push("clearHeavy");
  }
  return kinds;
}

function randomObjectiveKind(
  state: GameState,
  candidates: ObjectiveKind[],
  blocked: ObjectiveKind[],
) {
  const filtered = candidates.filter((kind) => !blocked.includes(kind));
  const list = filtered.length > 0 ? filtered : candidates;
  const { seed, value } = roll(state.rngSeed);
  const picked = list[Math.floor(value * list.length)] ?? list[0];
  return { seed, picked };
}

function addObjective(state: GameState): GameState {
  const stageIndex = getStageIndex(state.level);
  const blocked = state.objectives.map((objective) => objective.kind);
  const { seed, picked } = randomObjectiveKind(state, getObjectiveKinds(state), blocked);
  const target =
    picked === "clearTotal"
      ? 14 + stageIndex * 4
      : picked === "clearHeavy"
        ? 3 + Math.max(0, stageIndex - 1)
        : picked === "survive"
          ? 24 + stageIndex * 6
          : picked === "earnSalvage"
            ? 70 + stageIndex * 25
            : 18 + stageIndex * 4;

  const baseline =
    picked === "clearTotal"
      ? state.totalClears
      : picked === "clearHeavy"
        ? state.heavyClears
        : picked === "earnSalvage"
          ? state.salvage
          : state.elapsedMs;

  const objective: Objective = {
    id: state.nextObjectiveId,
    kind: picked,
    label: objectiveLabel(picked, target),
    target,
    progress: 0,
    baseline,
    rewardSalvage: 15 + stageIndex * 5,
    rewardXp: 18 + stageIndex * 6,
  };

  return {
    ...state,
    rngSeed: seed,
    nextObjectiveId: state.nextObjectiveId + 1,
    objectives: [...state.objectives, objective],
  };
}

function calculateObjectiveProgress(state: GameState, objective: Objective) {
  switch (objective.kind) {
    case "clearTotal":
      return state.totalClears - objective.baseline;
    case "clearHeavy":
      return state.heavyClears - objective.baseline;
    case "survive":
      return (state.elapsedMs - objective.baseline) / 1000;
    case "earnSalvage":
      return state.salvage - objective.baseline;
    case "avoidHullDamage":
      return (state.elapsedMs - Math.max(objective.baseline, state.lastHullDamageAt)) / 1000;
  }
}

export function getObjectiveProgressText(objective: Objective) {
  const rounded = objective.kind === "survive" || objective.kind === "avoidHullDamage";
  return `${Math.min(objective.target, rounded ? Math.floor(objective.progress) : objective.progress)} / ${objective.target}`;
}

function updateObjectives(state: GameState) {
  let next = state;
  let totalRewardSalvage = 0;
  let totalRewardXp = 0;

  const refreshed = next.objectives
    .map((objective) => {
      const progress = calculateObjectiveProgress(next, objective);
      if (!objective.completedAt && progress >= objective.target) {
        totalRewardSalvage += objective.rewardSalvage;
        totalRewardXp += objective.rewardXp;
        return {
          ...objective,
          progress,
          completedAt: next.elapsedMs,
        };
      }

      return {
        ...objective,
        progress,
      };
    })
    .filter((objective) => {
      if (!objective.completedAt) {
        return true;
      }
      return next.elapsedMs - objective.completedAt < OBJECTIVE_REPLACE_DELAY;
    });

  next = {
    ...next,
    objectives: refreshed,
  };

  if (totalRewardSalvage > 0 || totalRewardXp > 0) {
    next = rewardState(next, totalRewardSalvage, totalRewardXp);
    next = setToast(next, "Objective complete", "reward");
  }

  while (next.objectives.length < MAX_OBJECTIVES) {
    next = addObjective(next);
  }

  return next;
}

function distance(aX: number, aY: number, bX: number, bY: number) {
  return Math.hypot(aX - bX, aY - bY);
}

function getSpawnWeights(state: GameState, isBurst: boolean) {
  const weights: Partial<Record<DebrisKind, number>> = {
    ...getDebrisSpawnWeights(state.level),
  };

  if (isBurst) {
    if (weights.heavy !== undefined) {
      weights.heavy *= 1.2;
    }
    if (weights.tank !== undefined) {
      weights.tank *= 1.05;
    }
    if (weights.corrosive !== undefined) {
      weights.corrosive *= 1.12;
    }
    if (weights.splatter !== undefined) {
      weights.splatter *= 1.08;
    }
    if (weights.unstable !== undefined) {
      weights.unstable *= 1.06;
    }
    weights.normal = Math.max(50, (weights.normal ?? 70) * 0.9);
  }

  return weights;
}

function getEligibleSpawnWeights(state: GameState, isBurst: boolean) {
  const weights = getSpawnWeights(state, isBurst);
  const activeCounts = state.debris.reduce(
    (counts, debris) => {
      counts[debris.kind] += 1;
      return counts;
    },
    {
      normal: 0,
      heavy: 0,
      corrosive: 0,
      unstable: 0,
      tank: 0,
      splatter: 0,
    } as Record<DebrisKind, number>,
  );

  const eligibleEntries = (Object.entries(weights) as [DebrisKind, number][])
    .filter(([kind, weight]) => {
      if (weight <= 0) {
        return false;
      }
      return activeCounts[kind] < getDebrisTypeCap(state.level, kind);
    });

  if (eligibleEntries.length === 0) {
    return {
      seed: state.rngSeed,
      weights: {} as Partial<Record<DebrisKind, number>>,
      activeCounts,
      caps: getActiveDebrisCaps(state.level),
    };
  }

  return {
    seed: state.rngSeed,
    weights: Object.fromEntries(eligibleEntries) as Partial<Record<DebrisKind, number>>,
    activeCounts,
    caps: getActiveDebrisCaps(state.level),
  };
}

function getSpawnChanceMultiplier(activeDebris: number, softTotalCap: number) {
  return activeDebris >= softTotalCap ? 0.4 : 1;
}

function pickDebrisKind(state: GameState, isBurst: boolean) {
  const eligible = getEligibleSpawnWeights(state, isBurst);
  const weights = eligible.weights;
  if (Object.keys(weights).length === 0) {
    return { seed: eligible.seed, picked: undefined };
  }
  let total = 0;
  for (const value of Object.values(weights)) {
    total += value;
  }

  const { seed, value } = roll(state.rngSeed);
  let cursor = value * total;
  let picked: DebrisKind = "normal";

  for (const [kind, weight] of Object.entries(weights) as [DebrisKind, number][]) {
    cursor -= weight;
    if (cursor <= 0) {
      picked = kind;
      break;
    }
  }

  return { seed, picked };
}

function pickDebrisBehavior(
  seed: number,
  level: number,
  kind: DebrisKind,
) {
  const rates = getDebrisBehaviorRates(level);
  const entries: [DebrisBehavior, number][] = [];

  if (rates.drift > 0) {
    entries.push(["drift", rates.drift]);
  }
  if (rates.sticky > 0 && kind !== "unstable") {
    if (kind !== "splatter") {
      entries.push(["sticky", rates.sticky]);
    }
  }
  if (rates.swift > 0 && kind !== "heavy" && kind !== "tank" && kind !== "splatter") {
    entries.push(["swift", rates.swift]);
  }

  if (entries.length === 0) {
    return {
      seed,
      behavior: undefined as DebrisBehavior | undefined,
      driftVelocityX: undefined as number | undefined,
    };
  }

  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  const behaviorRoll = roll(seed);
  if (behaviorRoll.value > total) {
    return {
      seed: behaviorRoll.seed,
      behavior: undefined as DebrisBehavior | undefined,
      driftVelocityX: undefined as number | undefined,
    };
  }

  let cursor = behaviorRoll.value;
  let picked: DebrisBehavior = entries[0][0];
  for (const [behavior, rate] of entries) {
    cursor -= rate;
    if (cursor <= 0) {
      picked = behavior;
      break;
    }
  }

  if (picked !== "drift") {
    return {
      seed: behaviorRoll.seed,
      behavior: picked,
      driftVelocityX: undefined as number | undefined,
    };
  }

  const directionRoll = roll(behaviorRoll.seed);
  return {
    seed: directionRoll.seed,
    behavior: "drift" as const,
    driftVelocityX: (directionRoll.value - 0.5) * 5.2,
  };
}

function randomTargetPosition(state: GameState) {
  let seed = state.rngSeed;
  let x = 50;
  let y = 50;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const rollX = roll(seed);
    seed = rollX.seed;
    const rollY = roll(seed);
    seed = rollY.seed;

    x = 13 + rollX.value * 74;
    y = 18 + rollY.value * 60;

    const overlapping = state.debris.some((debris) => distance(x, y, debris.x, debris.targetY) < 10);
    if (!overlapping) {
      break;
    }
  }

  return { seed, x, y };
}

function maybeSpawnSplitFragments(state: GameState, source: Debris) {
  const splitChance = getSplitChance(source);
  if (splitChance <= 0) {
    return { state, fragments: [] as Debris[] };
  }

  const splitRoll = roll(state.rngSeed);
  if (splitRoll.value > splitChance) {
    return {
      state: {
        ...state,
        rngSeed: splitRoll.seed,
      },
      fragments: [] as Debris[],
    };
  }

  let next: GameState = {
    ...state,
    rngSeed: splitRoll.seed,
  };
  const fragments: Debris[] = [];

  for (let index = 0; index < 1; index += 1) {
    const offsetXRoll = roll(next.rngSeed);
    const offsetYRoll = roll(offsetXRoll.seed);
    const fallRoll = roll(offsetYRoll.seed);
    const normalVariantRoll = getRandomNormalDebrisVariant(fallRoll.seed);

    const x = clamp(source.x + (offsetXRoll.value - 0.5) * 10, 12, 88);
    const targetY = clamp(source.targetY + (offsetYRoll.value - 0.5) * 8, 18, 82);
    const hp = 0.8;

    const fragment: Debris = {
      id: next.nextDebrisId,
      kind: "normal",
      isFragment: true,
      ...createDebrisVisualState("normal", "flying", hp, hp, normalVariantRoll.variant),
      x,
      targetY,
      hp,
      maxHp: hp,
      ageMs: 0,
      fallDurationMs: 430 + fallRoll.value * 240,
    };

    fragments.push(fragment);
    next = {
      ...next,
      rngSeed: normalVariantRoll.seed,
      nextDebrisId: next.nextDebrisId + 1,
    };
  }

  next = pushEffect(next, {
    x: source.x,
    y: source.targetY,
    label: "Split",
    kind: "danger",
    tone: EFFECT_TONE.danger,
    lifeMs: 420,
  });

  return { state: next, fragments };
}

function spawnSplatterCorrosiveCluster(state: GameState, source: Debris) {
  let next = state;
  const fragments: Debris[] = [];
  const baseAngles = Array.from({ length: SPLATTER_CORROSIVE_SPAWN_COUNT }, (_, index) =>
    (Math.PI * 2 * index) / SPLATTER_CORROSIVE_SPAWN_COUNT,
  );
  const hp =
    getDebrisHp("corrosive", Math.max(3, state.level)) *
    getDifficultyMultipliers(state.difficulty).debrisHpMultiplier;

  for (const angle of baseAngles) {
    const radiusRoll = roll(next.rngSeed);
    const angleRoll = roll(radiusRoll.seed);
    const fallRoll = roll(angleRoll.seed);
    const radius = 5.5 + radiusRoll.value * 3.5;
    const offsetAngle = angle + (angleRoll.value - 0.5) * 0.36;
    const x = clamp(source.x + Math.cos(offsetAngle) * radius, 12, 88);
    const targetY = clamp(source.targetY + Math.sin(offsetAngle) * (radius * 0.75), 18, 82);
    const fallDurationMs = 260 + fallRoll.value * 120;
    const spawnProgress = clamp((source.targetY + 12) / (targetY + 12), 0.7, 0.96);
    const startingAgeMs = Math.round(fallDurationMs * spawnProgress);
    const driftDirection = x >= source.x ? 1 : -1;

    fragments.push({
      id: next.nextDebrisId,
      kind: "corrosive",
      ...createDebrisVisualState("corrosive", "flying", hp, hp),
      isFragment: true,
      x,
      targetY,
      hp,
      maxHp: hp,
      ageMs: startingAgeMs,
      fallDurationMs,
      behavior: "drift",
      driftVelocityX: driftDirection * (5 + fallRoll.value * 8),
    });

    next = {
      ...next,
      rngSeed: fallRoll.seed,
      nextDebrisId: next.nextDebrisId + 1,
    };
  }

  next = pushEffect(next, {
    x: source.x,
    y: source.targetY,
    label: "Splatter",
    kind: "danger",
    tone: EFFECT_TONE.danger,
    lifeMs: 620,
  });

  return { state: next, fragments };
}

function getPickupRespawnDelay(seed: number, retry = false) {
  const rolled = roll(seed);
  const min = retry ? PICKUP_RETRY_MIN_MS : PICKUP_RESPAWN_MIN_MS;
  const range = retry ? PICKUP_RETRY_RANGE_MS : PICKUP_RESPAWN_RANGE_MS;
  return {
    seed: rolled.seed,
    delayMs: Math.round(min + rolled.value * range),
  };
}

function getMovingPowerupRespawnDelay(seed: number, retry = false) {
  const rolled = roll(seed);
  const min = retry ? MOVING_POWERUP_RETRY_MIN_MS : MOVING_POWERUP_RESPAWN_MIN_MS;
  const range = retry ? MOVING_POWERUP_RETRY_RANGE_MS : MOVING_POWERUP_RESPAWN_RANGE_MS;
  return {
    seed: rolled.seed,
    delayMs: Math.round(min + rolled.value * range),
  };
}

function getBotRespawnDelay(seed: number, derived: ReturnType<typeof getDerivedStats>) {
  const rolled = roll(seed);
  return {
    seed: rolled.seed,
    delayMs: Math.round(derived.turretBotRespawnMs + rolled.value * BOT_RESPAWN_RANGE_MS),
  };
}

function getRogueBotRespawnDelay(seed: number, difficulty: DifficultyMode) {
  const rolled = roll(seed);
  const difficultyMultipliers = getDifficultyMultipliers(difficulty);
  return {
    seed: rolled.seed,
    delayMs: Math.round(
      (ROGUE_BOT_RESPAWN_MIN_MS + rolled.value * ROGUE_BOT_RESPAWN_RANGE_MS) *
        difficultyMultipliers.rogueBotRespawnMultiplier,
    ),
  };
}

export function getMovingShieldPowerupChance(shieldPercent: number, hullPercent: number) {
  if (shieldPercent >= 0.72) {
    return 0;
  }
  if (shieldPercent > 0.42) {
    return hullPercent <= 0.35 ? 0.14 : 0.1;
  }
  if (shieldPercent > 0.18) {
    return hullPercent <= 0.35 ? 0.22 : 0.16;
  }
  return hullPercent <= 0.35 ? 0.3 : 0.24;
}

export function getMovingHullPowerupChance(hullPercent: number) {
  if (hullPercent >= 0.82) {
    return 0;
  }
  if (hullPercent > 0.58) {
    return 0.045;
  }
  if (hullPercent > 0.38) {
    return 0.085;
  }
  if (hullPercent > 0.2) {
    return 0.125;
  }
  return 0.18;
}

function pickHelpfulBotKind(state: GameState) {
  const fallingDebris = state.debris.filter((debris) => getDebrisMotionState(debris) === "falling").length;
  const dangerousDebris = state.debris.filter(
    (debris) =>
      debris.kind === "corrosive" || debris.kind === "unstable" || debris.kind === "splatter",
  ).length;
  const weights: Record<Exclude<BotKind, "rogue">, number> = {
    shield: state.shield < state.maxShield - 12 ? 1.2 : 0.8,
    scrap: state.debris.length >= 5 ? 1.2 : 1,
    stabilizer: fallingDebris >= 3 ? 1.15 : 0.95,
    turret: dangerousDebris >= 2 ? 1.15 : 1,
  };

  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
  const rolled = roll(state.rngSeed);
  let cursor = rolled.value * totalWeight;
  let picked: Exclude<BotKind, "rogue"> = "shield";

  for (const [kind, weight] of Object.entries(weights) as [Exclude<BotKind, "rogue">, number][]) {
    cursor -= weight;
    if (cursor <= 0) {
      picked = kind;
      break;
    }
  }

  return {
    seed: rolled.seed,
    picked,
  };
}

function randomPickupPosition(state: GameState, seed: number) {
  let nextSeed = seed;
  let x = 50;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const rollX = roll(nextSeed);
    nextSeed = rollX.seed;
    x = 16 + rollX.value * 68;

    const overlappingDebris = state.debris.some((debris) => distance(x, 20, debris.x, debris.targetY) < 12);
    const overlappingPickup = state.pickups.some((pickup) => distance(x, 16, pickup.x, 16) < 14);
    if (!overlappingDebris && !overlappingPickup) {
      break;
    }
  }

  return { seed: nextSeed, x };
}

function countMovingPowerups(state: GameState, kind: PickupKind) {
  return state.powerups.filter((powerup) => powerup.kind === kind).length;
}

function getPowerupTravelLifeMs(
  x: number,
  y: number,
  velocityX: number,
  velocityY: number,
) {
  const travelTimes: number[] = [];

  if (velocityX > 0) {
    travelTimes.push((114 - x) / velocityX);
  } else if (velocityX < 0) {
    travelTimes.push((-14 - x) / velocityX);
  }

  if (velocityY > 0) {
    travelTimes.push((114 - y) / velocityY);
  } else if (velocityY < 0) {
    travelTimes.push((-14 - y) / velocityY);
  }

  const lifeSeconds = travelTimes
    .filter((time) => Number.isFinite(time) && time > 0)
    .reduce((shortest, time) => Math.min(shortest, time), Number.POSITIVE_INFINITY);

  return Math.round((Number.isFinite(lifeSeconds) ? lifeSeconds : 2.8) * 1000);
}

function createMovingPowerupFromEdge(
  state: GameState,
  kind: PickupKind,
  value: number,
  seed: number,
) {
  let nextSeed = seed;
  const sideRoll = roll(nextSeed);
  nextSeed = sideRoll.seed;
  const laneRoll = roll(nextSeed);
  nextSeed = laneRoll.seed;
  const margin = 8;
  const spanX = 22 + laneRoll.value * 56;
  const spanY = 24 + laneRoll.value * 52;
  const sideIndex = Math.floor(sideRoll.value * 4);
  let x = 50;
  let y = 50;
  let velocityX = 0;
  let velocityY = 0;
  let entrySide: RecoveryPowerup["entrySide"] = "left";

  switch (sideIndex) {
    case 0:
      x = spanX;
      y = -margin;
      velocityY = MOVING_POWERUP_SPEED;
      entrySide = "top";
      break;
    case 1:
      x = spanX;
      y = 100 + margin;
      velocityY = -MOVING_POWERUP_SPEED;
      entrySide = "bottom";
      break;
    case 2:
      x = -margin;
      y = spanY;
      velocityX = MOVING_POWERUP_SPEED;
      entrySide = "left";
      break;
    default:
      x = 100 + margin;
      y = spanY;
      velocityX = -MOVING_POWERUP_SPEED;
      entrySide = "right";
      break;
  }

  const travelDistance =
    entrySide === "top" || entrySide === "bottom" ? 116 : 116;

  return {
    seed: nextSeed,
    powerup: {
      id: state.nextPowerupId,
      kind,
      x,
      y,
      velocityX,
      velocityY,
      value,
      ageMs: 0,
      lifeMs: Math.round((travelDistance / MOVING_POWERUP_SPEED) * 1000),
      entrySide,
    } satisfies RecoveryPowerup,
  };
}

function createMovingPowerupFromBot(
  state: GameState,
  bot: SupportBot,
  kind: PickupKind,
  value: number,
  seed: number,
) {
  let nextSeed = seed;
  const angleRoll = roll(nextSeed);
  nextSeed = angleRoll.seed;
  const centerAngle = Math.atan2(50 - bot.y, 50 - bot.x);
  const angle = centerAngle + (angleRoll.value - 0.5) * 0.6;
  const velocityX = Math.cos(angle) * MOVING_POWERUP_SPEED;
  const velocityY = Math.sin(angle) * MOVING_POWERUP_SPEED;
  const lifeMs = getPowerupTravelLifeMs(bot.x, bot.y, velocityX, velocityY);

  return {
    seed: nextSeed,
    powerup: {
      id: state.nextPowerupId,
      kind,
      x: bot.x,
      y: bot.y,
      velocityX,
      velocityY,
      value,
      ageMs: 0,
      lifeMs,
      entrySide: "bot",
    } satisfies RecoveryPowerup,
  };
}

function maybeSpawnMovingPowerup(state: GameState) {
  const derived = getDerivedStats(state);
  const shieldPercent = state.shield / state.maxShield;
  const hullPercent = state.hull / state.maxHull;
  const canSpawnShield =
    countMovingPowerups(state, "shield") === 0 && state.shield < state.maxShield - 15;
  const canSpawnHull = countMovingPowerups(state, "hull") === 0 && state.hull < state.maxHull - 10;
  const shieldChance = canSpawnShield
    ? Math.min(0.34, getMovingShieldPowerupChance(shieldPercent, hullPercent) * derived.pickupChanceMultiplier)
    : 0;
  const hullChance = canSpawnHull
    ? Math.min(0.22, getMovingHullPowerupChance(hullPercent) * derived.pickupChanceMultiplier)
    : 0;
  const retryDelay = getMovingPowerupRespawnDelay(state.rngSeed, shieldChance <= 0 && hullChance <= 0);

  let next: GameState = {
    ...state,
    rngSeed: retryDelay.seed,
    movingPowerupCooldownMs: retryDelay.delayMs,
  };

  if (shieldChance <= 0 && hullChance <= 0) {
    return next;
  }

  const shieldRoll = roll(next.rngSeed);
  const hullRoll = roll(shieldRoll.seed);
  next = {
    ...next,
    rngSeed: hullRoll.seed,
  };

  const spawnedKinds: PickupKind[] = [];
  if (shieldChance > 0 && shieldRoll.value <= shieldChance) {
    spawnedKinds.push("shield");
  }
  if (hullChance > 0 && hullRoll.value <= hullChance) {
    spawnedKinds.push("hull");
  }

  if (spawnedKinds.length === 0) {
    return next;
  }

  const picked =
    spawnedKinds.length === 1
      ? spawnedKinds[0]
      : shieldPercent <= hullPercent
        ? "shield"
        : "hull";
  const created = createMovingPowerupFromEdge(
    next,
    picked,
    picked === "shield" ? MOVING_POWERUP_SHIELD_VALUE : MOVING_POWERUP_HULL_VALUE,
    next.rngSeed,
  );

  next = {
    ...next,
    rngSeed: created.seed,
    nextPowerupId: next.nextPowerupId + 1,
    powerups: [...next.powerups, created.powerup],
  };

  return setToast(next, picked === "shield" ? "Shield powerup drifting in" : "Hull powerup drifting in", "info");
}

function maybeSpawnBotPowerup(state: GameState, bot: SupportBot) {
  const shieldPercent = state.shield / state.maxShield;
  const hullPercent = state.hull / state.maxHull;
  const canSpawnShield =
    countMovingPowerups(state, "shield") === 0 && state.shield < state.maxShield - 15;
  const canSpawnHull = countMovingPowerups(state, "hull") === 0 && state.hull < state.maxHull - 10;
  const entries: Array<{ kind: PickupKind; weight: number; value: number }> = [];

  if (canSpawnShield) {
    entries.push({
      kind: "shield",
      weight: shieldPercent <= 0.18 ? 2.1 : shieldPercent <= 0.42 ? 1.45 : 0.9,
      value: MOVING_POWERUP_SHIELD_VALUE,
    });
  }
  if (canSpawnHull) {
    entries.push({
      kind: "hull",
      weight: hullPercent <= 0.2 ? 1.55 : hullPercent <= 0.45 ? 1.1 : 0.65,
      value: MOVING_POWERUP_HULL_VALUE,
    });
  }

  if (entries.length === 0) {
    return state;
  }

  const chanceRoll = roll(state.rngSeed);
  if (chanceRoll.value > BOT_POWERUP_DROP_CHANCE) {
    return {
      ...state,
      rngSeed: chanceRoll.seed,
    };
  }

  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  const kindRoll = roll(chanceRoll.seed);
  let cursor = kindRoll.value * totalWeight;
  let picked = entries[0];

  for (const entry of entries) {
    cursor -= entry.weight;
    if (cursor <= 0) {
      picked = entry;
      break;
    }
  }

  const created = createMovingPowerupFromBot(state, bot, picked.kind, picked.value, kindRoll.seed);
  let next: GameState = {
    ...state,
    rngSeed: created.seed,
    nextPowerupId: state.nextPowerupId + 1,
    powerups: [...state.powerups, created.powerup],
  };

  next = pushEffect(next, {
    x: bot.x,
    y: bot.y,
    label: picked.kind === "shield" ? "Drop +" : "Drop H",
    kind: "reward",
    tone: picked.kind === "shield" ? EFFECT_TONE.info : EFFECT_TONE.reward,
    lifeMs: 620,
  });

  return setToast(next, picked.kind === "shield" ? "Bot dropped shield power" : "Bot dropped hull power", "reward");
}

function maybeSpawnPickup(state: GameState) {
  const derived = getDerivedStats(state);
  const canSpawnShield = !state.pickups.some((pickup) => pickup.kind === "shield") && state.shield < state.maxShield - 1;
  const canSpawnHull = !state.pickups.some((pickup) => pickup.kind === "hull") && state.hull < state.maxHull;
  const shieldPercent = state.shield / state.maxShield;
  const hullPercent = state.hull / state.maxHull;
  const hullDangerBoost = hullPercent <= 0.15 ? 0.004 : hullPercent <= 0.3 ? 0.002 : 0;
  const shieldChance = canSpawnShield
    ? Math.min(0.05, (getShieldPickupChance(shieldPercent) + hullDangerBoost) * derived.pickupChanceMultiplier)
    : 0;
  const hullChance = canSpawnHull
    ? Math.min(0.03, getHullPickupChance(hullPercent) * derived.pickupChanceMultiplier)
    : 0;

  const baseDelay = getPickupRespawnDelay(state.rngSeed);
  let next: GameState = {
    ...state,
    rngSeed: baseDelay.seed,
    pickupCooldownMs: baseDelay.delayMs,
  };

  if (shieldChance <= 0 && hullChance <= 0) {
    return next;
  }

  const shieldRoll = roll(next.rngSeed);
  const hullRoll = roll(shieldRoll.seed);
  const spawnedKinds: PickupKind[] = [];
  next = {
    ...next,
    rngSeed: hullRoll.seed,
  };

  if (shieldChance > 0 && shieldRoll.value <= shieldChance) {
    spawnedKinds.push("shield");
  }
  if (hullChance > 0 && hullRoll.value <= hullChance) {
    spawnedKinds.push("hull");
  }

  if (spawnedKinds.length === 0) {
    return next;
  }

  const picked =
    spawnedKinds.length === 1
      ? spawnedKinds[0]
      : shieldPercent <= hullPercent
        ? "shield"
        : "hull";

  const positionRoll = randomPickupPosition(next, next.rngSeed);
  const fallRoll = roll(positionRoll.seed);
  const pickup: Pickup = {
    id: next.nextPickupId,
    kind: picked,
    x: positionRoll.x,
    targetY: 92,
    ageMs: 0,
    fallDurationMs: Math.round(PICKUP_FALL_MIN_MS + fallRoll.value * PICKUP_FALL_RANGE_MS),
  };

  return {
    ...next,
    rngSeed: fallRoll.seed,
    nextPickupId: next.nextPickupId + 1,
    pickups: [...next.pickups, pickup],
  };
}

function pushBotShot(
  state: GameState,
  shot: Omit<BotShot, "id" | "ageMs">,
) {
  return {
    ...state,
    nextBotShotId: state.nextBotShotId + 1,
    botShots: [
      ...state.botShots,
      {
        id: state.nextBotShotId,
        ageMs: 0,
        ...shot,
      },
    ],
  };
}

function getBotToastLabel(kind: BotKind) {
  return kind === "shield"
    ? "Shield bot active"
    : kind === "scrap"
      ? "Scrap bot active"
      : kind === "stabilizer"
        ? "Stabilizer bot active"
        : kind === "turret"
          ? "Turret bot active"
          : "Rogue bot active";
}

function isHelpfulBotKind(kind: BotKind) {
  return kind !== "rogue";
}

function getRoguePayloadCooldown(seed: number) {
  const rolled = roll(seed);
  return {
    seed: rolled.seed,
    delayMs: Math.round(ROGUE_BOT_SPIT_MIN_MS + rolled.value * ROGUE_BOT_SPIT_RANGE_MS),
  };
}

function planIncomingBot(state: GameState, kind: BotKind) {
  let seed = state.rngSeed;
  const directionRoll = roll(seed);
  seed = directionRoll.seed;
  const laneRoll = roll(seed);
  seed = laneRoll.seed;
  const side: IncomingBotWarning["side"] = directionRoll.value < 0.5 ? "left" : "right";
  const y = 28 + laneRoll.value * 40;

  return {
    ...state,
    rngSeed: seed,
    incomingBotWarning: {
      kind,
      y,
      side,
      ttlMs: BOT_WARNING_MS,
    },
  };
}

function spawnActiveBot(state: GameState, warning: IncomingBotWarning) {
  if (state.activeBot) {
    return state;
  }

  const derived = getDerivedStats(state);
  const side = warning.side === "left" ? 1 : -1;
  const x = side === 1 ? 10 : 90;
  const travelDistance = 80;
  const velocityX = (travelDistance / (derived.botLifetimeMs / 1000)) * side;
  const cooldownRoll =
    warning.kind === "rogue"
      ? getRogueBotRespawnDelay(state.rngSeed, state.difficulty)
      : getBotRespawnDelay(state.rngSeed, derived);
  const payloadRoll = getRoguePayloadCooldown(cooldownRoll.seed);

  return setToast(
    {
      ...state,
      rngSeed: payloadRoll.seed,
      botCooldownMs: warning.kind === "rogue" ? state.botCooldownMs : cooldownRoll.delayMs,
      rogueBotCooldownMs:
        warning.kind === "rogue" ? cooldownRoll.delayMs : state.rogueBotCooldownMs,
      incomingBotWarning: undefined,
      activeBot: {
        kind: warning.kind,
        x,
        y: warning.y,
        velocityX,
        velocityY: 0,
        baseY: warning.y,
        entrySide: warning.side,
        ageMs: 0,
        lifeMs: derived.botLifetimeMs,
        fireCooldownMs: 0,
        payloadCooldownMs: payloadRoll.delayMs,
        wobblePhase: payloadRoll.seed % 360,
      },
    },
    getBotToastLabel(warning.kind),
    warning.kind === "rogue" ? "danger" : "info",
  );
}

function spawnDebris(state: GameState, isBurst = false): GameState {
  const derived = getDerivedStats(state);
  const spawnChanceMultiplier = getSpawnChanceMultiplier(state.debris.length, derived.totalActiveDebrisCap);
  const spawnRoll = roll(state.rngSeed);

  if (spawnRoll.value > spawnChanceMultiplier) {
    return {
      ...state,
      rngSeed: spawnRoll.seed,
    };
  }

  const kindRoll = pickDebrisKind({ ...state, rngSeed: spawnRoll.seed }, isBurst);
  if (!kindRoll.picked) {
    return {
      ...state,
      rngSeed: kindRoll.seed,
    };
  }
  const positionRoll = randomTargetPosition({ ...state, rngSeed: kindRoll.seed });
  const fallRoll = roll(positionRoll.seed);
  const behaviorRoll = pickDebrisBehavior(fallRoll.seed, state.level, kindRoll.picked);
  const normalVariantRoll =
    kindRoll.picked === "normal"
      ? getRandomNormalDebrisVariant(behaviorRoll.seed)
      : undefined;
  const splatterVariantRoll =
    kindRoll.picked === "splatter"
      ? getRandomSplatterDebrisVariant(normalVariantRoll?.seed ?? behaviorRoll.seed)
      : undefined;
  const stickyMultiplier = behaviorRoll.behavior === "sticky" ? 1.18 : 1;
  const swiftMultiplier = behaviorRoll.behavior === "swift" ? 0.8 : 1;
  const hp =
    getDebrisHp(kindRoll.picked, state.level) *
    derived.difficulty.debrisHpMultiplier *
    stickyMultiplier;

  const debris: Debris = {
    id: state.nextDebrisId,
    kind: kindRoll.picked,
    ...createDebrisVisualState(
      kindRoll.picked,
      "flying",
      hp,
      hp,
      splatterVariantRoll?.variant ?? normalVariantRoll?.variant,
    ),
    x: positionRoll.x,
    targetY: positionRoll.y,
    hp,
    maxHp: hp,
    ageMs: 0,
    fallDurationMs: (850 + fallRoll.value * 450) * swiftMultiplier,
    behavior: behaviorRoll.behavior,
    driftVelocityX: behaviorRoll.driftVelocityX,
  };

  return {
    ...state,
    rngSeed: splatterVariantRoll?.seed ?? normalVariantRoll?.seed ?? behaviorRoll.seed,
    nextDebrisId: state.nextDebrisId + 1,
    debris: [...state.debris, debris],
  };
}

function spawnWave(state: GameState, count: number, isBurst = false) {
  let next = state;
  for (let index = 0; index < count; index += 1) {
    next = spawnDebris(next, isBurst);
  }
  return next;
}

function tickEffects(state: GameState, deltaMs: number) {
  return state.effects
    .map((effect) => ({ ...effect, ageMs: effect.ageMs + deltaMs }))
    .filter((effect) => effect.ageMs < effect.lifeMs);
}

function tickPickups(state: GameState, deltaMs: number) {
  return state.pickups
    .map((pickup) => ({ ...pickup, ageMs: pickup.ageMs + deltaMs }))
    .filter((pickup) => pickup.ageMs < pickup.fallDurationMs);
}

function tickMovingPowerups(state: GameState, deltaMs: number) {
  const deltaSeconds = deltaMs / 1000;
  return state.powerups
    .map((powerup) => ({
      ...powerup,
      ageMs: powerup.ageMs + deltaMs,
      x: powerup.x + powerup.velocityX * deltaSeconds,
      y: powerup.y + powerup.velocityY * deltaSeconds,
    }))
    .filter(
      (powerup) =>
        powerup.ageMs < powerup.lifeMs &&
        powerup.x >= -14 &&
        powerup.x <= 114 &&
        powerup.y >= -14 &&
        powerup.y <= 114,
    );
}

function stepCooldown(current: number, deltaMs: number, cooldownRate: number) {
  return Math.max(0, current - deltaMs * cooldownRate);
}

function applyDamage(state: GameState, damage: number) {
  const scaledDamage = damage * getDifficultyMultipliers(state.difficulty).incomingDamageMultiplier;

  if (scaledDamage <= 0) {
    return state;
  }

  let shield = state.shield;
  let hull = state.hull;
  let hullDamageTaken = 0;

  if (shield >= scaledDamage) {
    shield -= scaledDamage;
  } else {
    const remainder = scaledDamage - shield;
    shield = 0;
    hull = Math.max(0, hull - remainder);
    hullDamageTaken = remainder;
  }

  const nextState: GameState = {
    ...state,
    shield,
    hull,
    lastHullDamageAt: hullDamageTaken > 0 ? state.elapsedMs : state.lastHullDamageAt,
  };

  if (hull <= 0) {
    const breachedState: GameState = {
      ...nextState,
      mode: "gameOver",
      bestSalvage: Math.max(nextState.bestSalvage, nextState.salvage),
      toast: { label: "Hull breach", tone: "danger", ttlMs: 2200 },
    };

    return breachedState;
  }

  return nextState;
}

function applyPassiveIncome(state: GameState, deltaMs: number) {
  let next = state;
  let timer = state.incomeCooldownMs - deltaMs;

  while (timer <= 0) {
    const stageIndex = getStageIndex(next.level);
    next = rewardState(next, 2 + stageIndex, 0);
    timer += PASSIVE_INCOME_INTERVAL;
  }

  return {
    ...next,
    incomeCooldownMs: timer,
  };
}

function clampBoardPoint(x: number, y: number) {
  return {
    x: clamp(x, 10, 90),
    y: clamp(y, 16, 86),
  };
}

function updateVacuumTarget(state: GameState, x: number, y: number, active: boolean) {
  const point = clampBoardPoint(x, y);
  return {
    ...state,
    vacuumTargetX: point.x,
    vacuumTargetY: point.y,
    isVacuumActive: active,
  };
}

function applyClearRewards(
  state: GameState,
  baseSalvage: number,
  baseXp: number,
  clears: number,
  comboIncrement = clears,
  useComboBoost = true,
) {
  if (clears <= 0) {
    return state;
  }

  const nextComboCount =
    comboIncrement > 0 ? (state.comboTimerMs > 0 ? state.comboCount + comboIncrement : comboIncrement) : state.comboCount;
  const comboMultiplier = useComboBoost ? getComboMultiplier(nextComboCount) : 1;

  return rewardState(
    {
      ...state,
      comboCount: comboIncrement > 0 ? nextComboCount : state.comboCount,
      comboTimerMs: comboIncrement > 0 ? COMBO_WINDOW_MS : state.comboTimerMs,
    },
    baseSalvage * comboMultiplier,
    baseXp,
  );
}

function detonateRogueBot(state: GameState, bot: SupportBot) {
  const derived = getDerivedStats(state);
  let next = state;
  let salvageGain = 0;
  let xpGain = 0;
  let clears = 0;
  let heavyClears = 0;
  let dangerousClears = 0;
  const splitFragments: Debris[] = [];
  const remaining: Debris[] = [];

  for (const debris of next.debris) {
    if (distance(bot.x, bot.y, debris.x, debris.targetY) > derived.rogueBotBlastRadius) {
      remaining.push(debris);
      continue;
    }

    const reward = getDebrisRewards(debris);
    salvageGain += reward.salvage;
    xpGain += reward.xp;
    clears += 1;
    if (isHeavyClassDebris(debris)) {
      heavyClears += 1;
    }
    if (isDangerousDebris(debris)) {
      dangerousClears += 1;
    }
    const splitResult = maybeSpawnSplitFragments(next, debris);
    next = splitResult.state;
    splitFragments.push(...splitResult.fragments);
  }

  next = pushEffect(next, {
    x: bot.x,
    y: bot.y,
    label: "Blast",
    kind: "danger",
    tone: EFFECT_TONE.reward,
    lifeMs: 700,
  });
  next = {
    ...next,
    activeBot: undefined,
    debris: [...remaining, ...splitFragments],
    totalClears: next.totalClears + clears,
    heavyClears: next.heavyClears + heavyClears,
    dangerousClears: next.dangerousClears + dangerousClears,
  };

  if (clears > 0) {
    next = applyClearRewards(next, salvageGain, xpGain, clears, 0, false);
  }

  return setToast(next, clears > 0 ? "Rogue blast cleared debris" : "Rogue bot popped", "reward");
}

function applySuction(state: GameState, deltaMs: number) {
  if (!state.isVacuumActive) {
    return {
      ...state,
      suctioningDebrisIds: [],
    };
  }

  const derived = getDerivedStats(state);
  const suctionDamage = derived.suctionPowerPerSecond * (deltaMs / 1000);
  const pulledDebris = state.debris.map((debris) => {
    if (debris.state === "exploding") {
      return debris;
    }

    const debrisDistance = distance(state.vacuumX, state.vacuumY, debris.x, debris.targetY);
    if (debrisDistance > derived.pullRadius || debrisDistance <= 0.001) {
      return debris;
    }

    const falloff = 1 - debrisDistance / derived.pullRadius;
    const weightedFalloff = 0.25 + falloff * 0.75;
    const pullSpeed = Math.min(derived.pullMaxVelocity, derived.pullBasePerSecond * weightedFalloff);
    const pullDistance = pullSpeed * (deltaMs / 1000);
    const moveRatio = Math.min(1, pullDistance / debrisDistance);

    return {
      ...debris,
      x: clamp(debris.x + (state.vacuumX - debris.x) * moveRatio, 10, 90),
      targetY: clamp(debris.targetY + (state.vacuumY - debris.targetY) * moveRatio, 16, 86),
    };
  });
  const suctionIds = pulledDebris
    .map((debris) => ({
      id: debris.id,
      state: debris.state,
      distance: distance(state.vacuumX, state.vacuumY, debris.x, debris.targetY),
    }))
    .filter((item) => item.state !== "exploding" && item.distance <= derived.vacuumRange)
    .map((item) => item.id);
  const suctionSet = new Set(suctionIds);

  let next: GameState = {
    ...state,
    debris: pulledDebris,
    suctioningDebrisIds: suctionIds,
  };

  const remaining: Debris[] = [];
  const splitFragments: Debris[] = [];
  let salvageGain = 0;
  let xpGain = 0;
  let clears = 0;
  let heavyClears = 0;
  let dangerousClears = 0;

  for (const debris of pulledDebris) {
    if (!suctionSet.has(debris.id)) {
      remaining.push(debris);
      continue;
    }

    const hp = debris.hp - suctionDamage;
    if (hp > 0) {
      remaining.push({
        ...debris,
        hp,
        ...transitionDebrisVisualState(debris, debris.state, hp),
      });
      continue;
    }

    const reward = getDebrisRewards(debris);
    salvageGain += reward.salvage;
    xpGain += reward.xp;
    clears += 1;

    if (isHeavyClassDebris(debris)) {
      heavyClears += 1;
    }

    if (isDangerousDebris(debris)) {
      dangerousClears += 1;
    }

    next = pushEffect(next, {
      x: debris.x,
      y: debris.targetY,
      label: `+${Math.max(1, Math.round(reward.salvage))}`,
      kind: "reward",
      tone: EFFECT_TONE.reward,
      lifeMs: 520,
    });

    const splitResult = maybeSpawnSplitFragments(next, debris);
    next = splitResult.state;
    splitFragments.push(...splitResult.fragments);
  }

  next = {
    ...next,
    debris: [...remaining, ...splitFragments],
    totalClears: next.totalClears + clears,
    heavyClears: next.heavyClears + heavyClears,
    dangerousClears: next.dangerousClears + dangerousClears,
  };

  if (salvageGain > 0 || xpGain > 0) {
    next = applyClearRewards(next, salvageGain, xpGain, clears, clears, true);
  }

  if (clears > 0) {
    next = pushEffect(next, {
      x: next.vacuumX,
      y: next.vacuumY,
      label: next.comboCount >= 3 ? `x${getComboMultiplier(next.comboCount).toFixed(2)}` : "Suck",
      kind: "tap",
      tone: EFFECT_TONE.info,
      lifeMs: 260,
    });
  }

  if (next.pickups.length > 0) {
    const remainingPickups: Pickup[] = [];

    for (const pickup of next.pickups) {
      const pickupY = getFallingY(pickup.targetY, pickup.ageMs, pickup.fallDurationMs);
      const collected =
        distance(next.vacuumX, next.vacuumY, pickup.x, pickupY) <= derived.vacuumRange * 0.92;

      if (!collected) {
        remainingPickups.push(pickup);
        continue;
      }

      if (pickup.kind === "shield") {
        next = {
          ...next,
          shield: Math.min(next.maxShield, next.shield + next.maxShield * 0.75),
        };
        next = pushEffect(next, {
          x: pickup.x,
          y: pickupY,
          label: "+75%",
          kind: "reward",
          tone: EFFECT_TONE.info,
          lifeMs: 620,
        });
        next = setToast(next, "Shield boosted", "reward");
      } else {
        next = {
          ...next,
          hull: Math.min(next.maxHull, next.hull + next.maxHull * 0.25),
        };
        next = pushEffect(next, {
          x: pickup.x,
          y: pickupY,
          label: "Hull",
          kind: "reward",
          tone: EFFECT_TONE.reward,
          lifeMs: 620,
        });
        next = setToast(next, "Hull patched", "reward");
      }
    }

    next = {
      ...next,
      pickups: remainingPickups,
    };
  }

  if (next.powerups.length > 0) {
    const remainingPowerups: RecoveryPowerup[] = [];

    for (const powerup of next.powerups) {
      const collected =
        distance(next.vacuumX, next.vacuumY, powerup.x, powerup.y) <= derived.vacuumRange * 0.98;

      if (!collected) {
        remainingPowerups.push(powerup);
        continue;
      }

      if (powerup.kind === "shield") {
        next = {
          ...next,
          shield: Math.min(next.maxShield, next.shield + powerup.value),
        };
        next = pushEffect(next, {
          x: powerup.x,
          y: powerup.y,
          label: `+${powerup.value}`,
          kind: "reward",
          tone: EFFECT_TONE.info,
          lifeMs: 620,
        });
        next = setToast(next, "Moving shield secured", "reward");
      } else {
        next = {
          ...next,
          hull: Math.min(next.maxHull, next.hull + powerup.value),
        };
        next = pushEffect(next, {
          x: powerup.x,
          y: powerup.y,
          label: `+${powerup.value}`,
          kind: "reward",
          tone: EFFECT_TONE.reward,
          lifeMs: 620,
        });
        next = setToast(next, "Moving hull secured", "reward");
      }
    }

    next = {
      ...next,
      powerups: remainingPowerups,
    };
  }

  if (next.activeBot) {
    const botTouched =
      distance(next.vacuumX, next.vacuumY, next.activeBot.x, next.activeBot.y) <=
      derived.vacuumRange * 0.78;

    if (botTouched) {
      if (next.activeBot.kind === "rogue") {
        return syncLevelUps(detonateRogueBot(next, next.activeBot));
      }

      next = pushEffect(next, {
        x: next.activeBot.x,
        y: next.activeBot.y,
        label: "-15",
        kind: "danger",
        tone: EFFECT_TONE.danger,
        lifeMs: 620,
      });
      next = {
        ...next,
        shield: Math.max(0, next.shield - 15),
        activeBot: undefined,
      };
      next = setToast(next, "Bot vacuumed", "danger");
    }
  }

  return syncLevelUps(next);
}

function abilityReady(state: GameState, ability: AbilityKey) {
  return state.abilities[ability].cooldownMs <= 0;
}

function tickBotShots(state: GameState, deltaMs: number) {
  return state.botShots
    .map((shot) => ({ ...shot, ageMs: shot.ageMs + deltaMs }))
    .filter((shot) => shot.ageMs < shot.lifeMs);
}

function chooseTurretTarget(state: GameState, bot: SupportBot, range: number) {
  const priority: Record<DebrisKind, number> = {
    splatter: 5,
    unstable: 4,
    corrosive: 3,
    tank: 3,
    heavy: 2,
    normal: 1,
  };

  const inRange = state.debris
    .map((debris) => ({
      debris,
      distance: distance(bot.x, bot.y, debris.x, debris.targetY),
    }))
    .filter((entry) => entry.distance <= range);

  if (inRange.length === 0) {
    return undefined;
  }

  inRange.sort((a, b) => {
    const priorityDelta = priority[b.debris.kind] - priority[a.debris.kind];
    if (priorityDelta !== 0) {
      return priorityDelta;
    }
    return a.distance - b.distance;
  });

  return inRange[0];
}

function chooseScrapTarget(state: GameState, bot: SupportBot) {
  if (state.debris.length === 0) {
    return undefined;
  }

  const candidates = state.debris.map((debris) => ({
    debris,
    distance: distance(bot.x, bot.y, debris.x, debris.targetY),
  }));

  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0];
}

function spawnRogueFragments(state: GameState, bot: SupportBot) {
  let next = state;
  const fragments: Debris[] = [];

  for (let index = 0; index < 2; index += 1) {
    const offsetRoll = roll(next.rngSeed);
    const yRoll = roll(offsetRoll.seed);
    const ageRoll = roll(yRoll.seed);
    const normalVariantRoll = getRandomNormalDebrisVariant(ageRoll.seed);
    const x = clamp(bot.x + (offsetRoll.value - 0.5) * 12, 12, 88);
    const targetY = clamp(bot.y + 8 + yRoll.value * 12, 18, 84);
    const fallDurationMs = 900;
    const ageMs = fallDurationMs * (0.45 + ageRoll.value * 0.2);
    const hp = 0.7;

    fragments.push({
      id: next.nextDebrisId,
      kind: "normal",
      isFragment: true,
      ...createDebrisVisualState("normal", "flying", hp, hp, normalVariantRoll.variant),
      x,
      targetY,
      hp,
      maxHp: hp,
      ageMs,
      fallDurationMs,
    });

    next = {
      ...next,
      rngSeed: normalVariantRoll.seed,
      nextDebrisId: next.nextDebrisId + 1,
    };
  }

  next = pushEffect(next, {
    x: bot.x,
    y: bot.y,
    label: "Spit",
    kind: "danger",
    tone: EFFECT_TONE.danger,
    lifeMs: 380,
  });

  return {
    ...next,
    debris: [...next.debris, ...fragments],
  };
}

function tickActiveBot(state: GameState, deltaMs: number) {
  if (!state.activeBot) {
    return state;
  }

  const derived = getDerivedStats(state);
  const deltaSeconds = deltaMs / 1000;
  const payloadCooldownMs = Math.max(0, state.activeBot.payloadCooldownMs - deltaMs);
  let nextBot: SupportBot = {
    ...state.activeBot,
    x: state.activeBot.x + state.activeBot.velocityX * deltaSeconds,
    y: state.activeBot.y + state.activeBot.velocityY * deltaSeconds,
    ageMs: state.activeBot.ageMs + deltaMs,
    fireCooldownMs: Math.max(0, state.activeBot.fireCooldownMs - deltaMs),
    payloadCooldownMs,
  };

  if (state.activeBot.kind === "scrap") {
    const target = chooseScrapTarget(state, state.activeBot);
    if (target) {
      const targetDistance = Math.max(0.001, target.distance);
      const moveDistance = Math.min(derived.scrapBotMoveSpeed * deltaSeconds, targetDistance);
      const moveRatio = moveDistance / targetDistance;
      nextBot = {
        ...nextBot,
        x: clamp(
          state.activeBot.x + (target.debris.x - state.activeBot.x) * moveRatio,
          8,
          92,
        ),
        y: clamp(
          state.activeBot.y + (target.debris.targetY - state.activeBot.y) * moveRatio,
          20,
          84,
        ),
      };
    } else {
      nextBot = {
        ...nextBot,
        x: clamp(state.activeBot.x + state.activeBot.velocityX * deltaSeconds * 0.25, 8, 92),
      };
    }
  }

  if (state.activeBot.kind === "rogue") {
    const wave = Math.sin(nextBot.ageMs / 220 + state.activeBot.wobblePhase);
    const surge = Math.sin(nextBot.ageMs / 470 + state.activeBot.wobblePhase * 0.6);
    nextBot = {
      ...nextBot,
      y: clamp(state.activeBot.baseY + wave * 7 + surge * 3, 22, 82),
    };
  }

  if (nextBot.ageMs >= nextBot.lifeMs || nextBot.x < 6 || nextBot.x > 94) {
    return isHelpfulBotKind(state.activeBot.kind)
      ? maybeSpawnBotPowerup({
          ...state,
          activeBot: undefined,
        }, state.activeBot)
      : {
          ...state,
          activeBot: undefined,
        };
  }

  let next: GameState = {
    ...state,
    activeBot: nextBot,
  };

  if (nextBot.kind === "shield") {
    next = {
      ...next,
      shield: Math.min(
        state.maxShield,
        state.shield + derived.shieldBotRegenPerSecond * (deltaMs / 1000),
      ),
    };
    return next;
  }

  if (nextBot.kind === "scrap") {
    const debrisIdsInRange = next.debris
      .map((debris) => ({
        id: debris.id,
        distance: distance(nextBot.x, nextBot.y, debris.x, debris.targetY),
      }))
      .filter((entry) => entry.distance <= derived.scrapBotRadius)
      .map((entry) => entry.id);
    const affected = new Set(debrisIdsInRange);
    const damage = derived.scrapBotPowerPerSecond * (deltaMs / 1000);
    let salvageGain = 0;
    let xpGain = 0;
    let clears = 0;
    let heavyClears = 0;
    let dangerousClears = 0;
    const remaining: Debris[] = [];
    const splitFragments: Debris[] = [];

    for (const debris of next.debris) {
      if (!affected.has(debris.id)) {
        remaining.push(debris);
        continue;
      }

      const hp = debris.hp - damage;
      if (hp > 0) {
        remaining.push({ ...debris, hp });
        continue;
      }

      const reward = getDebrisRewards(debris);
      salvageGain += reward.salvage;
      xpGain += reward.xp;
      clears += 1;
      if (isHeavyClassDebris(debris)) heavyClears += 1;
      if (isDangerousDebris(debris)) dangerousClears += 1;
      next = pushEffect(next, {
        x: debris.x,
        y: debris.targetY,
        label: "Scrap",
        kind: "reward",
        tone: EFFECT_TONE.reward,
        lifeMs: 420,
      });
      const splitResult = maybeSpawnSplitFragments(next, debris);
      next = splitResult.state;
      splitFragments.push(...splitResult.fragments);
    }

    next = {
      ...next,
      debris: [...remaining, ...splitFragments],
      totalClears: next.totalClears + clears,
      heavyClears: next.heavyClears + heavyClears,
      dangerousClears: next.dangerousClears + dangerousClears,
    };

    if (clears > 0) {
      next = applyClearRewards(next, salvageGain, xpGain, clears, 0, false);
    }

    return next;
  }

  if (nextBot.kind === "rogue") {
    if (nextBot.payloadCooldownMs <= 0) {
      next = spawnRogueFragments(next, nextBot);
      const cooldownRoll = getRoguePayloadCooldown(next.rngSeed);
      next = {
        ...next,
        rngSeed: cooldownRoll.seed,
        activeBot: next.activeBot
          ? {
              ...next.activeBot,
              payloadCooldownMs: cooldownRoll.delayMs,
            }
          : undefined,
      };
    }
    return next;
  }

  if (nextBot.kind === "turret" && nextBot.fireCooldownMs <= 0) {
    const target = chooseTurretTarget(next, nextBot, derived.turretBotRange);
    if (!target) {
      return next;
    }

    let salvageGain = 0;
    let xpGain = 0;
    let clears = 0;
    let heavyClears = 0;
    let dangerousClears = 0;
    const remaining: Debris[] = [];
    const splitFragments: Debris[] = [];

    for (const debris of next.debris) {
      if (debris.id !== target.debris.id) {
        remaining.push(debris);
        continue;
      }

      const hp = debris.hp - derived.turretBotDamage;
      if (hp > 0) {
        remaining.push({ ...debris, hp });
        continue;
      }

      const reward = getDebrisRewards(debris);
      salvageGain += reward.salvage;
      xpGain += reward.xp;
      clears += 1;
      if (isHeavyClassDebris(debris)) heavyClears += 1;
      if (isDangerousDebris(debris)) dangerousClears += 1;
      const splitResult = maybeSpawnSplitFragments(next, debris);
      next = splitResult.state;
      splitFragments.push(...splitResult.fragments);
    }

    next = {
      ...next,
      activeBot: {
        ...nextBot,
        fireCooldownMs: derived.turretBotFireCooldownMs,
      },
      debris: [...remaining, ...splitFragments],
      totalClears: next.totalClears + clears,
      heavyClears: next.heavyClears + heavyClears,
      dangerousClears: next.dangerousClears + dangerousClears,
    };

    next = pushBotShot(next, {
      fromX: nextBot.x,
      fromY: nextBot.y,
      toX: target.debris.x,
      toY: target.debris.targetY,
      lifeMs: 220,
    });

    if (clears > 0) {
      next = applyClearRewards(next, salvageGain, xpGain, clears, 0, false);
    }

    next = pushEffect(next, {
      x: target.debris.x,
      y: target.debris.targetY,
      label: "Zap",
      kind: "tap",
      tone: EFFECT_TONE.info,
      lifeMs: 320,
    });
  }

  return next;
}

function applySlowTime(state: GameState) {
  const derived = getDerivedStats(state);
  let next = pushEffect(state, {
    x: 50,
    y: 28,
    label: "Slow",
    kind: "tap",
    tone: EFFECT_TONE.info,
    lifeMs: 480,
  });

  next = {
    ...next,
    slowTimeMs: derived.slowDurationMs,
    abilities: {
      ...next.abilities,
      slowTime: { cooldownMs: derived.slowCooldownMs },
    },
  };

  return setToast(next, "Slow time engaged", "info");
}

function applyNuke(state: GameState) {
  const derived = getDerivedStats(state);
  let next = pushEffect(state, {
    x: 50,
    y: 52,
    label: "Nuke",
    kind: "danger",
    tone: EFFECT_TONE.reward,
    lifeMs: 900,
  });

  let salvageGain = 0;
  let xpGain = 0;
  let clears = 0;
  let heavyClears = 0;
  let dangerousClears = 0;

  for (const debris of next.debris) {
    const reward = getDebrisRewards(debris);
    salvageGain += reward.salvage;
    xpGain += reward.xp;
    clears += 1;

    if (isHeavyClassDebris(debris)) {
      heavyClears += 1;
    }

    if (isDangerousDebris(debris)) {
      dangerousClears += 1;
    }
  }

  next = {
    ...next,
    debris: [],
    nukeFlashMs: 850,
    postNukeSlowMs: POST_NUKE_SLOW_DURATION_MS,
    clearRecoveryMs: derived.regenDelayMs,
    totalClears: next.totalClears + clears,
    heavyClears: next.heavyClears + heavyClears,
    dangerousClears: next.dangerousClears + dangerousClears,
    abilities: {
      ...next.abilities,
      nuke: { cooldownMs: derived.nukeCooldownMs },
    },
  };

  if (salvageGain > 0 || xpGain > 0) {
    next = applyClearRewards(next, salvageGain, xpGain, clears, 0, false);
  }

  next = setToast(next, clears > 0 ? "Board cleared" : "Nuke fired", "reward");
  return syncLevelUps(next);
}

function updateGameplay(state: GameState, deltaMs: number) {
  const previousStage = getStageIndex(state.level);
  const nextElapsed = state.elapsedMs + deltaMs;
  const derived = getDerivedStats(state);
  const pressureFactor = state.slowTimeMs > 0 ? derived.slowPressureMultiplier : 1;
  const pressureDelta = deltaMs * pressureFactor;
  const postNukeFallMultiplier = getPostNukeFallSpeedMultiplier(state.postNukeSlowMs);
  const followFactor = 1 - Math.pow(1 - derived.vacuumFollow, deltaMs / 16.67);
  const vacuumX = state.vacuumX + (state.vacuumTargetX - state.vacuumX) * followFactor;
  const vacuumY = state.vacuumY + (state.vacuumTargetY - state.vacuumY) * followFactor;

  let next: GameState = {
    ...state,
    elapsedMs: nextElapsed,
    slowTimeMs: Math.max(0, state.slowTimeMs - deltaMs),
    nukeFlashMs: Math.max(0, state.nukeFlashMs - deltaMs),
    postNukeSlowMs: Math.max(0, state.postNukeSlowMs - deltaMs),
    clearRecoveryMs: state.clearRecoveryMs,
    comboTimerMs: Math.max(0, state.comboTimerMs - deltaMs),
    comboCount: Math.max(0, state.comboTimerMs - deltaMs > 0 ? state.comboCount : 0),
    vacuumX,
    vacuumY,
    pickups: tickPickups(state, deltaMs),
    powerups: tickMovingPowerups(state, deltaMs),
    activeBot: state.activeBot,
    incomingBotWarning: state.incomingBotWarning
      ? {
          ...state.incomingBotWarning,
          ttlMs: state.incomingBotWarning.ttlMs - deltaMs,
        }
      : undefined,
    botShots: tickBotShots(state, deltaMs),
    effects: tickEffects(state, deltaMs),
    abilities: {
      slowTime: {
        cooldownMs: stepCooldown(state.abilities.slowTime.cooldownMs, deltaMs, 1),
      },
      nuke: {
        cooldownMs: stepCooldown(state.abilities.nuke.cooldownMs, deltaMs, 1),
      },
    },
  };

  next = applyPassiveIncome(next, deltaMs);
  next = {
    ...next,
    pickupCooldownMs: next.pickupCooldownMs - deltaMs,
    movingPowerupCooldownMs: next.movingPowerupCooldownMs - deltaMs,
    botCooldownMs: next.activeBot ? next.botCooldownMs : next.botCooldownMs - deltaMs,
    rogueBotCooldownMs:
      state.level < ROGUE_BOT_MIN_LEVEL ? next.rogueBotCooldownMs : next.rogueBotCooldownMs - deltaMs,
  };

  while (next.pickupCooldownMs <= 0 && next.mode === "running") {
    next = maybeSpawnPickup(next);
  }

  while (next.movingPowerupCooldownMs <= 0 && next.mode === "running") {
    next = maybeSpawnMovingPowerup(next);
  }

  while (
    next.rogueBotCooldownMs <= 0 &&
    next.mode === "running" &&
    next.level >= ROGUE_BOT_MIN_LEVEL &&
    !next.activeBot &&
    !next.incomingBotWarning
  ) {
    next = planIncomingBot(next, "rogue");
  }

  while (
    next.botCooldownMs <= 0 &&
    next.mode === "running" &&
    !next.activeBot &&
    !next.incomingBotWarning
  ) {
    const kindRoll = pickHelpfulBotKind(next);
    next = {
      ...next,
      rngSeed: kindRoll.seed,
    };
    next = planIncomingBot(next, kindRoll.picked);
  }

  if (
    next.mode === "running" &&
    next.incomingBotWarning &&
    next.incomingBotWarning.ttlMs <= 0 &&
    !next.activeBot
  ) {
    next = spawnActiveBot(next, next.incomingBotWarning);
  }

  next = applySuction(next, deltaMs);

  let totalDamage = 0;
  const remaining: Debris[] = [];
  const splatterBursts: Debris[] = [];
  let restingDebrisBurden = 0;

  for (const debris of next.debris) {
    const stats = DEBRIS_STATS[debris.kind];
    const stabilizerSlow =
      next.activeBot?.kind === "stabilizer" &&
      distance(next.activeBot.x, next.activeBot.y, debris.x, debris.targetY) <= derived.stabilizerRadius
        ? derived.stabilizerFallMultiplier
        : 1;
    const motionState = getDebrisMotionState(debris);
    const adjustedPressureDelta =
      motionState === "falling" ? pressureDelta * stabilizerSlow * postNukeFallMultiplier : pressureDelta;
    const ageMs = debris.ageMs + adjustedPressureDelta;
    const landed = getDebrisMotionState({ ...debris, ageMs }) === "resting";
    const nextState =
      debris.state === "exploding" ? "exploding" : landed ? "resting" : "flying";
    const stateTimerMs =
      nextState === "flying"
        ? 0
        : nextState === debris.state
          ? debris.stateTimerMs + pressureDelta
          : 0;
    const shouldStartSplatterExplosion =
      debris.kind === "splatter" &&
      nextState === "resting" &&
      stateTimerMs >= SPLATTER_DELAY_MS;
    const driftedX =
      debris.behavior === "drift" && nextState !== "resting"
        ? clamp(debris.x + (debris.driftVelocityX ?? 0) * (adjustedPressureDelta / 1000), 12, 88)
        : debris.x;

    if (nextState === "resting" && !shouldStartSplatterExplosion) {
      restingDebrisBurden += getDebrisRestingBurden(debris);
    }

    if (
      debris.kind === "unstable" &&
      landed &&
      stats.fuseMs &&
      ageMs - debris.fallDurationMs >= stats.fuseMs
    ) {
      totalDamage += stats.explosionDamage ?? 0;
      next = pushEffect(next, {
        x: debris.x,
        y: debris.targetY,
        label: "Burst",
        kind: "danger",
        tone: EFFECT_TONE.danger,
        lifeMs: 560,
      });
      continue;
    }

    if (
      debris.kind === "splatter" &&
      nextState === "exploding" &&
      stateTimerMs >= SPLATTER_EXPLOSION_DURATION_MS
    ) {
      const splatterResult = spawnSplatterCorrosiveCluster(next, debris);
      next = splatterResult.state;
      splatterBursts.push(...splatterResult.fragments);
      continue;
    }

    if (shouldStartSplatterExplosion) {
      remaining.push({
        ...debris,
        ageMs,
        x: driftedX,
        ...transitionDebrisVisualState(debris, "exploding", debris.hp, 0),
      });
      continue;
    }

    remaining.push({
      ...debris,
      ageMs,
      x: driftedX,
      ...transitionDebrisVisualState(debris, nextState, debris.hp, stateTimerMs),
    });
  }

  next = {
    ...next,
    debris: [...remaining, ...splatterBursts],
    spawnCooldownMs: next.spawnCooldownMs - pressureDelta,
  };

  totalDamage +=
    getHullPressureDamagePerSecond(restingDebrisBurden, next.maxHull) * (pressureDelta / 1000);
  totalDamage += getCorrosiveHullDamagePerSecond(next.debris) * (pressureDelta / 1000);

  while (next.elapsedMs >= next.nextBurstAtMs && next.mode === "running") {
    const burstStrength = getStrengthScore(next);
    const burstSpawnCount = getBurstSpawnCount(next.elapsedMs / 1000, burstStrength, next.level);
    if (burstSpawnCount <= 0) {
      next = {
        ...next,
        nextBurstAtMs: next.elapsedMs + 6000,
      };
      break;
    }

    next = spawnWave(next, burstSpawnCount, true);
    next = {
      ...next,
      burstWavesTriggered: next.burstWavesTriggered + 1,
      nextBurstAtMs:
        next.elapsedMs + getBurstWaveIntervalSeconds(burstStrength, next.level) * 1000,
    };
    next = setToast(next, "Burst wave", "danger");
  }

  while (next.spawnCooldownMs <= 0 && next.mode === "running") {
    const deficit = Math.max(0, derived.targetActiveDebris - next.debris.length);
    const refillBoost = deficit >= 3 ? 1 : 0;
    next = spawnWave(next, Math.min(MAX_SPAWN_COUNT, derived.spawnCount + refillBoost));
    next = {
      ...next,
      spawnCooldownMs: next.spawnCooldownMs + derived.spawnIntervalMs,
    };
  }

  next = applyDamage(next, totalDamage);
  next = tickActiveBot(next, deltaMs);

  const currentRestingDebrisBurden = getRestingDebrisBurden(next.debris);
  const canRecover = currentRestingDebrisBurden <= derived.finalRegenThreshold;
  next = {
    ...next,
    clearRecoveryMs: canRecover ? next.clearRecoveryMs + deltaMs : 0,
  };

  if (
    next.mode === "running" &&
    canRecover &&
    next.clearRecoveryMs >= derived.regenDelayMs &&
    next.shield < next.maxShield
  ) {
    next = {
      ...next,
      shield: Math.min(next.maxShield, next.shield + derived.shieldRegenPerSecond * (deltaMs / 1000)),
    };
  }

  next = updateObjectives(next);
  next = syncLevelUps(next);
  const nextStage = getStageIndex(next.level);

  if (nextStage > previousStage && next.mode === "running") {
    next = setToast(next, STAGES[nextStage].intro, "info");
  }

  if (next.toast) {
    const ttlMs = next.toast.ttlMs - deltaMs;
    next = {
      ...next,
      toast: ttlMs > 0 ? { ...next.toast, ttlMs } : undefined,
    };
  }

  return next;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "setDifficulty":
      return {
        ...state,
        difficulty: action.difficulty,
      };
    case "startRun":
    case "restartRun":
      return createRunningState(
        action.seed ?? Date.now(),
        Math.max(state.bestSalvage, state.salvage),
        action.difficulty ?? state.difficulty,
      );
    case "returnToMenu":
      return createReadyState(
        action.seed ?? Date.now(),
        Math.max(state.bestSalvage, state.salvage),
        action.difficulty ?? state.difficulty,
      );
    case "tick":
      if (state.mode !== "running") {
        return state;
      }
      if (state.pendingLevelChoices > 0) {
        const effects = tickEffects(state, action.deltaMs);
        const toast =
          state.toast && state.toast.ttlMs - action.deltaMs > 0
            ? { ...state.toast, ttlMs: state.toast.ttlMs - action.deltaMs }
            : undefined;

        return {
          ...state,
          effects,
          toast,
        };
      }
      return updateGameplay(state, action.deltaMs);
    case "pointerDown":
      if (state.mode !== "running" || state.pendingLevelChoices > 0) {
        return state;
      }
      return updateVacuumTarget(state, action.x, action.y, true);
    case "pointerMove":
      if (state.mode !== "running" || state.pendingLevelChoices > 0 || !state.isVacuumActive) {
        return state;
      }
      return updateVacuumTarget(state, action.x, action.y, true);
    case "pointerUp":
      if (state.mode !== "running" || state.pendingLevelChoices > 0) {
        return state;
      }
      return {
        ...state,
        isVacuumActive: false,
        suctioningDebrisIds: [],
      };
    case "useAbility":
      if (state.mode !== "running" || state.pendingLevelChoices > 0 || !abilityReady(state, action.ability)) {
        return state;
      }
      if (action.ability === "slowTime") {
        return applySlowTime(state);
      }
      return applyNuke(state);
    case "selectUpgrade":
      if (state.pendingLevelChoices <= 0) {
        return state;
      }
      if (!state.upgradeChoices.includes(action.upgrade)) {
        return setToast(state, "Choose one of the offered upgrades", "info");
      }
      if (state.upgrades[action.upgrade] >= UPGRADE_CAPS[action.upgrade]) {
        return setToast(state, `${action.upgrade} maxed`, "info");
      }
      {
        const pendingLevelChoices = state.pendingLevelChoices - 1;
        let next: GameState = {
          ...state,
          pendingLevelChoices,
          isVacuumActive: false,
          suctioningDebrisIds: [],
          upgrades: {
            ...state.upgrades,
            [action.upgrade]: Math.min(
              UPGRADE_CAPS[action.upgrade],
              state.upgrades[action.upgrade] + 1,
            ),
          },
          upgradeChoices: [],
        };

        if (pendingLevelChoices > 0) {
          const generated = generateUpgradeChoices(next);
          next = {
            ...next,
            rngSeed: generated.seed,
            upgradeChoices: generated.choices,
          };
        }

        return setToast(next, `${action.upgrade} upgraded`, "reward");
      }
    default:
      return state;
  }
}
