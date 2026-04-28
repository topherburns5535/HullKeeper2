import {
  MILESTONE_MODIFIER_LABELS,
  SPLATTER_DEBRIS_VARIANTS,
  UPGRADE_CAPS,
  getCorrosiveHullDamagePerSecond,
  getDebrisBehaviorRates,
  getDebrisHp,
  getDebrisRenderSprite,
  getHullPickupChance,
  getHullPressureDamagePerSecond,
  getActiveDebrisCaps,
  createInitialState,
  getDebrisSpawnWeights,
  getFallingY,
  gameReducer,
  getDerivedStats,
  getMilestoneLevels,
  getMovingHullPowerupChance,
  getMovingPowerupTiming,
  getMovingShieldPowerupChance,
  getPostNukeFallSpeedMultiplier,
  getRestingDebrisCount,
  getRestingDebrisBurden,
  getRogueBotTiming,
  getShieldPickupChance,
  getSpawnCount,
  getSpawnIntervalSeconds,
  getStrengthScore,
  getTotalActiveDebrisCap,
  getTargetActiveDebris,
  getRandomSplatterDebrisVariant,
  getUpgradeCost,
  getVacuumRange,
} from "../lib/game/engine";
import type { Debris, DebrisKind, GameState } from "../lib/game/types";

const upgrades = ["power", "range", "tempo", "ability", "shield"] as const;
const upgradePriority = ["shield", "tempo", "range", "power", "ability"] as const;
const defaultDebrisFlyingSprite = "/assets/debris/CommonDebris1.png";
const defaultDebrisRestingSprite = "/assets/debris/CommonDebris1_Resting.png";
const corrosiveDebrisFlyingSprite = "/assets/debris/CorrosiveDebris.png";
const corrosiveDebrisRestingSprite = "/assets/debris/CorrosiveDebris_Resting.png";
const heavyDebrisFlyingSprite = "/assets/debris/LargeDebris.png";
const heavyDebrisRestingSprite = "/assets/debris/LargeDebris_Resting1.png";
const heavyDebrisCleanupSprites = [
  "/assets/debris/LargeDebris_Cleaning.png",
  "/assets/debris/CommonDebris3_Resting.png",
  "/assets/debris/CommonDebris3_Resting.png",
];
const tankDebrisFlyingSprite = "/assets/debris/TankDebris.png";
const tankDebrisRestingSprite = "/assets/debris/TankDebris_Resting.png";
const tankDebrisRestingStageSprites = [
  "/assets/debris/TankDebris_Resting2.png",
  "/assets/debris/TankDebris_Resting3.png",
  "/assets/debris/TankDebris_Resting4.png",
];
const splatterDebrisFlyingSprite = "/assets/debris/SplatterDebris.png";
const splatterDebrisRestingSprite = "/assets/debris/SplatterDebris_Resting.png";
const splatterDebrisExplosionSprite = "/assets/effects/SplatterDebris_Resting2.png";
const splatterDebrisVariantTwoFlyingSprite = "/assets/debris/SplatterDebris2.png";
const RARE_EARLY_SPECIAL_DEBRIS_UNLOCK_LEVEL = 5;

function getDebrisSprites(kind: DebrisKind) {
  if (kind === "normal") {
    return {
      spriteFlying: defaultDebrisFlyingSprite,
      spriteResting: defaultDebrisRestingSprite,
      spriteExploding: null,
      cleanupSprites: [],
    };
  }

  if (kind === "corrosive") {
    return {
      spriteFlying: corrosiveDebrisFlyingSprite,
      spriteResting: corrosiveDebrisRestingSprite,
      spriteExploding: null,
      cleanupSprites: [],
    };
  }

  if (kind === "heavy") {
    return {
      spriteFlying: heavyDebrisFlyingSprite,
      spriteResting: heavyDebrisRestingSprite,
      spriteExploding: null,
      cleanupSprites: heavyDebrisCleanupSprites,
    };
  }

  if (kind === "tank") {
    return {
      spriteFlying: tankDebrisFlyingSprite,
      spriteResting: tankDebrisRestingSprite,
      spriteExploding: null,
      cleanupSprites: tankDebrisRestingStageSprites,
    };
  }

  if (kind === "splatter") {
    return {
      spriteFlying: splatterDebrisFlyingSprite,
      spriteResting: splatterDebrisRestingSprite,
      spriteExploding: splatterDebrisExplosionSprite,
      cleanupSprites: [],
    };
  }

  return {
    spriteFlying: null,
    spriteResting: null,
    spriteExploding: null,
    cleanupSprites: [],
  };
}

function withDebrisVisuals(
  debrisList: Array<
    Omit<
      Debris,
      | "type"
      | "isCorrosive"
      | "scale"
      | "speedModifier"
      | "spriteFlying"
      | "spriteResting"
      | "shieldRestingSprite"
      | "shieldRestingSprites"
      | "shieldRestingAnimationSprites"
      | "shieldCleanupAnimationSprites"
      | "shieldStageAnimationSprites"
      | "spriteExploding"
      | "cleanupSprites"
      | "cleanupProgress"
      | "cleanupStage"
      | "landingVariant"
      | "landingUsesShieldSettle"
      | "shieldPoolTimerMs"
      | "shieldPoolVariant"
      | "shieldPoolScaleJitter"
      | "shieldPoolRotationDeg"
      | "shieldPoolOpacityJitter"
      | "shieldPoolPulseJitter"
      | "visualFlipX"
      | "visualRotation"
      | "visualOffsetX"
      | "visualOffsetY"
      | "rogueTargetLockUntilMs"
      | "state"
      | "stateTimerMs"
      | "landingTimerMs"
      | "landingDurationMs"
    >
  >,
): Debris[] {
  return debrisList.map((debris) => ({
    ...debris,
    type: debris.kind,
    isCorrosive: debris.kind === "corrosive",
    scale: 1,
    visualFlipX: debris.id % 2 === 0,
    visualRotation: ((debris.id % 7) - 3) * 1.15,
    visualOffsetX: ((debris.id % 5) - 2) * 0.4,
    visualOffsetY: ((debris.id % 3) - 1) * 0.45,
    speedModifier: 1,
    ...getDebrisSprites(debris.kind),
    shieldRestingSprite: null,
    shieldRestingSprites: undefined,
    shieldRestingAnimationSprites: undefined,
    shieldCleanupAnimationSprites: undefined,
    shieldStageAnimationSprites: undefined,
    cleanupProgress: debris.kind === "heavy" ? Math.max(0, Math.min(1, 1 - debris.hp / debris.maxHp)) : 0,
    cleanupStage:
      debris.kind !== "heavy"
        ? 0
        : debris.hp >= debris.maxHp
          ? 0
          : debris.hp / debris.maxHp > 0.67
            ? 1
            : debris.hp / debris.maxHp > 0.34
              ? 2
              : 3,
    landingVariant: debris.id % 3 === 0 ? "left" : debris.id % 3 === 1 ? "center" : "right",
    landingUsesShieldSettle: false,
    shieldPoolTimerMs: 0,
    shieldPoolVariant: debris.id % 2 === 0 ? "pool1" : "pool2",
    shieldPoolScaleJitter: 0,
    shieldPoolRotationDeg: 0,
    shieldPoolOpacityJitter: 0,
    shieldPoolPulseJitter: 0,
    state:
      debris.ageMs < debris.fallDurationMs
        ? "flying"
        : debris.kind === "tank"
          ? debris.hp / debris.maxHp > 0.75
            ? "rest_1"
            : debris.hp / debris.maxHp > 0.5
              ? "rest_2"
              : debris.hp / debris.maxHp > 0.25
                ? "rest_3"
                : "rest_4"
          : "resting",
    rogueTargetLockUntilMs: undefined,
    stateTimerMs: debris.ageMs >= debris.fallDurationMs ? debris.ageMs - debris.fallDurationMs : 0,
    landingTimerMs: debris.ageMs >= debris.fallDurationMs ? 220 : 0,
    landingDurationMs: debris.kind === "tank" ? 190 : debris.kind === "heavy" ? 200 : 220,
  }));
}

function chooseOfferedUpgrade(state: GameState) {
  return (
    upgradePriority.find((upgrade) => state.upgradeChoices.includes(upgrade)) ??
    state.upgradeChoices[0] ??
    upgrades[0]
  );
}

let state = createInitialState();
state = gameReducer(state, { type: "startRun", seed: 12345 });

const seen = {
  early: new Set<string>(),
  mid: new Set<string>(),
  later: new Set<string>(),
  advanced: new Set<string>(),
};
const seenBehaviors = new Set<string>();

const completedTransitions = new Map<number, number>();
let maxObjectives = state.objectives.length;
let pausedChecks = 0;
let slowChecked = false;
let nukeChecked = false;
let maxBotsSeen = 0;
let maxDebris = 0;
let burstWavesTriggered = 0;
let earlyDebrisSamples = 0;
let earlyDebrisTotal = 0;
let midLateDebrisSamples = 0;
let midLateDebrisTotal = 0;
let maxHeavyEarly = 0;
let maxCorrosiveEarly = 0;
let maxSplatterEarly = 0;
let maxTankEarly = 0;
let maxHeavySeen = 0;
let maxCorrosiveSeen = 0;
let maxSplatterSeen = 0;
let maxTankSeen = 0;
let maxHeavyPre5 = 0;
let maxHeavyPre10 = 0;
let maxCorrosivePre3 = 0;
let maxSplatterPre5 = 0;
let maxSplatterPre12 = 0;
let maxTankPre5 = 0;
let maxTankPre18 = 0;
let maxNormalSeen = 0;
let lastBurstCount = 0;
let maxShieldPickupsSeen = 0;
let maxHullPickupsSeen = 0;
let maxMovingShieldPowerupsSeen = 0;
let maxMovingHullPowerupsSeen = 0;

