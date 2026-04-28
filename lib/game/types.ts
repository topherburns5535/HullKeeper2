export type DebrisKind = "normal" | "heavy" | "corrosive" | "tank" | "splatter";
export type DebrisVisualState =
  | "flying"
  | "resting"
  | "exploding"
  | "rest_1"
  | "rest_2"
  | "rest_3"
  | "rest_4";
export type DebrisCleanupStage = 0 | 1 | 2 | 3;
export type DebrisLandingVariant = "left" | "right" | "center";
export type ShieldPoolVariant = "pool1" | "pool2";
export type PickupKind = "shield" | "hull";
export type PowerupKind = PickupKind | "nuke_reset" | "slow_reset";
export type VacuumTransportDebrisSpriteKey = "tubeDebris1" | "tubeDebris2" | "tubeDebris3";
export type AbilityKey = "slowTime" | "nuke";
export type UpgradeKey = "power" | "range" | "tempo" | "ability" | "shield";
export type DifficultyMode = "Easy" | "Normal" | "Hard";
export type ToastTone = "info" | "reward" | "danger";
export type DebrisBehavior = "drift" | "sticky" | "swift";
export type BotKind = "shield" | "scrap" | "turret" | "rogue";
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
  scale: number;
  visualFlipX: boolean;
  visualRotation: number;
  visualOffsetX: number;
  visualOffsetY: number;
  rogueTargetLockUntilMs?: number;
  speedModifier: number;
  spriteFlying: string | null;
  spriteResting: string | null;
  shieldRestingSprite: string | null;
  shieldRestingSprites?: readonly string[];
  shieldRestingAnimationSprites?: readonly string[];
  shieldCleanupAnimationSprites?: readonly string[];
  shieldStageAnimationSprites?: Partial<Record<DebrisVisualState, readonly string[]>>;
  spriteExploding: string | null;
  cleanupSprites: string[];
  cleanupProgress: number;
  cleanupStage: DebrisCleanupStage;
  landingVariant: DebrisLandingVariant;
  landingUsesShieldSettle: boolean;
  shieldPoolTimerMs: number;
  shieldPoolVariant: ShieldPoolVariant;
  shieldPoolScaleJitter: number;
  shieldPoolRotationDeg: number;
  shieldPoolOpacityJitter: number;
  shieldPoolPulseJitter: number;
  state: DebrisVisualState;
  stateTimerMs: number;
  landingTimerMs: number;
  landingDurationMs: number;
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
  kind: PowerupKind;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  value: number;
  ageMs: number;
  lifeMs: number;
  entrySide: EntrySide | "bot" | "debris";
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
  animationFrameIndex: number;
  animationTimer: number;
  targetDebrisId?: number;
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

export interface VacuumTransportDebris {
  id: number;
  spriteKey: VacuumTransportDebrisSpriteKey;
  progress: number;
  speed: number;
  rotation: number;
  scale: number;
}

export interface VacuumCaptureDebris {
  id: number;
  kind: DebrisKind;
  spriteSrc: string | null;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  ageMs: number;
  durationMs: number;
  rotation: number;
  scale: number;
  size: number;
  flipX: boolean;
}

export interface FlybyDebris {
  id: number;
  kind: DebrisKind;
  spriteSrc: string | null;
  scale: number;
  isFragment?: boolean;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  rotationSpeed: number;
  flipX: boolean;
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
  capturedDebris: VacuumCaptureDebris[];
  transportDebris: VacuumTransportDebris[];
  flybyDebris: FlybyDebris[];
  activeBot?: SupportBot;
  incomingBotWarning?: IncomingBotWarning;
  activeRogueBot?: SupportBot;
  incomingRogueBotWarning?: IncomingBotWarning;
  botShots: BotShot[];
  objectives: Objective[];
  effects: EffectBurst[];
  abilities: Record<AbilityKey, AbilityState>;
  upgrades: Record<UpgradeKey, number>;
  slowTimeMs: number;
  postSlowRecoveryMs: number;
  nukeFlashMs: number;
  postNukeSlowMs: number;
  debrisSpeedMultiplier: number;
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
  nextCapturedDebrisId: number;
  nextTransportDebrisId: number;
  nextFlybyDebrisId: number;
  nextBotShotId: number;
  nextEffectId: number;
  nextObjectiveId: number;
  toast?: ToastState;
  totalClears: number;
  heavyClears: number;
  dangerousClears: number;
  lastHullDamageAt: number;
  lastResetPowerupSpawnAt: number;
  flybySpawnCooldownMs: number;
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
