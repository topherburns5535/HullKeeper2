export type DebrisKind = "normal" | "heavy" | "corrosive" | "unstable" | "tank" | "splatter";
export type DebrisVisualState = "flying" | "resting" | "exploding";
export type DebrisCleanupStage = 0 | 1 | 2 | 3;
export type PickupKind = "shield" | "hull";
export type AbilityKey = "slowTime" | "nuke";
export type UpgradeKey = "power" | "range" | "tempo" | "ability" | "shield";
export type DifficultyMode = "Easy" | "Normal" | "Hard";
export type ToastTone = "info" | "reward" | "danger";
export type DebrisBehavior = "drift" | "sticky" | "swift";
export type BotKind = "shield" | "scrap" | "stabilizer" | "turret" | "rogue";
export type EntrySide = "top" | "bottom" | "left" | "right";
export type MilestoneModifierKey =
  | "shieldRegenBoost"
  | "rangeBoost"
  | "pickupBoost"
  | "spawnRateBoost"
  | "softCapBoost";

export interface Debris {
  id: number;
  type: DebrisKind;
  kind: DebrisKind;
  isFragment?: boolean;
  isCorrosive: boolean;
  spriteFlying: string | null;
  spriteResting: string | null;
  spriteExploding: string | null;
  cleanupSprites: string[];
  cleanupProgress: number;
  cleanupStage: DebrisCleanupStage;
  state: DebrisVisualState;
  stateTimerMs: number;
  x: number;
  targetY: number;
  hp: number;
  maxHp: number;
  ageMs: number;
  fallDurationMs: number;
  behavior?: DebrisBehavior;
  driftVelocityX?: number;
}

export interface Pickup {
  id: number;
  kind: PickupKind;
  x: number;
  targetY: number;
  ageMs: number;
  fallDurationMs: number;
}

export interface RecoveryPowerup {
  id: number;
  kind: PickupKind;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  value: number;
  ageMs: number;
  lifeMs: number;
  entrySide: EntrySide | "bot";
}

export interface SupportBot {
  kind: BotKind;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  baseY: number;
  entrySide: "left" | "right";
  ageMs: number;
  lifeMs: number;
  fireCooldownMs: number;
  payloadCooldownMs: number;
  wobblePhase: number;
}

export interface IncomingBotWarning {
  kind: BotKind;
  y: number;
  side: "left" | "right";
  ttlMs: number;
}

export interface BotShot {
  id: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  ageMs: number;
  lifeMs: number;
}

export interface EffectBurst {
  id: number;
  x: number;
  y: number;
  label: string;
  tone: string;
  kind: "tap" | "reward" | "danger";
  ageMs: number;
  lifeMs: number;
}

export interface ToastState {
  label: string;
  tone: ToastTone;
  ttlMs: number;
}

export type ObjectiveKind =
  | "clearTotal"
  | "clearHeavy"
  | "survive"
  | "earnSalvage"
  | "avoidHullDamage";

export interface Objective {
  id: number;
  kind: ObjectiveKind;
  label: string;
  target: number;
  progress: number;
  baseline: number;
  rewardSalvage: number;
  rewardXp: number;
  completedAt?: number;
}

export interface AbilityState {
  cooldownMs: number;
}

export interface MilestoneModifier {
  level: number;
  key: MilestoneModifierKey;
}

export interface GameState {
  mode: "ready" | "running" | "gameOver";
  difficulty: DifficultyMode;
  rngSeed: number;
  elapsedMs: number;
  shield: number;
  hull: number;
  maxShield: number;
  maxHull: number;
  salvage: number;
  bestSalvage: number;
  xp: number;
  xpToNext: number;
  level: number;
  pendingLevelChoices: number;
  upgradeChoices: UpgradeKey[];
  modifiers: MilestoneModifier[];
  debris: Debris[];
  pickups: Pickup[];
  powerups: RecoveryPowerup[];
  activeBot?: SupportBot;
  incomingBotWarning?: IncomingBotWarning;
  botShots: BotShot[];
  objectives: Objective[];
  effects: EffectBurst[];
  abilities: Record<AbilityKey, AbilityState>;
  upgrades: Record<UpgradeKey, number>;
  slowTimeMs: number;
  nukeFlashMs: number;
  postNukeSlowMs: number;
  clearRecoveryMs: number;
  comboCount: number;
  comboTimerMs: number;
  vacuumX: number;
  vacuumY: number;
  vacuumTargetX: number;
  vacuumTargetY: number;
  isVacuumActive: boolean;
  suctioningDebrisIds: number[];
  spawnCooldownMs: number;
  nextBurstAtMs: number;
  burstWavesTriggered: number;
  incomeCooldownMs: number;
  pickupCooldownMs: number;
  movingPowerupCooldownMs: number;
  botCooldownMs: number;
  rogueBotCooldownMs: number;
  nextDebrisId: number;
  nextPickupId: number;
  nextPowerupId: number;
  nextBotShotId: number;
  nextEffectId: number;
  nextObjectiveId: number;
  toast?: ToastState;
  totalClears: number;
  heavyClears: number;
  dangerousClears: number;
  lastHullDamageAt: number;
}

export type GameAction =
  | { type: "startRun"; seed?: number; difficulty?: DifficultyMode }
  | { type: "restartRun"; seed?: number; difficulty?: DifficultyMode }
  | { type: "returnToMenu"; seed?: number; difficulty?: DifficultyMode }
  | { type: "setDifficulty"; difficulty: DifficultyMode }
  | { type: "tick"; deltaMs: number }
  | { type: "pointerDown"; x: number; y: number }
  | { type: "pointerMove"; x: number; y: number }
  | { type: "pointerUp" }
  | { type: "useAbility"; ability: AbilityKey }
  | { type: "selectUpgrade"; upgrade: UpgradeKey };