for (let step = 0; step < 8000; step += 1) {
  if (state.mode !== "running") {
    break;
  }

  const bucket =
    state.level < 3
      ? "early"
      : state.level < 10
        ? "mid"
        : state.level < 18
          ? "later"
          : "advanced";

  for (const debris of state.debris) {
    seen[bucket].add(debris.kind);
    if (debris.behavior) {
      seenBehaviors.add(debris.behavior);
    }
  }

  maxObjectives = Math.max(maxObjectives, state.objectives.length);
  maxDebris = Math.max(maxDebris, state.debris.length);
  burstWavesTriggered = Math.max(burstWavesTriggered, state.burstWavesTriggered);
  if (state.level < 8 && state.burstWavesTriggered > lastBurstCount) {
    throw new Error("Burst waves triggered before level 8.");
  }
  lastBurstCount = state.burstWavesTriggered;

  const heavyCount = state.debris.filter((debris) => debris.kind === "heavy" && !debris.isFragment).length;
  const corrosiveCount = state.debris.filter((debris) => debris.kind === "corrosive" && !debris.isFragment).length;
  const splatterCount = state.debris.filter((debris) => debris.kind === "splatter" && !debris.isFragment).length;
  const tankCount = state.debris.filter((debris) => debris.kind === "tank" && !debris.isFragment).length;
  const normalCount = state.debris.filter((debris) => debris.kind === "normal").length;
  const rogueCorrosiveOverflow = state.debris.filter(
    (debris) => debris.kind === "corrosive" && !debris.isFragment && debris.rogueTargetLockUntilMs !== undefined,
  ).length;
  const shieldPickupCount = state.pickups.filter((pickup) => pickup.kind === "shield").length;
  const hullPickupCount = state.pickups.filter((pickup) => pickup.kind === "hull").length;
  const movingShieldPowerupCount = state.powerups.filter((powerup) => powerup.kind === "shield").length;
  const movingHullPowerupCount = state.powerups.filter((powerup) => powerup.kind === "hull").length;
  maxBotsSeen = Math.max(
    maxBotsSeen,
    (state.activeBot ? 1 : 0) + (state.activeRogueBot ? 1 : 0),
  );
  const activeCaps = getActiveDebrisCaps(state.level);

  maxHeavySeen = Math.max(maxHeavySeen, heavyCount);
  maxCorrosiveSeen = Math.max(maxCorrosiveSeen, corrosiveCount);
  maxSplatterSeen = Math.max(maxSplatterSeen, splatterCount);
  maxTankSeen = Math.max(maxTankSeen, tankCount);
  maxNormalSeen = Math.max(maxNormalSeen, normalCount);
  maxShieldPickupsSeen = Math.max(maxShieldPickupsSeen, shieldPickupCount);
  maxHullPickupsSeen = Math.max(maxHullPickupsSeen, hullPickupCount);
  maxMovingShieldPowerupsSeen = Math.max(maxMovingShieldPowerupsSeen, movingShieldPowerupCount);
  maxMovingHullPowerupsSeen = Math.max(maxMovingHullPowerupsSeen, movingHullPowerupCount);
  if (state.level < 5) {
    maxHeavyPre5 = Math.max(maxHeavyPre5, heavyCount);
    maxSplatterPre5 = Math.max(maxSplatterPre5, splatterCount);
    maxTankPre5 = Math.max(maxTankPre5, tankCount);
  }
  if (state.level < 10) {
    maxHeavyPre10 = Math.max(maxHeavyPre10, heavyCount);
  }
  if (state.level < 3) {
    maxCorrosivePre3 = Math.max(maxCorrosivePre3, corrosiveCount);
  }
  if (state.level < 12) {
    maxSplatterPre12 = Math.max(maxSplatterPre12, splatterCount);
  }
  if (state.level < 18) {
    maxTankPre18 = Math.max(maxTankPre18, tankCount);
  }

  if (
    heavyCount > Math.max(activeCaps.heavy, state.level >= RARE_EARLY_SPECIAL_DEBRIS_UNLOCK_LEVEL ? 1 : 0) ||
    corrosiveCount > activeCaps.corrosive + rogueCorrosiveOverflow ||
    splatterCount > Math.max(activeCaps.splatter, state.level >= RARE_EARLY_SPECIAL_DEBRIS_UNLOCK_LEVEL ? 1 : 0) ||
    tankCount > Math.max(activeCaps.tank, state.level >= RARE_EARLY_SPECIAL_DEBRIS_UNLOCK_LEVEL ? 1 : 0) ||
    shieldPickupCount > 1 ||
    hullPickupCount > 1 ||
    movingShieldPowerupCount > 1 ||
    movingHullPowerupCount > 1
  ) {
    throw new Error("Per-type debris cap was exceeded during simulation.");
  }

  if (state.elapsedMs < 10000) {
    earlyDebrisSamples += 1;
    earlyDebrisTotal += state.debris.length;
  }

  if (state.elapsedMs < 60000) {
    maxHeavyEarly = Math.max(maxHeavyEarly, heavyCount);
    maxCorrosiveEarly = Math.max(maxCorrosiveEarly, corrosiveCount);
    maxSplatterEarly = Math.max(maxSplatterEarly, splatterCount);
    maxTankEarly = Math.max(maxTankEarly, tankCount);
  }

  if (state.elapsedMs >= 35000 && state.elapsedMs < 95000) {
    midLateDebrisSamples += 1;
    midLateDebrisTotal += state.debris.length;
  }

  if (state.objectives.length !== 2) {
    throw new Error(`Expected exactly 2 objectives, found ${state.objectives.length}.`);
  }

  for (const objective of state.objectives) {
    if (objective.completedAt) {
      const previousCompletion = completedTransitions.get(objective.id);
      if (previousCompletion !== undefined && previousCompletion !== objective.completedAt) {
        throw new Error(`Objective ${objective.id} completed more than once.`);
      }
      completedTransitions.set(objective.id, objective.completedAt);
    }
  }

  if (state.pendingLevelChoices > 0) {
    const beforePending = state.pendingLevelChoices;
    const beforeLevel = state.level;

    for (let index = 0; index < 5; index += 1) {
      state = gameReducer(state, { type: "tick", deltaMs: 100 });
    }

    if (state.pendingLevelChoices !== beforePending || state.level !== beforeLevel) {
      throw new Error("Level-up pause allowed progression while the choice overlay was open.");
    }

    pausedChecks += 1;

    state = gameReducer(state, {
      type: "selectUpgrade",
      upgrade: chooseOfferedUpgrade(state),
    });
    continue;
  }

  const dangerousCount = state.debris.filter(
    (debris) => debris.kind === "corrosive" || debris.kind === "splatter",
  ).length;
  if (
    !slowChecked &&
    state.elapsedMs >= 6000 &&
    state.abilities.slowTime.cooldownMs <= 0 &&
    (state.debris.length >= 2 || state.elapsedMs >= 18000)
  ) {
    state = gameReducer(state, { type: "useAbility", ability: "slowTime" });
    const afterUse = state.abilities.slowTime.cooldownMs;
    const secondAttempt = gameReducer(state, { type: "useAbility", ability: "slowTime" });

    if (secondAttempt.abilities.slowTime.cooldownMs !== afterUse) {
      throw new Error("Slow Time could be retriggered while on cooldown.");
    }

    if (state.pendingLevelChoices > 0) {
      state = gameReducer(state, { type: "selectUpgrade", upgrade: chooseOfferedUpgrade(state) });
    }

    state = gameReducer(state, { type: "tick", deltaMs: 1000 });
    if (!(state.abilities.slowTime.cooldownMs < afterUse && state.abilities.slowTime.cooldownMs > 0)) {
      throw new Error("Slow Time cooldown failed to tick down.");
    }

    slowChecked = true;
  }

  if (
    !nukeChecked &&
    state.elapsedMs >= 25000 &&
    state.abilities.nuke.cooldownMs <= 0 &&
    (state.debris.length >= 3 || dangerousCount >= 1)
  ) {
    const debrisBefore = state.debris.length;
    state = gameReducer(state, { type: "useAbility", ability: "nuke" });
    const afterUse = state.abilities.nuke.cooldownMs;
    if (afterUse <= 0) {
      continue;
    }
    const secondAttempt = gameReducer(state, { type: "useAbility", ability: "nuke" });

    if (secondAttempt.abilities.nuke.cooldownMs !== afterUse) {
      throw new Error("Nuke could be retriggered while on cooldown.");
    }

    if (debrisBefore > 0 && state.debris.length !== 0) {
      throw new Error("Nuke did not clear the board.");
    }

    if (state.pendingLevelChoices > 0) {
      state = gameReducer(state, { type: "selectUpgrade", upgrade: chooseOfferedUpgrade(state) });
    }

    state = gameReducer(state, { type: "tick", deltaMs: 1000 });
    if (!(state.abilities.nuke.cooldownMs < afterUse && state.abilities.nuke.cooldownMs > 0)) {
      throw new Error("Nuke cooldown failed to tick down.");
    }

    nukeChecked = true;
  }

  if (state.pendingLevelChoices === 0) {
    if (state.abilities.nuke.cooldownMs <= 0 && (state.debris.length >= 9 || state.hull < 78)) {
      state = gameReducer(state, { type: "useAbility", ability: "nuke" });
    } else if (
      state.abilities.slowTime.cooldownMs <= 0 &&
      state.elapsedMs >= 12000 &&
      (state.debris.length >= 6 || dangerousCount >= 2 || state.shield < 62)
    ) {
      state = gameReducer(state, { type: "useAbility", ability: "slowTime" });
    }
  }

  if (state.debris.length > 0) {
    const priority = ["tank", "splatter", "corrosive", "heavy", "normal"];
    const target =
      priority
        .map((kind) => state.debris.find((debris) => debris.kind === kind))
        .find(Boolean) ?? state.debris[0];

    state = gameReducer(
      state,
      state.isVacuumActive
        ? { type: "pointerMove", x: target.x, y: target.targetY }
        : { type: "pointerDown", x: target.x, y: target.targetY },
    );
  } else if (state.isVacuumActive) {
    state = gameReducer(state, { type: "pointerUp" });
  }

  state = gameReducer(state, { type: "tick", deltaMs: 100 });
}

const earlyAverageDebris = earlyDebrisTotal / Math.max(1, earlyDebrisSamples);
const midLateAverageDebris = midLateDebrisTotal / Math.max(1, midLateDebrisSamples);

const baseState: GameState = {
  ...createInitialState(),
  mode: "running",
};
const strongState: GameState = {
  ...createInitialState(),
  mode: "running",
  level: 12,
  upgrades: {
    power: UPGRADE_CAPS.power,
    range: UPGRADE_CAPS.range,
    tempo: UPGRADE_CAPS.tempo,
    ability: UPGRADE_CAPS.ability,
    shield: UPGRADE_CAPS.shield,
  },
  elapsedMs: 75000,
};

const baseStrength = getStrengthScore(baseState);
const strongStrength = getStrengthScore(strongState);
const strongDerived = getDerivedStats(strongState);
const capSamples = {
  level1: getActiveDebrisCaps(1),
  level3: getActiveDebrisCaps(3),
  level10: getActiveDebrisCaps(10),
  level16: getActiveDebrisCaps(16),
  level18: getActiveDebrisCaps(18),
  level22: getActiveDebrisCaps(22),
  level24: getActiveDebrisCaps(24),
  level12: getActiveDebrisCaps(12),
  level20: getActiveDebrisCaps(20),
  level30: getActiveDebrisCaps(30),
  level35: getActiveDebrisCaps(35),
  level38: getActiveDebrisCaps(38),
  level45: getActiveDebrisCaps(45),
  level56: getActiveDebrisCaps(56),
  level60: getActiveDebrisCaps(60),
  level70: getActiveDebrisCaps(70),
};
const totalCapSamples = {
  level1: getTotalActiveDebrisCap(1),
  level5: getTotalActiveDebrisCap(5),
  level10: getTotalActiveDebrisCap(10),
  level15: getTotalActiveDebrisCap(15),
  level25: getTotalActiveDebrisCap(25),
};
const midState: GameState = {
  ...createInitialState(),
  mode: "running",
  elapsedMs: 65000,
  level: 6,
  upgrades: {
    power: 2,
    range: 2,
    tempo: 2,
    ability: 1,
    shield: 0,
  },
};
const shieldedMidState: GameState = {
  ...midState,
  upgrades: {
    ...midState.upgrades,
    shield: 3,
  },
};
const midDerived = getDerivedStats(midState);
const shieldedMidDerived = getDerivedStats(shieldedMidState);
const milestoneBaselineState: GameState = {
  ...createInitialState(),
  mode: "running",
  level: 20,
};
const milestoneState: GameState = {
  ...milestoneBaselineState,
  modifiers: [
    { level: 5, key: "rangeBoost" },
    { level: 10, key: "spawnRateBoost" },
    { level: 15, key: "shieldRegenBoost" },
    { level: 20, key: "softCapBoost" },
  ],
};
const pickupModifierState: GameState = {
  ...milestoneBaselineState,
  modifiers: [{ level: 5, key: "pickupBoost" }],
};
const milestoneBaselineDerived = getDerivedStats(milestoneBaselineState);
const milestoneDerived = getDerivedStats(milestoneState);
const pickupModifierDerived = getDerivedStats(pickupModifierState);
const milestoneLevels = getMilestoneLevels();
const behaviorRates = {
  level1: getDebrisBehaviorRates(1),
  level10: getDebrisBehaviorRates(10),
  level20: getDebrisBehaviorRates(20),
  level30: getDebrisBehaviorRates(30),
};
const rangeCap = getVacuumRange(strongState);
const spawnIntervalBase = getSpawnIntervalSeconds(0, baseState.level);
const spawnIntervalStrong = getSpawnIntervalSeconds(75, strongState.level);
const spawnCountBase = getSpawnCount(0, baseStrength, baseState.level);
const spawnCountStrong = getSpawnCount(75, strongStrength, strongState.level);
const targetDebrisBase = getTargetActiveDebris(0, baseStrength, baseState.level);
const targetDebrisStrong = getTargetActiveDebris(75, strongStrength, strongState.level);
const stageKeys = {
  early: Object.keys(getDebrisSpawnWeights(1)),
  mid: Object.keys(getDebrisSpawnWeights(3)),
  later: Object.keys(getDebrisSpawnWeights(10)),
  advanced: Object.keys(getDebrisSpawnWeights(18)),
  splatterTier: Object.keys(getDebrisSpawnWeights(12)),
  tankTier: Object.keys(getDebrisSpawnWeights(18)),
};
const pickupChances = {
  shieldSafe: getShieldPickupChance(0.6),
  shieldLow: getShieldPickupChance(0.5),
  shieldMid: getShieldPickupChance(0.25),
  shieldCritical: getShieldPickupChance(0.08),
  hullHealthy: getHullPickupChance(0.8),
  hullCaution: getHullPickupChance(0.6),
  hullLow: getHullPickupChance(0.4),
  hullCritical: getHullPickupChance(0.12),
};
const movingPowerupChanceSamples = {
  shieldStable: getMovingShieldPowerupChance(0.5, 0.6),
  shieldCritical: getMovingShieldPowerupChance(0.12, 0.28),
  hullStable: getMovingHullPowerupChance(0.62),
  hullCritical: getMovingHullPowerupChance(0.18),
};
const movingPowerupTiming = getMovingPowerupTiming();
const rogueTiming = getRogueBotTiming();
const postNukeFallSpeed = {
  initial: Number(getPostNukeFallSpeedMultiplier(2200).toFixed(2)),
  hold: Number(getPostNukeFallSpeedMultiplier(1500).toFixed(2)),
  midpoint: Number(getPostNukeFallSpeedMultiplier(1100).toFixed(2)),
  expired: Number(getPostNukeFallSpeedMultiplier(0).toFixed(2)),
};

let cappedState: GameState = {
  ...createInitialState(),
  mode: "running",
  pendingLevelChoices: 1,
  upgradeChoices: ["power", "range", "shield"],
  upgrades: {
    power: UPGRADE_CAPS.power,
    range: UPGRADE_CAPS.range,
    tempo: UPGRADE_CAPS.tempo,
    ability: UPGRADE_CAPS.ability,
    shield: UPGRADE_CAPS.shield,
  },
};

cappedState = gameReducer(cappedState, { type: "selectUpgrade", upgrade: "power" });

let regenState: GameState = {
  ...createInitialState(),
  mode: "running",
  shield: 56,
  hull: 88,
  spawnCooldownMs: 999999,
  pickupCooldownMs: 999999,
  debris: withDebrisVisuals([
    {
      id: 1,
      kind: "corrosive",
      x: 50,
      targetY: 54,
      hp: 2,
      maxHp: 2,
      ageMs: 1200,
      fallDurationMs: 900,
    },
  ]),
};

const regenShieldBeforeNuke = regenState.shield;
regenState = gameReducer(regenState, { type: "useAbility", ability: "nuke" });
const regenShieldRightAfterNuke = regenState.shield;
regenState = gameReducer(regenState, { type: "tick", deltaMs: 100 });
const regenShieldAfterNukeTick = regenState.shield;

let postNukeSlowState: GameState = {
  ...createInitialState(),
  mode: "running",
  level: 20,
  spawnCooldownMs: 999999,
  pickupCooldownMs: 999999,
  movingPowerupCooldownMs: 999999,
  botCooldownMs: 999999,
  rogueBotCooldownMs: 999999,
};
postNukeSlowState = gameReducer(postNukeSlowState, { type: "useAbility", ability: "nuke" });
const postNukeSlowMsInitial = postNukeSlowState.postNukeSlowMs;
postNukeSlowState = {
  ...postNukeSlowState,
  debris: withDebrisVisuals([
    {
      id: 1,
      kind: "normal",
      x: 50,
      targetY: 56,
      hp: 1,
      maxHp: 1,
      ageMs: 0,
      fallDurationMs: 1000,
    },
  ]),
};
postNukeSlowState = gameReducer(postNukeSlowState, { type: "tick", deltaMs: 1000 });
const postNukeSlowAgeAfterOneSecond = postNukeSlowState.debris[0]?.ageMs ?? 0;
const postNukeSlowRemainingAfterOneSecond = postNukeSlowState.postNukeSlowMs;
postNukeSlowState = gameReducer(postNukeSlowState, { type: "tick", deltaMs: 2600 });
const postNukeSlowAgeAfterRecovery = postNukeSlowState.debris[0]?.ageMs ?? 0;
const postNukeSlowRemainingAfterRecovery = postNukeSlowState.postNukeSlowMs;

let regenStopState: GameState = {
  ...createInitialState(),
  mode: "running",
  shield: 60,
  hull: 96,
  spawnCooldownMs: 999999,
  pickupCooldownMs: 999999,
};
regenStopState = gameReducer(regenStopState, { type: "tick", deltaMs: 1000 });
const shieldAfterRecoveryWindow = regenStopState.shield;
regenStopState = {
  ...regenStopState,
  debris: withDebrisVisuals([
    {
      id: 1,
      kind: "normal",
      x: 52,
      targetY: 58,
      hp: 1,
      maxHp: 1,
      ageMs: 1200,
      fallDurationMs: 900,
    },
    {
      id: 2,
      kind: "normal",
      x: 58,
      targetY: 52,
      hp: 1,
      maxHp: 1,
      ageMs: 1200,
      fallDurationMs: 900,
    },
    {
      id: 3,
      kind: "normal",
      x: 44,
      targetY: 56,
      hp: 1,
      maxHp: 1,
      ageMs: 1200,
      fallDurationMs: 900,
    },
  ]),
};
const shieldAtDebrisReturn = regenStopState.shield;
regenStopState = gameReducer(regenStopState, { type: "tick", deltaMs: 200 });
const shieldAfterDebrisReturned = regenStopState.shield;

let fallingRegenState: GameState = {
  ...createInitialState(),
  mode: "running",
  shield: 60,
  hull: 96,
  spawnCooldownMs: 999999,
  pickupCooldownMs: 999999,
  debris: withDebrisVisuals([
    {
      id: 1,
      kind: "normal",
      x: 48,
      targetY: 56,
      hp: 1,
      maxHp: 1,
      ageMs: 0,
      fallDurationMs: 2200,
    },
    {
      id: 2,
      kind: "normal",
      x: 56,
      targetY: 52,
      hp: 1,
      maxHp: 1,
      ageMs: 0,
      fallDurationMs: 2200,
    },
    {
      id: 3,
      kind: "normal",
      x: 40,
      targetY: 60,
      hp: 1,
      maxHp: 1,
      ageMs: 0,
      fallDurationMs: 2200,
    },
  ]),
};

const restingBeforeFallingTick = getRestingDebrisCount(fallingRegenState.debris);
const burdenBeforeFallingTick = getRestingDebrisBurden(fallingRegenState.debris);
fallingRegenState = gameReducer(fallingRegenState, { type: "tick", deltaMs: 1000 });
const shieldWhileDebrisFalling = fallingRegenState.shield;
const restingWhileDebrisFalling = getRestingDebrisCount(fallingRegenState.debris);
const burdenWhileDebrisFalling = getRestingDebrisBurden(fallingRegenState.debris);
fallingRegenState = gameReducer(fallingRegenState, { type: "tick", deltaMs: 1300 });
const shieldAfterDebrisLanded = fallingRegenState.shield;
const restingAfterDebrisLanded = getRestingDebrisCount(fallingRegenState.debris);
const burdenAfterDebrisLanded = getRestingDebrisBurden(fallingRegenState.debris);

let pickupState: GameState = {
  ...createInitialState(),
  mode: "running",
  shield: 10,
  hull: 72,
  spawnCooldownMs: 999999,
  pickupCooldownMs: 999999,
  pickups: [
    {
      id: 1,
      kind: "shield",
      x: 38,
      targetY: 92,
      ageMs: 1000,
      fallDurationMs: 2000,
    },
    {
      id: 2,
      kind: "hull",
      x: 68,
      targetY: 92,
      ageMs: 1000,
      fallDurationMs: 2000,
    },
  ],
  nextPickupId: 3,
};

const shieldPickupY = getFallingY(
  pickupState.pickups[0].targetY,
  pickupState.pickups[0].ageMs,
  pickupState.pickups[0].fallDurationMs,
);
pickupState = gameReducer(pickupState, { type: "pointerDown", x: 38, y: shieldPickupY });
pickupState = gameReducer(pickupState, { type: "tick", deltaMs: 100 });
const shieldAfterPickup = pickupState.shield;
const shieldPickupsRemaining = pickupState.pickups.filter((pickup) => pickup.kind === "shield").length;

const hullPickup = pickupState.pickups.find((pickup) => pickup.kind === "hull");
if (!hullPickup) {
  throw new Error("Hull pickup disappeared before collection.");
}
const hullPickupY = getFallingY(hullPickup.targetY, hullPickup.ageMs, hullPickup.fallDurationMs);
pickupState = gameReducer(pickupState, { type: "pointerMove", x: hullPickup.x, y: hullPickupY });
pickupState = gameReducer(pickupState, { type: "tick", deltaMs: 100 });
const hullAfterPickup = pickupState.hull;
const hullPickupsRemaining = pickupState.pickups.filter((pickup) => pickup.kind === "hull").length;
pickupState = gameReducer(pickupState, { type: "pointerUp" });

let movingPowerupState: GameState = {
  ...createInitialState(),
  mode: "running",
  shield: 20,
  hull: 70,
  spawnCooldownMs: 999999,
  pickupCooldownMs: 999999,
  movingPowerupCooldownMs: 999999,
  botCooldownMs: 999999,
  powerups: [
    {
      id: 1,
      kind: "shield",
      x: 36,
      y: 48,
      velocityX: 42,
      velocityY: 0,
      value: 50,
      ageMs: 0,
      lifeMs: 3000,
      entrySide: "left",
    },
    {
      id: 2,
      kind: "hull",
      x: 64,
      y: 48,
      velocityX: -42,
      velocityY: 0,
      value: 25,
      ageMs: 0,
      lifeMs: 3000,
      entrySide: "right",
    },
  ],
  nextPowerupId: 3,
};
movingPowerupState = gameReducer(movingPowerupState, { type: "pointerDown", x: 36, y: 48 });
movingPowerupState = gameReducer(movingPowerupState, { type: "tick", deltaMs: 100 });
const shieldAfterMovingPowerup = movingPowerupState.shield;
const movingShieldPowerupsRemaining = movingPowerupState.powerups.filter((powerup) => powerup.kind === "shield").length;
movingPowerupState = gameReducer(movingPowerupState, { type: "pointerMove", x: 64, y: 48 });
movingPowerupState = gameReducer(movingPowerupState, { type: "tick", deltaMs: 100 });
const hullAfterMovingPowerup = movingPowerupState.hull;
const movingHullPowerupsRemaining = movingPowerupState.powerups.filter((powerup) => powerup.kind === "hull").length;
movingPowerupState = gameReducer(movingPowerupState, { type: "pointerUp" });

let movingEscapeState: GameState = {
  ...createInitialState(),
  mode: "running",
  spawnCooldownMs: 999999,
  pickupCooldownMs: 999999,
  movingPowerupCooldownMs: 999999,
  botCooldownMs: 999999,
  powerups: [
    {
      id: 1,
      kind: "shield",
      x: 104,
      y: 50,
      velocityX: 42,
      velocityY: 0,
      value: 50,
      ageMs: 0,
      lifeMs: 3000,
      entrySide: "right",
    },
  ],
};
movingEscapeState = gameReducer(movingEscapeState, { type: "tick", deltaMs: 250 });
const movingPowerupsAfterEscape = movingEscapeState.powerups.length;

const movingPowerupSides = new Set<string>();
for (let seed = 1; seed < 200 && movingPowerupSides.size < 3; seed += 1) {
  let movingSpawnState: GameState = {
    ...createInitialState(),
    mode: "running",
    rngSeed: seed,
    shield: 20,
    hull: 55,
    spawnCooldownMs: 999999,
    pickupCooldownMs: 999999,
    movingPowerupCooldownMs: 0,
    botCooldownMs: 999999,
  };
  movingSpawnState = gameReducer(movingSpawnState, { type: "tick", deltaMs: 100 });
  if (movingSpawnState.powerups[0]) {
    movingPowerupSides.add(movingSpawnState.powerups[0].entrySide);
  }
}

let softCapState: GameState = {
  ...createInitialState(),
  mode: "running",
  level: 20,
  spawnCooldownMs: -1,
  pickupCooldownMs: 999999,
  botCooldownMs: 999999,
  debris: withDebrisVisuals(Array.from({ length: getTotalActiveDebrisCap(20) }, (_, index) => ({
    id: index + 1,
    kind: "normal" as const,
    x: 18 + (index % 8) * 8,
    targetY: 34 + Math.floor(index / 8) * 12,
    hp: 1,
    maxHp: 1,
    ageMs: 1200,
    fallDurationMs: 900,
  }))),
  nextDebrisId: getTotalActiveDebrisCap(20) + 1,
};
const softCapStartCount = softCapState.debris.length;
for (let index = 0; index < 18 && softCapState.debris.length <= softCapStartCount; index += 1) {
  softCapState = gameReducer(softCapState, { type: "tick", deltaMs: 100 });
}
const debrisAfterSoftCapTicks = softCapState.debris.length;

let heavyLoadState: GameState = {
  ...createInitialState(),
  mode: "running",
  shield: 0,
  hull: 120,
  spawnCooldownMs: 999999,
  pickupCooldownMs: 999999,
  botCooldownMs: 999999,
  debris: withDebrisVisuals(Array.from({ length: 8 }, (_, index) => ({
    id: index + 1,
    kind: "normal" as const,
    x: 20 + index * 7,
    targetY: 50 + (index % 2) * 6,
    hp: 1,
    maxHp: 1,
    ageMs: 1200,
    fallDurationMs: 900,
  }))),
};
heavyLoadState = gameReducer(heavyLoadState, { type: "tick", deltaMs: 1000 });
const hullAfterHeavyLoad = heavyLoadState.hull;

let lightLoadState: GameState = {
  ...createInitialState(),
  mode: "running",
  shield: 0,
  hull: 120,
  spawnCooldownMs: 999999,
  pickupCooldownMs: 999999,
  botCooldownMs: 999999,
  debris: withDebrisVisuals(Array.from({ length: 2 }, (_, index) => ({
    id: index + 1,
    kind: "normal" as const,
    x: 38 + index * 16,
    targetY: 54,
    hp: 1,
    maxHp: 1,
    ageMs: 1200,
    fallDurationMs: 900,
  }))),
};
lightLoadState = gameReducer(lightLoadState, { type: "tick", deltaMs: 1000 });
const hullAfterLightLoad = lightLoadState.hull;

let corrosiveDamageState: GameState = {
  ...createInitialState(),
  mode: "running",
  shield: 0,
  hull: 120,
  spawnCooldownMs: 999999,
  pickupCooldownMs: 999999,
  botCooldownMs: 999999,
  debris: withDebrisVisuals([
    {
      id: 1,
      kind: "corrosive",
      x: 50,
      targetY: 54,
      hp: getDebrisHp("corrosive", 20),
      maxHp: getDebrisHp("corrosive", 20),
      ageMs: 1600,
      fallDurationMs: 900,
    },
  ]),
};
const corrosiveDamagePerSecond = getCorrosiveHullDamagePerSecond(corrosiveDamageState.debris);
corrosiveDamageState = gameReducer(corrosiveDamageState, { type: "tick", deltaMs: 1000 });
const hullAfterCorrosiveLoad = corrosiveDamageState.hull;
const singleRestingPressureOnlyHull = 120 - getHullPressureDamagePerSecond(1, 120);

const heavyHpLevel35 = getDebrisHp("heavy", 35);
const tankHpLevel35 = getDebrisHp("tank", 35);

let tankBurdenState: GameState = {
  ...createInitialState(),
  mode: "running",
  shield: 0,
  hull: 120,
  spawnCooldownMs: 999999,
  pickupCooldownMs: 999999,
  botCooldownMs: 999999,
  rogueBotCooldownMs: 999999,
  debris: withDebrisVisuals([
    {
      id: 1,
      kind: "tank",
      x: 50,
      targetY: 54,
      hp: getDebrisHp("tank", 35),
      maxHp: getDebrisHp("tank", 35),
      ageMs: 1600,
      fallDurationMs: 900,
    },
  ]),
};
const tankRestingBurden = getRestingDebrisBurden(tankBurdenState.debris);
tankBurdenState = gameReducer(tankBurdenState, { type: "tick", deltaMs: 1000 });
const hullAfterTankBurden = tankBurdenState.hull;

let splatterBurdenState: GameState = {
  ...createInitialState(),
  mode: "running",
  shield: 0,
  hull: 120,
  level: 30,
  spawnCooldownMs: 999999,
  pickupCooldownMs: 999999,
  botCooldownMs: 999999,
  rogueBotCooldownMs: 999999,
  debris: withDebrisVisuals([
    {
      id: 1,
      kind: "splatter",
      x: 50,
      targetY: 54,
      hp: getDebrisHp("splatter", 30),
      maxHp: getDebrisHp("splatter", 30),
      ageMs: 1000,
      fallDurationMs: 900,
    },
  ]),
};
const splatterRestingBurden = getRestingDebrisBurden(splatterBurdenState.debris);
splatterBurdenState = gameReducer(splatterBurdenState, { type: "tick", deltaMs: 300 });
const hullAfterSplatterBurden = splatterBurdenState.hull;
const expectedHullAfterSplatterBurden = 120 - getHullPressureDamagePerSecond(3, 120) * 0.3;

let threeNormalBurdenState: GameState = {
  ...createInitialState(),
  mode: "running",
  shield: 0,
  hull: 120,
  spawnCooldownMs: 999999,
  pickupCooldownMs: 999999,
  botCooldownMs: 999999,
  rogueBotCooldownMs: 999999,
  debris: withDebrisVisuals(Array.from({ length: 3 }, (_, index) => ({
    id: index + 1,
    kind: "normal" as const,
    x: 42 + index * 8,
    targetY: 54,
    hp: 1,
    maxHp: 1,
    ageMs: 1600,
    fallDurationMs: 900,
  }))),
};
threeNormalBurdenState = gameReducer(threeNormalBurdenState, { type: "tick", deltaMs: 1000 });
const hullAfterThreeNormalBurden = threeNormalBurdenState.hull;

let heavyCleanupState: GameState = {
  ...createInitialState(),
  mode: "running",
  level: 22,
  spawnCooldownMs: 999999,
  pickupCooldownMs: 999999,
  botCooldownMs: 999999,
  rogueBotCooldownMs: 999999,
  vacuumX: 50,
  vacuumY: 54,
  vacuumTargetX: 50,
  vacuumTargetY: 54,
  isVacuumActive: true,
  debris: withDebrisVisuals([
    {
      id: 1,
      kind: "heavy",
      x: 50,
      targetY: 54,
      hp: getDebrisHp("heavy", 22),
      maxHp: getDebrisHp("heavy", 22),
      ageMs: 1600,
      fallDurationMs: 900,
    },
  ]),
};
const heavyCleanupStartStage = heavyCleanupState.debris[0]?.cleanupStage ?? 0;
heavyCleanupState = gameReducer(heavyCleanupState, { type: "tick", deltaMs: 500 });
const heavyCleanupDebris = heavyCleanupState.debris[0];
const heavyCleanupProgress = heavyCleanupDebris?.cleanupProgress ?? 0;
const heavyCleanupStage = heavyCleanupDebris?.cleanupStage ?? 0;
const heavyCleanupRenderSprite = heavyCleanupDebris ? getDebrisRenderSprite(heavyCleanupDebris) : null;
const splatterVariantProbe = getRandomSplatterDebrisVariant(1).variant;

let splatterTimerState: GameState = {
  ...createInitialState(),
  mode: "running",
  level: 30,
  spawnCooldownMs: 999999,
  pickupCooldownMs: 999999,
  botCooldownMs: 999999,
  rogueBotCooldownMs: 999999,
  debris: withDebrisVisuals([
    {
      id: 1,
      kind: "splatter",
      x: 52,
      targetY: 58,
      hp: getDebrisHp("splatter", 30),
      maxHp: getDebrisHp("splatter", 30),
      ageMs: 880,
      fallDurationMs: 900,
    },
  ]),
  nextDebrisId: 2,
};
splatterTimerState = gameReducer(splatterTimerState, { type: "tick", deltaMs: 10 });
const splatterWhileFallingCount = splatterTimerState.debris.filter((debris) => debris.kind === "splatter").length;
const corrosiveWhileFallingCount = splatterTimerState.debris.filter((debris) => debris.kind === "corrosive").length;
splatterTimerState = gameReducer(splatterTimerState, { type: "tick", deltaMs: 20 });
const splatterJustLandedCount = splatterTimerState.debris.filter((debris) => debris.kind === "splatter").length;
const splatterRestingState = splatterTimerState.debris.find((debris) => debris.kind === "splatter")?.state;
splatterTimerState = gameReducer(splatterTimerState, { type: "tick", deltaMs: 1110 });
const splatterExplodingState = splatterTimerState.debris.find((debris) => debris.kind === "splatter")?.state;
const splatterExplosionSprite = splatterTimerState.debris.find((debris) => debris.kind === "splatter")
  ? getDebrisRenderSprite(splatterTimerState.debris.find((debris) => debris.kind === "splatter")!)
  : null;
splatterTimerState = gameReducer(splatterTimerState, { type: "tick", deltaMs: 220 });
const splatterAfterFuseCount = splatterTimerState.debris.filter((debris) => debris.kind === "splatter").length;
const corrosiveAfterSplatterBurst = splatterTimerState.debris.filter((debris) => debris.kind === "corrosive").length;
const corrosiveStatesAfterSplatterBurst = splatterTimerState.debris
  .filter((debris) => debris.kind === "corrosive")
  .map((debris) => debris.state);

let shieldBotState: GameState = {
  ...createInitialState(),
  mode: "running",
  shield: 62,
  hull: 108,
  spawnCooldownMs: 999999,
  pickupCooldownMs: 999999,
  botCooldownMs: 0,
};
shieldBotState = {
  ...shieldBotState,
  activeBot: {
    kind: "shield",
    x: 32,
    y: 44,
    velocityX: 0,
    velocityY: 0,
    baseY: 44,
    entrySide: "left",
    ageMs: 0,
    lifeMs: 10000,
    fireCooldownMs: 0,
    payloadCooldownMs: 999999,
    wobblePhase: 0,
    animationFrameIndex: 0,
    animationTimer: 0,
  },
};
const shieldBeforeBotRegen = shieldBotState.shield;
shieldBotState = gameReducer(shieldBotState, { type: "tick", deltaMs: 1000 });
const shieldAfterBotRegen = shieldBotState.shield;
const shieldBotTarget = shieldBotState.activeBot;
if (!shieldBotTarget) {
  throw new Error("Shield bot failed to stay active for verification.");
}
shieldBotState = gameReducer(shieldBotState, {
  type: "pointerDown",
  x: shieldBotTarget.x,
  y: shieldBotTarget.y,
});
shieldBotState = gameReducer(shieldBotState, { type: "tick", deltaMs: 100 });
const shieldAfterBotVacuumPenalty = shieldBotState.shield;
const shieldBotRemovedByVacuum = !shieldBotState.activeBot;
shieldBotState = gameReducer(shieldBotState, { type: "pointerUp" });

let directBotPenaltyState: GameState = {
  ...createInitialState(),
  mode: "running",
  shield: 30,
  spawnCooldownMs: 999999,
  pickupCooldownMs: 999999,
  botCooldownMs: 999999,
  activeBot: {
    kind: "shield",
    x: 30,
    y: 44,
    velocityX: 0,
    velocityY: 0,
    baseY: 44,
    entrySide: "left",
    ageMs: 0,
    lifeMs: 10000,
    fireCooldownMs: 0,
    payloadCooldownMs: 999999,
    wobblePhase: 0,
    animationFrameIndex: 0,
    animationTimer: 0,
  },
};
directBotPenaltyState = gameReducer(directBotPenaltyState, {
  type: "pointerDown",
  x: 30,
  y: 44,
});
directBotPenaltyState = gameReducer(directBotPenaltyState, { type: "tick", deltaMs: 100 });
const directShieldAfterBotPenalty = directBotPenaltyState.shield;

let lowShieldBotPenaltyState: GameState = {
  ...createInitialState(),
  mode: "running",
  shield: 8,
  spawnCooldownMs: 999999,
  pickupCooldownMs: 999999,
  botCooldownMs: 999999,
  activeBot: {
    kind: "shield",
    x: 30,
    y: 44,
    velocityX: 0,
    velocityY: 0,
    baseY: 44,
    entrySide: "left",
    ageMs: 0,
    lifeMs: 10000,
    fireCooldownMs: 0,
    payloadCooldownMs: 999999,
    wobblePhase: 0,
    animationFrameIndex: 0,
    animationTimer: 0,
  },
};
lowShieldBotPenaltyState = gameReducer(lowShieldBotPenaltyState, {
  type: "pointerDown",
  x: 30,
  y: 44,
});
lowShieldBotPenaltyState = gameReducer(lowShieldBotPenaltyState, { type: "tick", deltaMs: 100 });
const lowShieldAfterBotVacuumPenalty = lowShieldBotPenaltyState.shield;

let scrapBotState: GameState = {
  ...createInitialState(),
  mode: "running",
  spawnCooldownMs: 999999,
  pickupCooldownMs: 999999,
  botCooldownMs: 999999,
  activeBot: {
    kind: "scrap",
    x: 24,
    y: 30,
    velocityX: 0,
    velocityY: 0,
    baseY: 30,
    entrySide: "left",
    ageMs: 0,
    lifeMs: 10000,
    fireCooldownMs: 0,
    payloadCooldownMs: 999999,
    wobblePhase: 0,
    animationFrameIndex: 0,
    animationTimer: 0,
  },
  debris: withDebrisVisuals([
    {
      id: 1,
      kind: "normal",
      x: 58,
      targetY: 62,
      hp: 1,
      maxHp: 1,
      ageMs: 1200,
      fallDurationMs: 900,
    },
  ]),
};
const scrapDistanceBefore = Math.hypot(
  (scrapBotState.activeBot?.x ?? 0) - scrapBotState.debris[0].x,
  (scrapBotState.activeBot?.y ?? 0) - scrapBotState.debris[0].targetY,
);
scrapBotState = gameReducer(scrapBotState, { type: "tick", deltaMs: 1800 });
const scrapDistanceAfter = scrapBotState.debris[0]
  ? Math.hypot(
      (scrapBotState.activeBot?.x ?? 0) - scrapBotState.debris[0].x,
      (scrapBotState.activeBot?.y ?? 0) - scrapBotState.debris[0].targetY,
    )
  : 0;
const scrapBotDamagedDebris =
  scrapBotState.debris.length === 0 || (scrapBotState.debris[0]?.hp ?? 0) < 1;
const scrapBotClearedDebris = scrapBotState.debris.length === 0;

let turretBotState: GameState = {
  ...createInitialState(),
  mode: "running",
  spawnCooldownMs: 999999,
  pickupCooldownMs: 999999,
  botCooldownMs: 999999,
  activeBot: {
    kind: "turret",
    x: 48,
    y: 50,
    velocityX: 0,
    velocityY: 0,
    baseY: 50,
    entrySide: "left",
    ageMs: 0,
    lifeMs: 10000,
    fireCooldownMs: 0,
    payloadCooldownMs: 999999,
    wobblePhase: 0,
    animationFrameIndex: 0,
    animationTimer: 0,
  },
  debris: withDebrisVisuals([
    {
      id: 1,
      kind: "corrosive",
      x: 54,
      targetY: 52,
      hp: 2,
      maxHp: 2,
      ageMs: 1200,
      fallDurationMs: 900,
    },
  ]),
};
turretBotState = gameReducer(turretBotState, { type: "tick", deltaMs: 100 });
const turretBotShotFired = turretBotState.botShots.length > 0;
const turretBotDamagedDebris =
  turretBotState.debris.length === 0 || (turretBotState.debris[0]?.hp ?? 0) < 2;

let rogueBotActionState: GameState = {
  ...createInitialState(),
  mode: "running",
  spawnCooldownMs: 999999,
  pickupCooldownMs: 999999,
  movingPowerupCooldownMs: 999999,
  botCooldownMs: 999999,
  salvage: 0,
  activeRogueBot: {
    kind: "rogue",
    x: 49,
    y: 52,
    velocityX: 0,
    velocityY: 0,
    baseY: 52,
    entrySide: "left",
    ageMs: 0,
    lifeMs: 10000,
    fireCooldownMs: 0,
    payloadCooldownMs: 0,
    wobblePhase: 0,
    animationFrameIndex: 0,
    animationTimer: 0,
  },
  debris: withDebrisVisuals([
    {
      id: 1,
      kind: "normal",
      x: 63,
      targetY: 52,
      hp: 1,
      maxHp: 1,
      ageMs: 1200,
      fallDurationMs: 900,
    },
    {
      id: 2,
      kind: "tank",
      x: 53,
      targetY: 53,
      hp: getDebrisHp("tank", 20),
      maxHp: getDebrisHp("tank", 20),
      ageMs: 1200,
      fallDurationMs: 900,
    },
  ]),
  nextDebrisId: 3,
};
rogueBotActionState = gameReducer(rogueBotActionState, { type: "tick", deltaMs: 300 });
const rogueBotSpawnedDebris = rogueBotActionState.debris.filter((debris) => debris.id >= 3);
const rogueBotTargetedPriorityDebris = !rogueBotActionState.debris.some((debris) => debris.id === 2);
const rogueBotDidNotRewardPlayer = rogueBotActionState.salvage === 0;
const rogueBotReplacementCount = rogueBotActionState.debris.length === 3;
const rogueBotReplacementLockActive =
  rogueBotSpawnedDebris.length === 2 &&
  rogueBotSpawnedDebris.every(
    (debris) => debris.state === "flying" && (debris.rogueTargetLockUntilMs ?? 0) > rogueBotActionState.elapsedMs,
  );
const rogueBotMovedDifferently =
  Boolean(rogueBotActionState.activeRogueBot) &&
  (Math.abs((rogueBotActionState.activeRogueBot?.x ?? 49) - 49) > 0.5 ||
    Math.abs((rogueBotActionState.activeRogueBot?.y ?? 52) - 52) > 0.3);
const rogueBotCooldownReset =
  (rogueBotActionState.activeRogueBot?.payloadCooldownMs ?? 0) >= rogueTiming.actionMinMs;

let rogueNukeState: GameState = {
  ...createInitialState(),
  mode: "running",
  spawnCooldownMs: 999999,
  pickupCooldownMs: 999999,
  movingPowerupCooldownMs: 999999,
  botCooldownMs: 999999,
  rogueBotCooldownMs: 999999,
  activeRogueBot: {
    kind: "rogue",
    x: 50,
    y: 48,
    velocityX: 0,
    velocityY: 0,
    baseY: 48,
    entrySide: "left",
    ageMs: 0,
    lifeMs: 10000,
    fireCooldownMs: 0,
    payloadCooldownMs: 999999,
    wobblePhase: 0,
    animationFrameIndex: 0,
    animationTimer: 0,
  },
  debris: withDebrisVisuals([
    {
      id: 1,
      kind: "normal",
      x: 54,
      targetY: 56,
      hp: 1,
      maxHp: 1,
      ageMs: 1200,
      fallDurationMs: 900,
    },
  ]),
};
rogueNukeState = gameReducer(rogueNukeState, { type: "useAbility", ability: "nuke" });
const rogueBotDestroyedByNuke = !rogueNukeState.activeRogueBot;

let rogueVacuumState: GameState = {
  ...createInitialState(),
  mode: "running",
  spawnCooldownMs: 999999,
  pickupCooldownMs: 999999,
  movingPowerupCooldownMs: 999999,
  botCooldownMs: 999999,
  vacuumX: 50,
  vacuumY: 50,
  vacuumTargetX: 50,
  vacuumTargetY: 50,
  isVacuumActive: true,
  activeRogueBot: {
    kind: "rogue",
    x: 50,
    y: 50,
    velocityX: 0,
    velocityY: 0,
    baseY: 50,
    entrySide: "left",
    ageMs: 0,
    lifeMs: 10000,
    fireCooldownMs: 0,
    payloadCooldownMs: 999999,
    wobblePhase: 0,
    animationFrameIndex: 0,
    animationTimer: 0,
  },
  debris: withDebrisVisuals([
    {
      id: 1,
      kind: "normal",
      x: 52,
      targetY: 50,
      hp: 1,
      maxHp: 1,
      ageMs: 1200,
      fallDurationMs: 900,
    },
    {
      id: 2,
      kind: "normal",
      x: 80,
      targetY: 50,
      hp: 1,
      maxHp: 1,
      ageMs: 1200,
      fallDurationMs: 900,
    },
  ]),
};
rogueVacuumState = gameReducer(rogueVacuumState, { type: "tick", deltaMs: 100 });
const rogueBotRemovedByVacuum = !rogueVacuumState.activeRogueBot;
const rogueVacuumLeftDebrisUntouched =
  rogueVacuumState.debris.length === 2 &&
  rogueVacuumState.debris.some((debris) => debris.id === 1) &&
  rogueVacuumState.debris.some((debris) => debris.id === 2);

let spawnBotState: GameState = {
  ...createInitialState(),
  mode: "running",
  shield: 65,
  hull: 108,
  spawnCooldownMs: 999999,
  pickupCooldownMs: 999999,
  movingPowerupCooldownMs: 999999,
  botCooldownMs: 0,
};
spawnBotState = gameReducer(spawnBotState, { type: "tick", deltaMs: 100 });
spawnBotState = gameReducer(spawnBotState, { type: "tick", deltaMs: 2400 });
const spawnedBotKind = spawnBotState.activeBot?.kind;

let warningState: GameState = {
  ...createInitialState(),
  mode: "running",
  spawnCooldownMs: 999999,
  pickupCooldownMs: 999999,
  movingPowerupCooldownMs: 999999,
  botCooldownMs: 0,
};
warningState = gameReducer(warningState, { type: "tick", deltaMs: 100 });
const incomingBotWarningVisible = Boolean(warningState.incomingBotWarning);
const warningBotStillPending = !warningState.activeBot;
warningState = gameReducer(warningState, { type: "tick", deltaMs: 2400 });
const warningResolvedIntoBot = Boolean(warningState.activeBot) && !warningState.incomingBotWarning;

let botDroppedMovingPowerup = false;
for (let seed = 1; seed < 500 && !botDroppedMovingPowerup; seed += 1) {
  let botDropState: GameState = {
    ...createInitialState(),
    mode: "running",
    rngSeed: seed,
    shield: 24,
    hull: 82,
    spawnCooldownMs: 999999,
    pickupCooldownMs: 999999,
    movingPowerupCooldownMs: 999999,
    botCooldownMs: 999999,
    activeBot: {
      kind: "shield",
      x: 48,
      y: 46,
      velocityX: 0,
      velocityY: 0,
      baseY: 46,
      entrySide: "left",
      ageMs: 9950,
      lifeMs: 10000,
      fireCooldownMs: 0,
      payloadCooldownMs: 999999,
      wobblePhase: 0,
      animationFrameIndex: 0,
      animationTimer: 0,
    },
  };
  botDropState = gameReducer(botDropState, { type: "tick", deltaMs: 100 });
  botDroppedMovingPowerup =
    botDropState.powerups.length > 0 && botDropState.powerups[0].entrySide === "bot";
}

let overlappingBotState: GameState = {
  ...createInitialState(),
  mode: "running",
  level: 12,
  spawnCooldownMs: 999999,
  pickupCooldownMs: 999999,
  botCooldownMs: 999999,
  rogueBotCooldownMs: 0,
  activeBot: {
    kind: "shield",
    x: 30,
    y: 40,
    velocityX: 0,
    velocityY: 0,
    baseY: 40,
    entrySide: "left",
    ageMs: 0,
    lifeMs: 10000,
    fireCooldownMs: 0,
    payloadCooldownMs: 999999,
    wobblePhase: 0,
    animationFrameIndex: 0,
    animationTimer: 0,
  },
};
overlappingBotState = gameReducer(overlappingBotState, { type: "tick", deltaMs: 100 });
const rogueWarningCanOverlap = Boolean(overlappingBotState.incomingRogueBotWarning);
overlappingBotState = gameReducer(overlappingBotState, { type: "tick", deltaMs: 2400 });
const helpfulBotStillActiveDuringRogueOverlap = Boolean(overlappingBotState.activeBot);
const rogueOverlapActive = Boolean(overlappingBotState.activeRogueBot);

let pullState: GameState = {
  ...createInitialState(),
  mode: "running",
  spawnCooldownMs: 999999,
  pickupCooldownMs: 999999,
  botCooldownMs: 999999,
  vacuumX: 50,
  vacuumY: 52,
  vacuumTargetX: 50,
  vacuumTargetY: 52,
  isVacuumActive: true,
  debris: withDebrisVisuals([
    {
      id: 1,
      kind: "normal",
      x: 64,
      targetY: 52,
      hp: 1,
      maxHp: 1,
      ageMs: 1200,
      fallDurationMs: 900,
    },
  ]),
};
const pullDistanceBefore = Math.abs(pullState.debris[0].x - pullState.vacuumX);
pullState = gameReducer(pullState, { type: "tick", deltaMs: 200 });
const pulledDebrisX = pullState.debris[0]?.x ?? 64;
const pullDistanceAfter = Math.abs(pulledDebrisX - pullState.vacuumX);

let splitFragmentsSpawned = 0;
for (let seed = 1; seed < 5000 && splitFragmentsSpawned === 0; seed += 1) {
  let splitState: GameState = {
    ...createInitialState(),
    mode: "running",
    rngSeed: seed,
    spawnCooldownMs: 999999,
    pickupCooldownMs: 999999,
    botCooldownMs: 999999,
    vacuumX: 50,
    vacuumY: 50,
    vacuumTargetX: 50,
    vacuumTargetY: 50,
    isVacuumActive: true,
    debris: withDebrisVisuals([
      {
        id: 1,
        kind: "heavy",
        x: 50,
        targetY: 50,
        hp: 3,
        maxHp: 3,
        ageMs: 1200,
        fallDurationMs: 900,
      },
    ]),
    nextDebrisId: 2,
  };
  splitState = gameReducer(splitState, { type: "tick", deltaMs: 1000 });
  splitFragmentsSpawned = splitState.debris.filter((debris) => debris.isFragment).length;
}

let comboState: GameState = {
  ...createInitialState(),
  mode: "running",
  spawnCooldownMs: 999999,
  pickupCooldownMs: 999999,
  botCooldownMs: 999999,
  vacuumX: 50,
  vacuumY: 54,
  vacuumTargetX: 50,
  vacuumTargetY: 54,
  isVacuumActive: true,
  debris: withDebrisVisuals([
    {
      id: 1,
      kind: "normal",
      x: 47,
      targetY: 54,
      hp: 1,
      maxHp: 1,
      ageMs: 1200,
      fallDurationMs: 900,
    },
    {
      id: 2,
      kind: "normal",
      x: 53,
      targetY: 54,
      hp: 1,
      maxHp: 1,
      ageMs: 1200,
      fallDurationMs: 900,
    },
  ]),
};
comboState = gameReducer(comboState, { type: "tick", deltaMs: 350 });
const comboSalvageAfterClear = comboState.salvage;
const comboCountAfterClear = comboState.comboCount;

const summary = {
  mode: state.mode,
  elapsedMs: state.elapsedMs,
  maxObjectives,
  pausedChecks,
  level: state.level,
  salvage: state.salvage,
  maxDebris,
  burstWavesTriggered,
  maxHeavyEarly,
  maxCorrosiveEarly,
  maxSplatterEarly,
  maxTankEarly,
  maxHeavySeen,
  maxCorrosiveSeen,
  maxSplatterSeen,
  maxTankSeen,
  maxHeavyPre5,
  maxHeavyPre10,
  maxCorrosivePre3,
  maxSplatterPre5,
  maxSplatterPre12,
  maxTankPre5,
  maxTankPre18,
  maxNormalSeen,
  maxBotsSeen,
  maxShieldPickupsSeen,
  maxHullPickupsSeen,
  maxMovingShieldPowerupsSeen,
  maxMovingHullPowerupsSeen,
  activeModifiers: state.modifiers.map((modifier) => ({
    level: modifier.level,
    key: modifier.key,
    label: MILESTONE_MODIFIER_LABELS[modifier.key],
  })),
  seenBehaviors: Array.from(seenBehaviors),
  earlyAverageDebris: Number(earlyAverageDebris.toFixed(2)),
  midLateAverageDebris: Number(midLateAverageDebris.toFixed(2)),
  early: Array.from(seen.early),
  mid: Array.from(seen.mid),
  later: Array.from(seen.later),
  advanced: Array.from(seen.advanced),
  stageKeys,
  baseStrength: Number(baseStrength.toFixed(2)),
  strongStrength: Number(strongStrength.toFixed(2)),
  capSamples,
  totalCapSamples,
  spawnIntervalBase: Number(spawnIntervalBase.toFixed(3)),
  spawnIntervalStrong: Number(spawnIntervalStrong.toFixed(3)),
  spawnCountBase,
  spawnCountStrong,
  targetDebrisBase,
  targetDebrisStrong,
  softCapStartCount,
  debrisAfterSoftCapTicks,
  regenThresholdBase: midDerived.baseRegenThreshold,
  regenThresholdShielded: shieldedMidDerived.finalRegenThreshold,
  milestoneLevels,
  milestoneSpawnInterval: Number((milestoneDerived.spawnIntervalMs / 1000).toFixed(3)),
  milestoneRange: Number(milestoneDerived.vacuumRange.toFixed(2)),
  milestoneShieldRegen: Number(milestoneDerived.shieldRegenPerSecond.toFixed(2)),
  milestoneSoftCap: milestoneDerived.totalActiveDebrisCap,
  milestonePickupMultiplier: Number(pickupModifierDerived.pickupChanceMultiplier.toFixed(2)),
  behaviorRates,
  rangeCap: Number(rangeCap.toFixed(2)),
  powerAtCap: Number(strongDerived.suctionPowerPerSecond.toFixed(2)),
  hullDamageOne: Number(getHullPressureDamagePerSecond(1, 120).toFixed(2)),
  hullDamageEight: Number(getHullPressureDamagePerSecond(8, 120).toFixed(2)),
  slowChecked,
  nukeChecked,
  pickupChances,
  movingPowerupChanceSamples,
  movingPowerupTiming,
  rogueTiming,
  postNukeFallSpeed,
  upgradeCosts: upgrades.map((upgrade) => ({
    upgrade,
    level0: getUpgradeCost(upgrade, 0),
    level4: getUpgradeCost(upgrade, 4),
  })),
};

console.log(JSON.stringify(summary, null, 2));

const regenSummary = {
  shieldBeforeNuke: regenShieldBeforeNuke,
  shieldRightAfterNuke: regenShieldRightAfterNuke,
  shieldAfterNukeTick: regenShieldAfterNukeTick,
  postNukeSlowMsInitial,
  postNukeSlowAgeAfterOneSecond,
  postNukeSlowRemainingAfterOneSecond,
  postNukeSlowAgeAfterRecovery,
  postNukeSlowRemainingAfterRecovery,
  shieldAfterRecoveryWindow,
  shieldAtDebrisReturn,
  shieldAfterDebrisReturned,
  restingBeforeFallingTick,
  burdenBeforeFallingTick,
  shieldWhileDebrisFalling,
  restingWhileDebrisFalling,
  burdenWhileDebrisFalling,
  shieldAfterDebrisLanded,
  restingAfterDebrisLanded,
  burdenAfterDebrisLanded,
};

console.log(JSON.stringify(regenSummary, null, 2));

const pickupSummary = {
  shieldAfterPickup,
  shieldPickupsRemaining,
  hullAfterPickup,
  hullPickupsRemaining,
  shieldAfterMovingPowerup,
  movingShieldPowerupsRemaining,
  hullAfterMovingPowerup,
  movingHullPowerupsRemaining,
  movingPowerupsAfterEscape,
  movingPowerupSides: Array.from(movingPowerupSides),
};

console.log(JSON.stringify(pickupSummary, null, 2));

const damageSummary = {
  hullAfterLightLoad,
  hullAfterHeavyLoad,
  corrosiveDamagePerSecond,
  hullAfterCorrosiveLoad,
  singleRestingPressureOnlyHull,
  heavyHpLevel35,
  tankHpLevel35,
  tankRestingBurden,
  splatterRestingBurden,
  hullAfterTankBurden,
  hullAfterSplatterBurden,
  expectedHullAfterSplatterBurden,
  hullAfterThreeNormalBurden,
  heavyCleanupStartStage,
  heavyCleanupProgress,
  heavyCleanupStage,
  heavyCleanupRenderSprite,
};

console.log(JSON.stringify(damageSummary, null, 2));

const splatterSummary = {
  splatterVariantCount: SPLATTER_DEBRIS_VARIANTS.length,
  splatterVariantProbe,
  splatterWhileFallingCount,
  corrosiveWhileFallingCount,
  splatterJustLandedCount,
  splatterRestingState,
  splatterExplodingState,
  splatterExplosionSprite,
  splatterAfterFuseCount,
  corrosiveAfterSplatterBurst,
  corrosiveStatesAfterSplatterBurst,
};

console.log(JSON.stringify(splatterSummary, null, 2));

const botSummary = {
  spawnedBotKind,
  incomingBotWarningVisible,
  warningBotStillPending,
  warningResolvedIntoBot,
  botDroppedMovingPowerup,
  shieldBeforeBotRegen,
  shieldAfterBotRegen,
  shieldAfterBotVacuumPenalty,
  directShieldAfterBotPenalty,
  lowShieldAfterBotVacuumPenalty,
  shieldBotRemovedByVacuum,
  scrapDistanceBefore: Number(scrapDistanceBefore.toFixed(2)),
  scrapDistanceAfter: Number(scrapDistanceAfter.toFixed(2)),
  scrapBotDamagedDebris,
  scrapBotClearedDebris,
  turretBotShotFired,
  turretBotDamagedDebris,
  rogueBotSpawnedDebris: rogueBotSpawnedDebris.length,
  rogueBotTargetedPriorityDebris,
  rogueBotDidNotRewardPlayer,
  rogueBotReplacementCount,
  rogueBotReplacementLockActive,
  rogueBotMovedDifferently,
  rogueBotCooldownReset,
  rogueBotDestroyedByNuke,
  rogueBotRemovedByVacuum,
  rogueVacuumLeftDebrisUntouched,
  rogueWarningCanOverlap,
  helpfulBotStillActiveDuringRogueOverlap,
  rogueOverlapActive,
  pullDistanceBefore: Number(pullDistanceBefore.toFixed(2)),
  pullDistanceAfter: Number(pullDistanceAfter.toFixed(2)),
  splitFragmentsSpawned,
  comboSalvageAfterClear,
  comboCountAfterClear,
};

console.log(JSON.stringify(botSummary, null, 2));

if (
  summary.mode !== "gameOver" &&
  !(summary.elapsedMs >= 750000 && summary.maxDebris >= 20 && summary.burstWavesTriggered >= 10)
) {
  throw new Error("Simulation did not show sustained late-game pressure or a natural end state.");
}

if (summary.elapsedMs < 90000) {
  throw new Error("The run collapsed too early instead of ramping into a survival game.");
}

if (
  summary.early.some((kind) => kind !== "normal")
) {
  throw new Error("Early game spawned debris beyond normal.");
}

if (
  !summary.mid.includes("corrosive") ||
  summary.mid.includes("heavy")
) {
  throw new Error("Levels 3-9 did not stay on the intended corrosive-first progression.");
}

if (summary.maxCorrosivePre3 > 0) {
  throw new Error("Corrosive debris appeared before level 3.");
}

if (summary.maxHeavyPre5 > 0) {
  throw new Error("Heavy debris appeared before level 5.");
}

if (summary.maxHeavyPre10 > 1) {
  throw new Error("Heavy debris exceeded the allowed single rare early-spawn slot before level 10.");
}

if (
  !summary.stageKeys.later.includes("heavy") ||
  !summary.stageKeys.later.includes("corrosive")
) {
  throw new Error("Levels 10-17 did not keep heavy behind corrosive in the intended progression.");
}

if (summary.maxSplatterPre5 > 0) {
  throw new Error("Splatter debris appeared before level 5.");
}

if (summary.maxSplatterPre12 > 1) {
  throw new Error("Splatter debris exceeded the allowed single rare early-spawn slot before level 12.");
}

if (summary.maxTankPre5 > 0) {
  throw new Error("Tank debris appeared before level 5.");
}

if (summary.maxTankPre18 > 1) {
  throw new Error("Tank debris exceeded the allowed single rare early-spawn slot before level 18.");
}

if (!summary.stageKeys.splatterTier.includes("splatter")) {
  throw new Error("Splatter debris never entered the structured spawn weights at its earlier unlock tier.");
}

if (!summary.stageKeys.tankTier.includes("tank")) {
  throw new Error("Tank debris never entered the structured spawn weights at its unlock tier.");
}

if (
  summary.activeModifiers.length !==
  summary.milestoneLevels.filter((level) => level <= summary.level).length
) {
  throw new Error("Milestone modifiers did not trigger once per reached milestone.");
}

if (
  new Set(summary.activeModifiers.map((modifier) => modifier.level)).size !==
  summary.activeModifiers.length
) {
  throw new Error("Milestone modifiers duplicated at the same milestone level.");
}

if (
  summary.behaviorRates.level1.drift !== 0 ||
  summary.behaviorRates.level1.sticky !== 0 ||
  summary.behaviorRates.level1.swift !== 0 ||
  summary.behaviorRates.level10.drift <= 0 ||
  summary.behaviorRates.level10.sticky !== 0 ||
  summary.behaviorRates.level20.sticky <= 0 ||
  summary.behaviorRates.level20.swift !== 0 ||
  summary.behaviorRates.level30.swift <= 0
) {
  throw new Error("Debris behavior variants did not unlock in the intended gradual tiers.");
}

if (summary.pausedChecks === 0) {
  throw new Error("No level-up pause was observed.");
}

if (!summary.slowChecked || !summary.nukeChecked) {
  throw new Error("Ability cooldown verification did not run.");
}

if (summary.earlyAverageDebris > 5.2) {
  throw new Error("Early game pressure became unreadably dense.");
}

if (summary.midLateAverageDebris < 0.85) {
  throw new Error("Mid-to-late game board pressure stayed too low.");
}

if (summary.maxDebris < summary.softCapStartCount) {
  throw new Error("Board pressure never rose beyond the soft total cap threshold.");
}

if (
  !(summary.totalCapSamples.level5 > summary.totalCapSamples.level1) ||
  !(summary.totalCapSamples.level10 > summary.totalCapSamples.level5) ||
  !(summary.totalCapSamples.level15 > summary.totalCapSamples.level10) ||
  !(summary.totalCapSamples.level25 > summary.totalCapSamples.level15)
) {
  throw new Error("Soft total debris cap did not keep scaling upward with level.");
}

if (summary.maxHeavyEarly > 2) {
  throw new Error("Early game exceeded the heavy debris cap.");
}

if (summary.maxCorrosiveEarly > 2) {
  throw new Error("Early game exceeded the corrosive debris cap.");
}

if (summary.maxSplatterEarly > 2) {
  throw new Error("Early splatter debris pressure became too dense.");
}

if (summary.maxTankEarly > 1) {
  throw new Error("Tank debris appeared too aggressively in the early unlock window.");
}

if (summary.burstWavesTriggered < 1) {
  throw new Error("Burst waves did not create any noticeable pressure spikes.");
}

if (!(summary.spawnIntervalStrong < summary.spawnIntervalBase)) {
  throw new Error("Higher levels did not face a faster spawn interval.");
}

if (!(summary.spawnCountStrong > summary.spawnCountBase)) {
  throw new Error("Stronger players did not face larger spawn events.");
}

if (!(summary.targetDebrisStrong > summary.targetDebrisBase)) {
  throw new Error("Target board pressure did not rise with strength.");
}

if (!(summary.debrisAfterSoftCapTicks > summary.softCapStartCount)) {
  throw new Error("Debris spawning stalled once the board reached the soft cap threshold.");
}

if (
  !(summary.hullDamageEight > summary.hullDamageOne) ||
  summary.hullDamageEight > 7.21
) {
  throw new Error("Hull pressure damage no longer follows the capped diminishing model.");
}

if (
  summary.capSamples.level1.corrosive !== 0 ||
  summary.capSamples.level12.splatter !== 1 ||
  summary.capSamples.level10.heavy !== 1 ||
  summary.capSamples.level18.tank !== 1 ||
  summary.capSamples.level56.splatter !== 4 ||
  summary.capSamples.level60.tank !== 4 ||
  summary.capSamples.level70.tank !== 4
) {
  throw new Error("Level-based debris caps do not match the scaling thresholds.");
}

if (
  !(summary.capSamples.level12.corrosive > summary.capSamples.level3.corrosive) ||
  !(summary.capSamples.level24.splatter >= summary.capSamples.level12.splatter) ||
  !(summary.capSamples.level20.heavy >= summary.capSamples.level10.heavy) ||
  !(summary.capSamples.level30.tank >= summary.capSamples.level18.tank) ||
  !(summary.capSamples.level38.splatter >= summary.capSamples.level24.splatter)
) {
  throw new Error("Debris caps did not scale upward gradually with player level.");
}

if (!(summary.maxHeavySeen >= 2)) {
  throw new Error("Heavy debris never scaled beyond the early-game limit.");
}

if (!(summary.maxCorrosiveSeen >= 2)) {
  throw new Error("Corrosive debris never became more common later in the run.");
}

if (!(summary.maxSplatterSeen >= 1)) {
  throw new Error("Splatter debris never entered the run after its unlock tier.");
}

if (summary.level >= 18 && !(summary.maxTankSeen >= 1)) {
  throw new Error("Tank debris never entered the run after its earlier unlock tier.");
}

if (!(summary.regenThresholdShielded >= summary.regenThresholdBase + 2.4)) {
  throw new Error("Shield Tolerance did not widen the regeneration threshold clearly enough.");
}

if (summary.regenThresholdShielded >= summary.regenThresholdBase + 2.5) {
  throw new Error("Shield Tolerance was not softened from its previous strength.");
}

if (
  !(summary.milestoneSpawnInterval < milestoneBaselineDerived.spawnIntervalMs / 1000) ||
  !(summary.milestoneRange > milestoneBaselineDerived.vacuumRange) ||
  !(summary.milestoneShieldRegen > milestoneBaselineDerived.shieldRegenPerSecond) ||
  !(summary.milestoneSoftCap > milestoneBaselineDerived.totalActiveDebrisCap) ||
  !(summary.milestonePickupMultiplier > 1)
) {
  throw new Error("Milestone modifiers did not meaningfully affect derived stats.");
}

if (summary.rangeCap > 18.001) {
  throw new Error("Vacuum range exceeded the intended cap.");
}

if (
  !(summary.movingPowerupTiming.minMs <= 16000) ||
  !(summary.movingPowerupTiming.maxMs <= 26000) ||
  !(summary.movingPowerupTiming.retryMinMs <= 8000) ||
  !(summary.movingPowerupTiming.botDropChance >= 0.48)
) {
  throw new Error("Moving powerup timing stayed too conservative.");
}

if (
  !(summary.movingPowerupChanceSamples.shieldCritical > 0.24) ||
  !(summary.movingPowerupChanceSamples.hullCritical > 0.14)
) {
  throw new Error("Moving shield and hull powerup spawn chances were not increased enough.");
}

if (
  !(summary.rogueTiming.startMs <= 11000) ||
  !(summary.rogueTiming.minMs <= 16000) ||
  !(summary.rogueTiming.maxMs <= 22000)
) {
  throw new Error("Rogue bot timing was not shortened enough.");
}

if (cappedState.upgrades.power !== UPGRADE_CAPS.power || cappedState.pendingLevelChoices !== 1) {
  throw new Error("Upgrade caps did not hold cleanly in the reducer.");
}

if (
  summary.maxShieldPickupsSeen > 1 ||
  summary.maxHullPickupsSeen > 1 ||
  summary.maxMovingShieldPowerupsSeen > 1 ||
  summary.maxMovingHullPowerupsSeen > 1
) {
  throw new Error("Recovery pickups exceeded their active cap.");
}

if (!(regenSummary.shieldRightAfterNuke <= regenSummary.shieldBeforeNuke + 0.001)) {
  throw new Error("Nuke should not restore shield directly before the next gameplay tick.");
}

if (!(regenSummary.shieldAfterNukeTick > regenSummary.shieldRightAfterNuke)) {
  throw new Error("Shield regeneration did not begin immediately after a nuke-cleared board.");
}

if (
  !(summary.postNukeFallSpeed.initial <= 0.55) ||
  Math.abs(summary.postNukeFallSpeed.hold - summary.postNukeFallSpeed.initial) > 0.02 ||
  !(summary.postNukeFallSpeed.midpoint > summary.postNukeFallSpeed.initial) ||
  summary.postNukeFallSpeed.expired !== 1
) {
  throw new Error("Post-nuke fall-speed recovery did not hold low briefly and then ease back to normal.");
}

if (
  regenSummary.postNukeSlowMsInitial <= 0 ||
  !(regenSummary.postNukeSlowAgeAfterOneSecond < 1000) ||
  !(regenSummary.postNukeSlowRemainingAfterOneSecond < regenSummary.postNukeSlowMsInitial) ||
  !(regenSummary.postNukeSlowAgeAfterRecovery > regenSummary.postNukeSlowAgeAfterOneSecond + 800) ||
  regenSummary.postNukeSlowRemainingAfterRecovery !== 0
) {
  throw new Error("Post-nuke slowdown did not slow falling debris briefly and then recover cleanly.");
}

if (!(regenSummary.shieldAfterRecoveryWindow > 60)) {
  throw new Error("Shield regeneration did not recover during a controlled board state.");
}

if (regenSummary.restingBeforeFallingTick !== 0 || regenSummary.restingWhileDebrisFalling !== 0) {
  throw new Error("Falling debris incorrectly counted as resting debris.");
}

if (regenSummary.burdenBeforeFallingTick !== 0 || regenSummary.burdenWhileDebrisFalling !== 0) {
  throw new Error("Falling debris incorrectly contributed to resting burden.");
}

if (!(regenSummary.shieldWhileDebrisFalling > 60)) {
  throw new Error("Shield regeneration did not continue while debris was still falling.");
}

if (regenSummary.restingAfterDebrisLanded < 3) {
  throw new Error("Debris did not transition into a resting state after landing.");
}

if (regenSummary.burdenAfterDebrisLanded < 3) {
  throw new Error("Resting burden did not rise once debris landed.");
}

if (regenSummary.shieldAfterDebrisLanded > regenSummary.shieldWhileDebrisFalling + 0.001) {
  throw new Error("Shield regeneration continued once too many debris had landed on the hull.");
}

if (regenSummary.shieldAfterDebrisReturned > regenSummary.shieldAtDebrisReturn + 0.001) {
  throw new Error("Shield regeneration continued after debris pressure returned.");
}

if (
  Math.abs(pickupSummary.shieldAfterPickup - 85) > 0.001 ||
  pickupSummary.shieldPickupsRemaining !== 0
) {
  throw new Error("Shield pickup did not restore 75% shield or was not collected cleanly.");
}

if (pickupSummary.hullAfterPickup < 101.9 || pickupSummary.hullPickupsRemaining !== 0) {
  throw new Error("Hull pickup did not restore 25% hull or was not collected cleanly.");
}

if (
  Math.abs(pickupSummary.shieldAfterMovingPowerup - 70) > 0.001 ||
  pickupSummary.movingShieldPowerupsRemaining !== 0
) {
  throw new Error("Moving shield powerup did not restore 50 shield or clear on collection.");
}

if (
  Math.abs(pickupSummary.hullAfterMovingPowerup - 95) > 0.001 ||
  pickupSummary.movingHullPowerupsRemaining !== 0
) {
  throw new Error("Moving hull powerup did not restore 25 hull or clear on collection.");
}

if (pickupSummary.movingPowerupsAfterEscape !== 0) {
  throw new Error("Moving powerups did not leave the board when missed.");
}

if (pickupSummary.movingPowerupSides.length < 3) {
  throw new Error("Moving powerups did not demonstrate multiple entry directions.");
}

if (!(damageSummary.hullAfterHeavyLoad > 112.7 && damageSummary.hullAfterHeavyLoad < 112.9)) {
  throw new Error("Heavy debris pressure still dropped the hull too sharply in one second.");
}

if (!(damageSummary.hullAfterLightLoad > damageSummary.hullAfterHeavyLoad)) {
  throw new Error("Lighter debris pressure was not safer than heavier pressure.");
}

if (!(damageSummary.corrosiveDamagePerSecond > 0)) {
  throw new Error("Resting corrosive debris did not report its separate damage-over-time.");
}

if (!(damageSummary.hullAfterCorrosiveLoad < damageSummary.singleRestingPressureOnlyHull)) {
  throw new Error("Resting corrosive debris did not deal extra hull damage beyond normal pressure.");
}

if (Math.abs(damageSummary.tankHpLevel35 - damageSummary.heavyHpLevel35 * 1.5) > 0.001) {
  throw new Error("Tank debris HP is not 50% above heavy debris.");
}

if (damageSummary.tankRestingBurden !== 3 || damageSummary.splatterRestingBurden !== 3) {
  throw new Error("Tank or splatter debris did not count as triple resting burden.");
}

if (Math.abs(damageSummary.hullAfterTankBurden - damageSummary.hullAfterThreeNormalBurden) > 0.001) {
  throw new Error("Tank debris did not apply the same hull burden as three normal debris.");
}

if (
  Math.abs(
    damageSummary.hullAfterSplatterBurden - damageSummary.expectedHullAfterSplatterBurden,
  ) > 0.001
) {
  throw new Error("Splatter debris did not apply the expected short resting burden before exploding.");
}

if (damageSummary.heavyCleanupStartStage !== 0 || !(damageSummary.heavyCleanupProgress > 0.01)) {
  throw new Error("Heavy debris did not begin tracking staged cleanup progress under vacuum.");
}

if (!(damageSummary.heavyCleanupStage >= 1) || !damageSummary.heavyCleanupRenderSprite) {
  throw new Error("Heavy debris did not swap into a cleanup-stage sprite while being vacuumed.");
}

if (splatterSummary.splatterWhileFallingCount !== 1 || splatterSummary.corrosiveWhileFallingCount !== 0) {
  throw new Error("Splatter debris burst before it had landed.");
}

if (splatterSummary.splatterJustLandedCount !== 1) {
  throw new Error("Splatter debris did not survive the landing transition before its fuse elapsed.");
}

if (
  splatterSummary.splatterVariantCount < 2 ||
  ![
    splatterDebrisFlyingSprite,
    splatterDebrisVariantTwoFlyingSprite,
  ].includes(splatterSummary.splatterVariantProbe.spriteFlying ?? "")
) {
  throw new Error("Splatter debris variants are not wired into the shared spawn selection helper.");
}

if (splatterSummary.splatterRestingState !== "resting") {
  throw new Error("Splatter debris did not switch into its resting state after landing.");
}

if (
  splatterSummary.splatterExplodingState !== "exploding" ||
  splatterSummary.splatterExplosionSprite !== splatterDebrisExplosionSprite
) {
  throw new Error("Splatter debris did not enter its exploding visual state.");
}

if (
  splatterSummary.splatterAfterFuseCount !== 0 ||
  splatterSummary.corrosiveAfterSplatterBurst !== 4
) {
  throw new Error("Splatter debris did not burst into four corrosive debris.");
}

if (!splatterSummary.corrosiveStatesAfterSplatterBurst.every((state) => state === "flying")) {
  throw new Error("Splatter burst fragments did not reuse the corrosive flying debris behavior.");
}

if (!botSummary.spawnedBotKind) {
  throw new Error("Bot system did not spawn a bot when its cooldown elapsed.");
}

if (!botSummary.incomingBotWarningVisible || !botSummary.warningBotStillPending || !botSummary.warningResolvedIntoBot) {
  throw new Error("Incoming bot warning did not appear before the bot spawned.");
}

if (!botSummary.botDroppedMovingPowerup) {
  throw new Error("Bots did not occasionally spit out moving recovery powerups.");
}

if (!(botSummary.shieldAfterBotRegen > botSummary.shieldBeforeBotRegen)) {
  throw new Error("Shield bot did not regenerate shield while active.");
}

if (botSummary.directShieldAfterBotPenalty !== 15) {
  throw new Error("Vacuuming a helpful bot did not immediately apply the 15-point shield penalty.");
}

if (botSummary.lowShieldAfterBotVacuumPenalty !== 0) {
  throw new Error("Helpful bot vacuum penalty did not clamp shield at zero.");
}

if (!botSummary.shieldBotRemovedByVacuum) {
  throw new Error("Bot was not removed when the vacuum touched it.");
}

if (!(botSummary.scrapDistanceAfter < botSummary.scrapDistanceBefore - 8)) {
  throw new Error("Scrap bot did not aggressively chase debris.");
}

if (!botSummary.scrapBotDamagedDebris) {
  throw new Error("Scrap bot did not meaningfully assist with debris cleanup.");
}

if (!botSummary.turretBotShotFired || !botSummary.turretBotDamagedDebris) {
  throw new Error("Turret bot did not fire and damage nearby debris.");
}

if (
  botSummary.rogueBotSpawnedDebris !== 2 ||
  !botSummary.rogueBotTargetedPriorityDebris ||
  !botSummary.rogueBotDidNotRewardPlayer ||
  !botSummary.rogueBotReplacementCount ||
  !botSummary.rogueBotReplacementLockActive ||
  !botSummary.rogueBotMovedDifferently ||
  !botSummary.rogueBotCooldownReset ||
  !botSummary.rogueBotDestroyedByNuke
) {
  throw new Error("Rogue bot did not salvage high-priority debris into locked replacement debris.");
}

if (!botSummary.rogueBotRemovedByVacuum || !botSummary.rogueVacuumLeftDebrisUntouched) {
  throw new Error("Vacuuming the rogue bot did not remove it cleanly without affecting nearby debris.");
}

if (
  !botSummary.rogueWarningCanOverlap ||
  !botSummary.helpfulBotStillActiveDuringRogueOverlap ||
  !botSummary.rogueOverlapActive
) {
  throw new Error("Rogue bot did not overlap correctly with an existing helpful bot.");
}

if (!(botSummary.pullDistanceAfter < botSummary.pullDistanceBefore)) {
  throw new Error("Vacuum pull did not draw debris closer.");
}

if (!(botSummary.pullDistanceBefore - botSummary.pullDistanceAfter > 0.2)) {
  throw new Error("Vacuum pull remained too subtle to notice clearly.");
}

if (botSummary.pullDistanceBefore - botSummary.pullDistanceAfter > 7) {
  throw new Error("Vacuum pull was too strong and risked snapping debris unnaturally.");
}

if (botSummary.splitFragmentsSpawned < 1) {
  throw new Error("Harder debris did not split into controlled fragment debris.");
}

if (!(botSummary.comboCountAfterClear >= 2 && botSummary.comboSalvageAfterClear > 6)) {
  throw new Error("Combo clears did not boost salvage rewards noticeably.");
}

if (
  summary.pickupChances.shieldSafe !== 0 ||
  !(summary.pickupChances.shieldLow > 0) ||
  !(summary.pickupChances.shieldMid > summary.pickupChances.shieldLow) ||
  !(summary.pickupChances.shieldCritical > summary.pickupChances.shieldMid)
) {
  throw new Error("Shield pickup chance scaling did not follow shield danger levels.");
}

if (
  summary.pickupChances.hullHealthy !== 0 ||
  !(summary.pickupChances.hullCaution > 0) ||
  !(summary.pickupChances.hullLow > 0) ||
  !(summary.pickupChances.hullLow > summary.pickupChances.hullCaution) ||
  !(summary.pickupChances.hullCritical > summary.pickupChances.hullLow) ||
  !(summary.pickupChances.hullCritical < summary.pickupChances.shieldCritical)
) {
  throw new Error("Hull pickup chance scaling was not rarer and condition-based.");
}
