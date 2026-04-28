"use client";

import Image from "next/image";
import { useEffect, useEffectEvent, useReducer, useRef, useState } from "react";
import type { ReactNode } from "react";

import {
  ABILITY_DESCRIPTIONS,
  BOT_APPEARANCE,
  DEBRIS_APPEARANCE,
  MILESTONE_MODIFIER_LABELS,
  MAX_OBJECTIVES,
  PICKUP_APPEARANCE,
  POWERUP_APPEARANCE,
  UPGRADE_CAPS,
  UPGRADE_DESCRIPTIONS,
  createInitialState,
  formatTime,
  gameReducer,
  getBotSprites,
  getDebrisGuideSprites,
  getDebrisLandingProgress,
  getComboMultiplier,
  getBotSpriteName,
  getDebrisMotionState,
  getDebrisProgress,
  getDebrisRenderSize,
  getDebrisRenderSprite,
  getDebrisFuseProgress,
  getDerivedStats,
  getFallingY,
  getObjectiveProgressText,
  getPickupProgress,
  getStageConfig,
} from "@/lib/game/engine";
import {
  getVacuumHeadSocket,
  getVacuumSuctionPoint,
  VACUUM_HEAD_SCALE,
} from "@/lib/game/vacuum";
import type {
  AbilityKey,
  BotKind,
  BotShot,
  Debris,
  DebrisKind,
  DifficultyMode,
  EffectBurst,
  FlybyDebris,
  IncomingBotWarning,
  Objective,
  Pickup,
  PowerupKind,
  RecoveryPowerup,
  SupportBot,
  UpgradeKey,
  VacuumCaptureDebris,
  VacuumTransportDebris,
} from "@/lib/game/types";

const upgradeOrder: UpgradeKey[] = ["power", "range", "tempo", "ability", "shield"];
const abilityOrder: AbilityKey[] = ["slowTime", "nuke"];
type MenuScreen = "startMenu" | "instructions" | "difficulty" | "gameplay";
type ReadyScreen = Exclude<MenuScreen, "gameplay">;
const difficultyStorageKey = "hull-keeper:difficulty";
const boardImageUnshielded = "/assets/board/ShipHull.png";
const boardImageShielded = "/assets/board/ShipHull_Shielded.png";
const menuBackgroundImage = "/assets/ui/BackgroundHullKeeper.png";
const startButtonImage = "/assets/ui/StartButton.png";
const instructionsButtonImage = "/assets/ui/InstructionsButton.png";
const difficultyButtonImage = "/assets/ui/DifficultyButton.png";
const quitButtonImage = "/assets/ui/QuitButton.png";
const mainMenuButtonImage = "/assets/ui/MainMenuButton.png";
const playAgainButtonImage = "/assets/ui/PlayAgainButton.png";
const vacuumHeadSprite = "/assets/vacuum/MechanicalVacuum.png";
const vacuumRingSprite = "/assets/vacuum/DebrisRing.png";
const shieldNewPoolSprites = {
  pool1: "/assets/vacuum/ShieldNewPool.png",
  pool2: "/assets/vacuum/ShieldNewPool2.png",
} as const;
const SHIELD_NEW_POOL_ALPHA = 0.48;
const SHIELD_NEW_POOL_REST_ALPHA = 0.26;
const SHIELD_NEW_POOL_FADE_IN_MS = 120;
const SHIELD_NEW_POOL_PULSE_DECAY_MS = 760;
const SHIELD_NEW_POOL_BASE_SCALE = 0.9;
const SHIELD_NEW_POOL_PULSE_SCALE = 0.025;
const CORROSIVE_SHIELD_RESTING_FRAME_DURATION_MS = 120;
const NORMAL_DEBRIS_SHIELD_RESTING_FRAME_DURATION_MS = 120;
const HEAVY_DEBRIS_SHIELD_RESTING_FRAME_DURATION_MS = 120;
const TANK_DEBRIS_SHIELD_RESTING_FRAME_DURATION_MS = 120;
const SPLATTER_DEBRIS_SHIELD_RESTING_FRAME_DURATION_MS = 120;
const vacuumTransportDebrisSprites = {
  tubeDebris1: "/assets/vacuum/TubeDebris1.png",
  tubeDebris2: "/assets/vacuum/TubeDebris2.png",
  tubeDebris3: "/assets/vacuum/TubeDebris3.png",
} as const;
const TRANSPORT_DEBRIS_SCALE = 1.85;
const VACUUM_FIRST_RING_DISTANCE_RATIO = 0.05;
const VACUUM_RING_SPACING_RATIO = 0.36;
const VACUUM_TRANSPORT_CURVE_RIGHT_OFFSET = 16.2;
const RING_REACTION_RANGE_MULTIPLIER = 1.65;
const RING_REACTION_MAX_OFFSET_PX = 3.2;
const RING_REACTION_MAX_ROTATION_DEG = 1.8;
const RING_REACTION_FALLOFF_EXPONENT = 2.2;

const upgradeMeta: Record<UpgradeKey, { label: string; short: string }> = {
  power: { label: "Power", short: "POW" },
  range: { label: "Range", short: "RNG" },
  tempo: { label: "Tempo", short: "TMP" },
  ability: { label: "Ability", short: "ABL" },
  shield: { label: "Shield Tol", short: "SHD" },
};

const abilityMeta: Record<
  AbilityKey,
  { label: string; icon: string; tint: string; glow: string }
> = {
  slowTime: {
    label: "Slow",
    icon: "S",
    tint: "border-cyan-300/70 bg-cyan-300/12 text-cyan-50",
    glow: "bg-cyan-300/16",
  },
  nuke: {
    label: "Nuke",
    icon: "N",
    tint: "border-amber-300/70 bg-amber-300/12 text-amber-50",
    glow: "bg-amber-300/18",
  },
};

const difficultyDescriptions: Record<DifficultyMode, string> = {
  Easy: "About 25% more forgiving with slower pressure and stronger recovery.",
  Normal: "The current baseline balance for Hull Keeper.",
  Hard: "About 25% harsher with faster pressure and fewer recovery windows.",
};

const difficultyHighlights: Record<DifficultyMode, string> = {
  Easy: "Slower spawns, lower debris pressure, better regen, and more recovery opportunities.",
  Normal: "Exactly the current live tuning.",
  Hard: "Faster spawns, tougher debris, heavier damage pressure, and less forgiveness.",
};

const frontScreenDescription =
  "Protect the ship's hull by sweeping up falling debris, using abilities wisely, and surviving as long as you can.";

const howToPlaySections = [
  "Control the vacuum by dragging your finger across the screen to collect debris before it settles on the hull.",
  "Debris that lands on the hull will damage your ship over time. Keep the hull clear to allow your shield to regenerate.",
  "Use abilities like Nuke and Slow to manage overwhelming situations.",
  "Watch for special debris and bots\u2014some help you, while others create new threats.",
  "Collect powerups and build combos to increase your score and survive as long as possible.",
];

const debrisGuide: Array<{ kind: DebrisKind; name: string; description: string }> = [
  { kind: "normal", name: "Normal Debris", description: "Basic debris that builds up on the hull." },
  { kind: "corrosive", name: "Corrosive Debris", description: "Damages the ship faster while it sits." },
  { kind: "heavy", name: "Heavy Debris", description: "Takes more suction power to break down." },
  { kind: "tank", name: "Tank Debris", description: "Extra tough debris with much higher durability." },
  {
    kind: "splatter",
    name: "Splatter Debris",
    description: "Bursts into corrosive debris if left on the hull too long.",
  },
];

const botGuide: Array<{ kind: BotKind; name: string; description: string }> = [
  { kind: "shield", name: "Shield Bot", description: "Restores shield while active. Avoid vacuuming it." },
  { kind: "scrap", name: "Scrap Bot", description: "Hunts nearby debris and helps clear pressure." },
  { kind: "turret", name: "Turret Bot", description: "Fires at debris to help reduce pressure." },
  {
    kind: "rogue",
    name: "Rogue Bot",
    description: "Targets landed debris, scraps it, and replaces it with a fresh wave of trouble.",
  },
];

const powerupGuide: Array<{ kind: PowerupKind; title: string; description: string }> = [
  {
    kind: "shield",
    title: "Shield Restore",
    description: "Restores a portion of your shield.",
  },
  {
    kind: "hull",
    title: "Hull Restore",
    description: "Repairs a portion of your hull.",
  },
  {
    kind: "nuke_reset",
    title: "Nuke Reset",
    description: "Instantly refreshes the Nuke ability cooldown.",
  },
  {
    kind: "slow_reset",
    title: "Slow Reset",
    description: "Instantly refreshes the Slow ability cooldown.",
  },
];

const milestoneMeta: Record<
  keyof typeof MILESTONE_MODIFIER_LABELS,
  { short: string; tone: string }
> = {
  shieldRegenBoost: {
    short: "RGN",
    tone: "border-emerald-300/35 bg-emerald-300/10 text-emerald-50",
  },
  rangeBoost: {
    short: "RNG",
    tone: "border-cyan-300/35 bg-cyan-300/10 text-cyan-50",
  },
  pickupBoost: {
    short: "SUP",
    tone: "border-sky-300/35 bg-sky-300/10 text-sky-50",
  },
  spawnRateBoost: {
    short: "SPD",
    tone: "border-amber-300/35 bg-amber-300/10 text-amber-50",
  },
  softCapBoost: {
    short: "CAP",
    tone: "border-rose-300/35 bg-rose-300/10 text-rose-50",
  },
};

function Shell({
  children,
  menuBackground = false,
}: {
  children: ReactNode;
  menuBackground?: boolean;
}) {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_32%),linear-gradient(180deg,_#020617_0%,_#06111f_45%,_#0f172a_100%)] text-slate-50">
      {menuBackground ? (
        <div className="pointer-events-none absolute inset-0 z-0">
          <Image
            src={menuBackgroundImage}
            alt=""
            fill
            priority
            unoptimized
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-slate-950/45" />
        </div>
      ) : null}
      <div className="relative z-[1]">{children}</div>
    </main>
  );
}

function isShieldBoardActive(shield: number) {
  return shield > 0;
}

function BoardArtworkLayer({ shield }: { shield: number }) {
  const shieldActive = isShieldBoardActive(shield);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <Image
        src={boardImageUnshielded}
        alt=""
        fill
        priority
        unoptimized
        sizes="100vw"
        className={`object-fill transition-opacity duration-200 ${shieldActive ? "opacity-0" : "opacity-100"}`}
      />
      <Image
        src={boardImageShielded}
        alt=""
        fill
        priority
        unoptimized
        sizes="100vw"
        className={`object-fill transition-opacity duration-200 ${shieldActive ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}

function MenuButton({
  imageSrc,
  label,
  onClick,
  className = "",
  size = "menu",
}: {
  imageSrc: string;
  label: string;
  onClick: () => void;
  className?: string;
  size?: "menu" | "gameOver";
}) {
  const [isPressed, setIsPressed] = useState(false);
  const heightClassName = size === "gameOver" ? "h-28 sm:h-32" : "h-32 sm:h-36";

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    setIsPressed(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsPressed(false);
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsPressed(false);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={() => setIsPressed(false)}
      onBlur={() => setIsPressed(false)}
      className={`group relative flex w-full items-center justify-center transition active:scale-[0.99] ${className}`}
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
      <div
        className={`relative w-full transition duration-100 ease-out ${heightClassName}`}
        style={{
          opacity: isPressed ? 0.8 : 1,
          transform: isPressed ? "translateY(3px) scale(0.98)" : "translateY(0) scale(1)",
        }}
      >
        <Image
          src={imageSrc}
          alt=""
          fill
          unoptimized
          sizes="(max-width: 640px) 100vw, 24rem"
          className="pointer-events-none object-contain drop-shadow-[0_14px_30px_rgba(2,6,23,0.32)] transition group-hover:brightness-105"
        />
      </div>
    </button>
  );
}

function StartMenuScreen({
  onStart,
  onInstructions,
  onDifficulty,
  onQuit,
}: {
  onStart: () => void;
  onInstructions: () => void;
  onDifficulty: () => void;
  onQuit: () => void;
}) {
  return (
    <Shell menuBackground>
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col justify-center px-4 py-5 text-center sm:max-w-md">
        <div className="px-1 py-3 sm:px-3 sm:py-5">
          <h1 className="text-4xl font-semibold tracking-[0.04em] text-slate-50 [text-shadow:0_10px_28px_rgba(2,6,23,0.78)] sm:text-5xl">
            Hull Keeper
          </h1>

          <p className="mx-auto mt-4 max-w-[24rem] text-sm leading-7 text-slate-200 [text-shadow:0_6px_18px_rgba(2,6,23,0.82)] sm:text-base">
            {frontScreenDescription}
          </p>

          <div className="mx-auto mt-5 flex w-full max-w-[28rem] flex-col">
            <div className="relative h-24 overflow-visible sm:h-28">
              <MenuButton
                imageSrc={startButtonImage}
                label="Start"
                onClick={onStart}
                size="menu"
                className="absolute inset-x-0 top-0"
              />
            </div>
            <div className="-mt-6 relative h-24 overflow-visible sm:-mt-8 sm:h-28">
              <MenuButton
                imageSrc={instructionsButtonImage}
                label="Instructions"
                onClick={onInstructions}
                size="menu"
                className="absolute inset-x-0 top-0"
              />
            </div>
            <div className="-mt-6 relative h-24 overflow-visible sm:-mt-8 sm:h-28">
              <MenuButton
                imageSrc={difficultyButtonImage}
                label="Difficulty"
                onClick={onDifficulty}
                size="menu"
                className="absolute inset-x-0 top-0"
              />
            </div>
            <div className="-mt-6 relative h-24 overflow-visible sm:-mt-8 sm:h-28">
              <MenuButton
                imageSrc={quitButtonImage}
                label="Quit"
                onClick={onQuit}
                size="menu"
                className="absolute inset-x-0 top-0"
              />
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function MenuScreenHeader({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[28px] border border-cyan-300/20 bg-slate-950/60 px-4 py-3 shadow-[0_20px_48px_rgba(2,6,23,0.44)] backdrop-blur">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/75">Hull Keeper</p>
        <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
      </div>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-cyan-300/22 bg-slate-900/80 px-4 text-sm font-medium text-slate-100 transition hover:border-cyan-300/40 hover:bg-slate-900"
      >
        Back
      </button>
    </div>
  );
}

function GuideSectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-50">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function DebrisReferenceFallbackIcon({ kind }: { kind: DebrisKind }) {
  const visual = DEBRIS_APPEARANCE[kind];

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-slate-800 bg-slate-950/80">
      <div
        className={`flex h-8 w-8 items-center justify-center border text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-[0_0_18px_rgba(15,23,42,0.3)] ${visual.shape} ${visual.fill}`}
      >
        <span className={kind === "corrosive" ? "-rotate-45" : ""}>{visual.short}</span>
      </div>
    </div>
  );
}

function DebrisReferenceVisual({ kind }: { kind: DebrisKind }) {
  const sprites = getDebrisGuideSprites(kind).filter((entry) => entry.src);

  if (sprites.length === 0) {
    return <DebrisReferenceFallbackIcon kind={kind} />;
  }

  const columns =
    sprites.length >= 5 ? "grid-cols-2" : sprites.length >= 3 ? "grid-cols-3" : "grid-cols-2";

  return (
    <div className={`grid w-[9rem] shrink-0 ${columns} gap-2 sm:w-[10rem]`}>
      {sprites.map((entry) => (
        <div
          key={entry.key}
          className="flex aspect-square items-center justify-center rounded-[16px] border border-cyan-300/12 bg-slate-950/78 p-1.5"
          title={entry.label}
        >
          <Image
            src={entry.src ?? ""}
            alt=""
            width={80}
            height={80}
            unoptimized
            className="block h-full w-full object-contain"
          />
        </div>
      ))}
    </div>
  );
}

function BotSpriteArt({
  kind,
  frameIndex,
  sizeClassName,
}: {
  kind: BotKind;
  frameIndex: number;
  sizeClassName: string;
}) {
  const visual = BOT_APPEARANCE[kind];
  const sprites = getBotSprites(kind);
  const safeIndex = Math.max(0, Math.min(frameIndex, sprites.length - 1));
  const primarySprite = sprites[safeIndex] ?? sprites[0];
  const fallbackSprite = sprites[0];
  const [failedSprites, setFailedSprites] = useState<Record<string, true>>({});
  const warnedRef = useRef<Record<string, true>>({});
  const resolvedSprite =
    primarySprite && !failedSprites[primarySprite]
      ? primarySprite
      : fallbackSprite && !failedSprites[fallbackSprite]
        ? fallbackSprite
        : null;

  const handleError = (spritePath: string | undefined) => {
    if (!spritePath) {
      return;
    }

    if (!warnedRef.current[spritePath]) {
      warnedRef.current[spritePath] = true;
      console.warn(`Missing bot sprite for ${getBotSpriteName(kind)}: ${spritePath}`);
    }

    setFailedSprites((current) => (current[spritePath] ? current : { ...current, [spritePath]: true }));
  };

  if (!resolvedSprite) {
    return (
      <div
        className={`flex items-center justify-center rounded-full border text-[10px] font-bold shadow-[0_0_18px_rgba(15,23,42,0.3)] ${sizeClassName} ${visual.tone} ${visual.ring}`}
      >
        <span>{visual.short}</span>
      </div>
    );
  }

  return (
    <Image
      src={resolvedSprite}
      alt=""
      width={256}
      height={256}
      unoptimized
      className={`pointer-events-none block select-none object-contain ${sizeClassName}`}
      onError={() => handleError(resolvedSprite)}
    />
  );
}

function BotReferenceIcon({ kind }: { kind: BotKind }) {
  const visual = BOT_APPEARANCE[kind];
  const isRogue = kind === "rogue";

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-slate-800 bg-slate-950/80">
      <div
        className={`relative flex h-9 w-9 items-center justify-center overflow-hidden ${isRogue ? "rotate-[8deg] rounded-[34%]" : "rounded-full"}`}
      >
        <div className={`absolute inset-0 ${isRogue ? "rounded-[34%]" : "rounded-full"} ${visual.ring} opacity-55`} />
        <BotSpriteArt kind={kind} frameIndex={0} sizeClassName="relative z-[1] h-full w-full" />
      </div>
    </div>
  );
}

function PowerupSpriteArt({
  kind,
  sizeClassName,
}: {
  kind: PowerupKind;
  sizeClassName: string;
}) {
  const visual = POWERUP_APPEARANCE[kind];
  const [failedSprite, setFailedSprite] = useState(false);
  const warnedRef = useRef(false);

  const handleError = () => {
    if (!warnedRef.current) {
      warnedRef.current = true;
      console.warn(`Missing powerup sprite for ${kind}: ${visual.spriteSrc}`);
    }
    setFailedSprite(true);
  };

  if (failedSprite) {
    return (
      <div
        className={`relative flex items-center justify-center rounded-full border text-[9px] font-bold uppercase tracking-[0.16em] ${visual.tone} ${visual.ring} ${sizeClassName}`}
      >
        <span>{visual.short}</span>
      </div>
    );
  }

  return (
    <Image
      src={visual.spriteSrc}
      alt=""
      width={256}
      height={256}
      unoptimized
      className={`pointer-events-none block select-none object-contain ${sizeClassName}`}
      onError={handleError}
    />
  );
}

function PowerupReferenceIcon({ kind }: { kind: PowerupKind }) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-slate-800 bg-slate-950/80">
      <div className="relative flex h-9 w-9 items-center justify-center">
        <PowerupSpriteArt kind={kind} sizeClassName="h-full w-full" />
      </div>
    </div>
  );
}

function AbilityPreviewButton({ ability }: { ability: AbilityKey }) {
  const meta = abilityMeta[ability];

  return (
    <div
      className={`flex min-h-12 items-center justify-between gap-2 rounded-[16px] border px-2.5 py-1.5 ${meta.tint} shadow-[0_10px_24px_rgba(15,23,42,0.22)]`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold uppercase tracking-[0.18em] ${meta.glow}`}
        >
          {meta.icon}
        </span>
        <span className="text-[11px] font-semibold">{meta.label}</span>
      </div>
      <span className="shrink-0 rounded-full bg-slate-950/45 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.16em]">
        Ready
      </span>
    </div>
  );
}

function ReferenceRow({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[22px] border border-cyan-300/12 bg-slate-950/72 px-4 py-3">
      {icon}
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-slate-50">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-300">{description}</p>
      </div>
    </div>
  );
}

function InstructionsScreen({ onBack }: { onBack: () => void }) {
  return (
    <Shell menuBackground>
      <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col gap-4 px-4 py-4">
        <div className="shrink-0">
          <MenuScreenHeader title="Instructions" onBack={onBack} />
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-[28px] border border-cyan-300/20 bg-slate-950/60 shadow-[0_22px_60px_rgba(2,6,23,0.45)] backdrop-blur">
          <div className="h-full min-h-0 overflow-y-auto overscroll-contain px-5 py-5 pr-3 text-sm leading-7 text-slate-200">
            <div className="space-y-8">
              <section>
                <GuideSectionTitle
                  title="How to Play"
                  description="A quick overview of how to survive your next run."
                />
                <div className="mt-4 space-y-4">
                  {howToPlaySections.map((section) => (
                    <p key={section}>{section}</p>
                  ))}
                </div>
              </section>

              <section>
                <GuideSectionTitle
                  title="Learn the Debris Types"
                  description="These examples use the same live art references as gameplay so what you study here matches the run."
                />
                <div className="mt-4 space-y-3">
                  {debrisGuide.map((entry) => (
                    <ReferenceRow
                      key={entry.kind}
                      icon={<DebrisReferenceVisual kind={entry.kind} />}
                      title={entry.name}
                      description={entry.description}
                    />
                  ))}
                </div>
              </section>

              <section>
                <GuideSectionTitle
                  title="Abilities"
                  description="These are the same control buttons you use during a run."
                />
                <div className="mt-4 space-y-3">
                  {abilityOrder.map((ability) => (
                    <ReferenceRow
                      key={ability}
                      icon={<div className="w-[9rem] shrink-0"><AbilityPreviewButton ability={ability} /></div>}
                      title={abilityMeta[ability].label}
                      description={ABILITY_DESCRIPTIONS[ability]}
                    />
                  ))}
                </div>
              </section>

              <section>
                <GuideSectionTitle
                  title="Powerups"
                  description="These drifting pickups restore defenses or instantly refresh key abilities."
                />
                <div className="mt-4 space-y-3">
                  {powerupGuide.map((entry) => (
                    <ReferenceRow
                      key={entry.kind}
                      icon={<PowerupReferenceIcon kind={entry.kind} />}
                      title={entry.title}
                      description={entry.description}
                    />
                  ))}
                </div>
              </section>

              <section>
                <GuideSectionTitle
                  title="Bot Types"
                  description="Some bots help you, while one of them definitely does not."
                />
                <div className="mt-4 space-y-3">
                  {botGuide.map((entry) => (
                    <ReferenceRow
                      key={entry.kind}
                      icon={<BotReferenceIcon kind={entry.kind} />}
                      title={entry.name}
                      description={entry.description}
                    />
                  ))}
                </div>
              </section>

              <button
                type="button"
                onClick={onBack}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-[20px] border border-cyan-300/22 bg-slate-900/80 px-4 text-sm font-medium text-slate-100 transition hover:border-cyan-300/40 hover:bg-slate-900"
              >
                Back to Main Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function DifficultyScreen({
  difficulty,
  onSelect,
  onBack,
}: {
  difficulty: DifficultyMode;
  onSelect: (difficulty: DifficultyMode) => void;
  onBack: () => void;
}) {
  return (
    <Shell menuBackground>
      <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col gap-4 px-4 py-4">
        <div className="shrink-0">
          <MenuScreenHeader title="Difficulty" onBack={onBack} />
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-[28px] border border-cyan-300/20 bg-slate-950/60 shadow-[0_22px_60px_rgba(2,6,23,0.45)] backdrop-blur">
          <div className="h-full overflow-y-auto overscroll-contain p-5 pr-3">
          <p className="text-sm leading-6 text-slate-300">
            Pick the pressure level for the next run. Normal keeps the current game exactly as tuned.
          </p>

          <div className="mt-4 space-y-3">
            {(["Easy", "Normal", "Hard"] as DifficultyMode[]).map((option) => {
              const selected = option === difficulty;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onSelect(option)}
                  className={`flex min-h-15 w-full items-start justify-between gap-3 rounded-[22px] border px-4 py-3 text-left transition ${
                    selected
                      ? "border-cyan-300/45 bg-cyan-300/12 text-slate-50"
                      : "border-cyan-300/16 bg-slate-950/72 text-slate-200 hover:border-cyan-300/35 hover:bg-slate-900/90"
                  }`}
                >
                  <span>
                    <span className="block text-base font-semibold">{option}</span>
                    <span className="mt-1 block text-sm leading-5 text-slate-300">
                      {difficultyDescriptions[option]}
                    </span>
                    <span className="mt-2 block text-xs leading-5 text-slate-400">
                      {difficultyHighlights[option]}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs uppercase tracking-[0.18em] text-cyan-200/75">
                    {selected ? "Selected" : "Tap"}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-400">
            Your selection is kept for the next run and preserved when you return to the main menu.
          </p>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function GameOverScreen({
  elapsedMs,
  salvage,
  bestSalvage,
  onRestart,
  onMenu,
}: {
  elapsedMs: number;
  salvage: number;
  bestSalvage: number;
  onRestart: () => void;
  onMenu: () => void;
}) {
  return (
    <Shell menuBackground>
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center gap-3 px-4 py-4">
        <div className="rounded-[32px] border border-rose-300/20 bg-slate-950/72 p-5 text-center shadow-[0_30px_70px_rgba(2,6,23,0.58)] backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.3em] text-rose-200/75">Game Over</p>
          <h1 className="mt-2 text-3xl font-semibold">The hull gave out.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            One more sweep can go farther. Jump back in with a clean restart.
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-2xl bg-slate-900/80 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Time</p>
              <p className="mt-1 font-semibold">{formatTime(elapsedMs)}</p>
            </div>
            <div className="rounded-2xl bg-slate-900/80 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Salvage</p>
              <p className="mt-1 font-semibold">{salvage}</p>
            </div>
            <div className="rounded-2xl bg-slate-900/80 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Best</p>
              <p className="mt-1 font-semibold">{bestSalvage}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-[28px] border border-rose-300/20 bg-slate-950/60 p-3 shadow-[0_22px_60px_rgba(2,6,23,0.45)] backdrop-blur">
          <MenuButton
            imageSrc={playAgainButtonImage}
            label="Play Again"
            onClick={onRestart}
            className="z-10"
            size="gameOver"
          />
          <MenuButton
            imageSrc={mainMenuButtonImage}
            label="Main Menu"
            onClick={onMenu}
            size="gameOver"
          />
        </div>
      </div>
    </Shell>
  );
}

function TopStatBar({
  label,
  value,
  maxValue,
  tone,
}: {
  label: string;
  value: number;
  maxValue: number;
  tone: string;
}) {
  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between text-[8px] uppercase tracking-[0.16em] text-slate-100 [text-shadow:0_1px_6px_rgba(2,6,23,0.75)]">
        <span>{label}</span>
        <span>{Math.ceil(value)}/{maxValue}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-950/65">
        <div
          className={`h-full rounded-full transition-all ${tone}`}
          style={{ width: `${(value / maxValue) * 100}%` }}
        />
      </div>
    </div>
  );
}

function AbilityButton({
  ability,
  cooldownMs,
  disabled,
  onPress,
}: {
  ability: AbilityKey;
  cooldownMs: number;
  disabled: boolean;
  onPress: (event: React.PointerEvent<HTMLButtonElement>, ability: AbilityKey) => void;
}) {
  const ready = cooldownMs <= 0;
  const meta = abilityMeta[ability];

  return (
    <button
      type="button"
      onPointerDown={(event) => onPress(event, ability)}
      onPointerUp={(event) => event.stopPropagation()}
      onPointerCancel={(event) => event.stopPropagation()}
      disabled={disabled || !ready}
      className={`pointer-events-auto flex h-12 items-center justify-between gap-2 rounded-[16px] border px-2.5 py-1.5 text-left transition touch-manipulation ${
        ready
          ? `${meta.tint} shadow-[0_10px_24px_rgba(15,23,42,0.22)]`
          : "border-slate-700 bg-slate-900/75 text-slate-400"
      } disabled:cursor-not-allowed disabled:opacity-70`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold uppercase tracking-[0.18em] ${
            ready ? meta.glow : "border-slate-700 bg-slate-950/60"
          }`}
        >
          {meta.icon}
        </span>
        <span className="text-[11px] font-semibold">{meta.label}</span>
      </div>
      <span className="shrink-0 rounded-full bg-slate-950/45 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.16em]">
        {ready ? "Ready" : `${Math.ceil(cooldownMs / 1000)}s`}
      </span>
    </button>
  );
}

function ObjectiveRow({ objective }: { objective: Objective }) {
  const progressRatio = Math.max(0, Math.min(1, objective.target > 0 ? objective.progress / objective.target : 0));

  return (
    <div className="space-y-1 px-0.5 py-[2px]">
      <div className="flex items-center justify-between gap-1.5 text-[9px] leading-none [text-shadow:0_1px_6px_rgba(2,6,23,0.78)]">
        <p
          className={`min-w-0 truncate font-extrabold ${
            objective.completedAt ? "text-emerald-50" : "text-slate-50"
          }`}
        >
          {objective.label}
        </p>
        <span
          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.14em] ${
            objective.completedAt
              ? "bg-emerald-300/14 text-emerald-50"
              : "bg-white/8 text-slate-100"
          }`}
        >
          {getObjectiveProgressText(objective)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-950/40">
        <div
          className={`h-full rounded-full transition-[width] duration-150 ${
            objective.completedAt
              ? "bg-[linear-gradient(90deg,_rgba(110,231,183,0.95),_rgba(52,211,153,0.88))]"
              : "bg-[linear-gradient(90deg,_rgba(125,211,252,0.92),_rgba(45,212,191,0.86))]"
          }`}
          style={{ width: `${progressRatio * 100}%` }}
        />
      </div>
    </div>
  );
}

function UpgradeChip({
  upgrade,
  level,
}: {
  upgrade: UpgradeKey;
  level: number;
}) {
  const maxed = level >= UPGRADE_CAPS[upgrade];

  return (
    <div
      className={`w-[3.25rem] rounded-[14px] px-1 py-1 text-center [text-shadow:0_1px_6px_rgba(2,6,23,0.78)] ${
        maxed ? "bg-amber-300/10" : "bg-white/6"
      }`}
    >
      <p className={`text-[7px] font-extrabold uppercase tracking-[0.16em] ${maxed ? "text-amber-100/95" : "text-slate-100/92"}`}>
        {upgradeMeta[upgrade].short}
      </p>
      <p className={`mt-0.5 text-[9px] font-semibold ${maxed ? "text-amber-50" : "text-slate-50"}`}>
        {maxed ? "MAX" : `${level}/${UPGRADE_CAPS[upgrade]}`}
      </p>
    </div>
  );
}

function DebrisChip({
  debris,
  isSuctioned,
  shieldActive,
}: {
  debris: Debris;
  isSuctioned: boolean;
  shieldActive: boolean;
}) {
  const visual = DEBRIS_APPEARANCE[debris.kind];
  const progress = getDebrisProgress(debris);
  const size = getDebrisRenderSize(debris);
  const hpRatio = Math.max(0, debris.hp / debris.maxHp);
  const landed = getDebrisMotionState(debris) === "resting";
  const exploding = debris.state === "exploding";
  const shieldLandingActive = landed && debris.landingUsesShieldSettle;
  const fuseProgress = getDebrisFuseProgress(debris);
  const isDrift = debris.behavior === "drift";
  const isSticky = debris.behavior === "sticky";
  const isSwift = debris.behavior === "swift";
  const corrosiveShieldRestingFrames =
    debris.kind === "corrosive" &&
    landed &&
    shieldActive &&
    debris.landingUsesShieldSettle &&
    debris.shieldRestingSprites &&
    debris.shieldRestingSprites.length > 0
      ? debris.shieldRestingSprites
      : undefined;
  const corrosiveShieldRestingFrameIndex = corrosiveShieldRestingFrames
    ? Math.floor(debris.stateTimerMs / CORROSIVE_SHIELD_RESTING_FRAME_DURATION_MS) %
      corrosiveShieldRestingFrames.length
    : 0;
  const corrosiveShieldRestingSprite = corrosiveShieldRestingFrames?.[corrosiveShieldRestingFrameIndex] ?? null;
  const normalDebrisShieldRestingFrames =
    debris.kind === "normal" &&
    landed &&
    shieldActive &&
    debris.landingUsesShieldSettle &&
    debris.shieldRestingAnimationSprites &&
    debris.shieldRestingAnimationSprites.length > 0
      ? debris.shieldRestingAnimationSprites
      : undefined;
  const normalDebrisShieldRestingFrameIndex = normalDebrisShieldRestingFrames
    ? Math.floor(debris.stateTimerMs / NORMAL_DEBRIS_SHIELD_RESTING_FRAME_DURATION_MS) %
      normalDebrisShieldRestingFrames.length
    : 0;
  const normalDebrisShieldRestingSprite =
    normalDebrisShieldRestingFrames?.[normalDebrisShieldRestingFrameIndex] ?? null;
  const heavyShieldRestingFrames =
    debris.kind === "heavy" &&
    landed &&
    shieldActive &&
    debris.landingUsesShieldSettle
      ? debris.cleanupStage > 0
        ? debris.shieldCleanupAnimationSprites
        : debris.shieldRestingAnimationSprites
      : undefined;
  const heavyShieldRestingFrameIndex = heavyShieldRestingFrames
    ? Math.floor(debris.stateTimerMs / HEAVY_DEBRIS_SHIELD_RESTING_FRAME_DURATION_MS) %
      heavyShieldRestingFrames.length
    : 0;
  const heavyShieldRestingSprite =
    heavyShieldRestingFrames?.[heavyShieldRestingFrameIndex] ?? null;
  const tankShieldRestingFrames =
    debris.kind === "tank" &&
    landed &&
    shieldActive &&
    debris.landingUsesShieldSettle &&
    debris.shieldStageAnimationSprites
      ? debris.shieldStageAnimationSprites[debris.state]
      : undefined;
  const tankShieldRestingFrameIndex = tankShieldRestingFrames
    ? Math.floor(debris.stateTimerMs / TANK_DEBRIS_SHIELD_RESTING_FRAME_DURATION_MS) %
      tankShieldRestingFrames.length
    : 0;
  const tankShieldRestingSprite =
    tankShieldRestingFrames?.[tankShieldRestingFrameIndex] ?? null;
  const splatterShieldRestingFrames =
    debris.kind === "splatter" &&
    landed &&
    shieldActive &&
    debris.landingUsesShieldSettle &&
    debris.shieldRestingAnimationSprites &&
    debris.shieldRestingAnimationSprites.length > 0
      ? debris.shieldRestingAnimationSprites
      : undefined;
  const splatterShieldRestingFrameIndex = splatterShieldRestingFrames
    ? Math.floor(debris.stateTimerMs / SPLATTER_DEBRIS_SHIELD_RESTING_FRAME_DURATION_MS) %
      splatterShieldRestingFrames.length
    : 0;
  const splatterShieldRestingSprite =
    splatterShieldRestingFrames?.[splatterShieldRestingFrameIndex] ?? null;
  const usesPrecomposedShieldRestingSprite =
    landed &&
    shieldActive &&
    debris.landingUsesShieldSettle &&
    (Boolean(debris.shieldRestingSprite) ||
      Boolean(heavyShieldRestingSprite) ||
      Boolean(tankShieldRestingSprite) ||
      Boolean(splatterShieldRestingSprite) ||
      Boolean(corrosiveShieldRestingSprite) ||
      Boolean(normalDebrisShieldRestingSprite));
  const shieldPoolVisible =
    landed &&
    shieldActive &&
    debris.landingUsesShieldSettle &&
    !usesPrecomposedShieldRestingSprite;
  const spriteSrc = usesPrecomposedShieldRestingSprite
    ? heavyShieldRestingSprite ??
      tankShieldRestingSprite ??
      splatterShieldRestingSprite ??
      normalDebrisShieldRestingSprite ??
      corrosiveShieldRestingSprite ??
      debris.shieldRestingSprite
    : getDebrisRenderSprite(debris);
  const usesSprite = Boolean(spriteSrc);
  const groundedRotationFactor =
    debris.kind === "heavy" ? 4 / 7 : debris.kind === "tank" ? 3 / 5 : 0.6;
  const landingProgress = landed ? getDebrisLandingProgress(debris) : 1;
  const settleEase = landingProgress * landingProgress * (3 - 2 * landingProgress);
  const restingRotation = debris.visualRotation * groundedRotationFactor;
  const visualRotation =
    landed
      ? debris.visualRotation + (restingRotation - debris.visualRotation) * settleEase
      : exploding
        ? restingRotation
        : debris.visualRotation;
  const restingOffsetYBase = debris.visualOffsetY * 0.85;
  const visualOffsetX =
    landed
      ? debris.visualOffsetX + (debris.visualOffsetX * 0.22 - debris.visualOffsetX) * settleEase
      : debris.visualOffsetX;
  const visualOffsetY =
    landed
      ? debris.visualOffsetY + (restingOffsetYBase - debris.visualOffsetY) * settleEase
      : exploding
        ? restingOffsetYBase
        : debris.visualOffsetY;
  const flipScaleX = usesSprite && debris.visualFlipX ? -1 : 1;
  const cleanupScale =
    debris.kind === "heavy" && landed ? Math.max(0.7, 1 - debris.cleanupProgress * 0.26) : 1;
  const explosionScale = exploding ? 1.08 : 1;
  const landingMassFactor =
    debris.kind === "tank" ? 0.56 : debris.kind === "heavy" ? 0.72 : 1;
  const settleProfile = shieldLandingActive
    ? {
        groundedOffsetPx: -2.4,
        entryLiftPx: 5.2,
        impactDropPx: 2.5,
        reboundLiftPx: 1.45,
        sideImpactPx: 1.65,
        sideReboundPx: 0.72,
        squashAmount: 0.068,
        impactRotationDeg: 3.2,
      }
    : {
        groundedOffsetPx: 2.2,
        entryLiftPx: 3.8,
        impactDropPx: 1.45,
        reboundLiftPx: 0.7,
        sideImpactPx: 1.05,
        sideReboundPx: 0.42,
        squashAmount: 0.046,
        impactRotationDeg: 1.7,
      };
  const shieldRestingCenterOffsetPx =
    shieldActive
      ? 1.9 + ((debris.scale ?? 1) - 1) * 2.6 + (debris.kind === "heavy" || debris.kind === "tank" ? 0.7 : 0)
      : 0;
  const groundedOffsetPx = landed ? (shieldActive ? -2.4 + shieldRestingCenterOffsetPx : 2.2) : 0;
  const landingVariantDirection =
    shieldLandingActive
      ? debris.landingVariant === "left"
        ? -1
        : debris.landingVariant === "right"
          ? 1
          : 0
      : 0;
  const settleYOffsetPx = (() => {
    if (!landed || landingProgress >= 1) {
      return 0;
    }

    const entryLiftPx = settleProfile.entryLiftPx * landingMassFactor;
    const impactDropPx = settleProfile.impactDropPx * landingMassFactor;
    const reboundLiftPx = settleProfile.reboundLiftPx * landingMassFactor;

    if (landingProgress < 0.52) {
      const impactT = landingProgress / 0.52;
      const easedImpactT = 1 - Math.pow(1 - impactT, 3);
      return -entryLiftPx + (entryLiftPx + impactDropPx) * easedImpactT;
    }

    if (landingProgress < 0.8) {
      const reboundT = (landingProgress - 0.52) / 0.28;
      const easedReboundT = 1 - Math.pow(1 - reboundT, 2.4);
      return impactDropPx + (-reboundLiftPx - impactDropPx) * easedReboundT;
    }

    const settleT = (landingProgress - 0.8) / 0.2;
    const easedSettleT = settleT * settleT * (3 - 2 * settleT);
    return -reboundLiftPx * (1 - easedSettleT);
  })();
  const settleXOffsetPx = (() => {
    if (!landed || landingProgress >= 1 || landingVariantDirection === 0) {
      return 0;
    }

    const sideImpactPx = settleProfile.sideImpactPx * landingMassFactor * landingVariantDirection;
    const sideReboundPx = settleProfile.sideReboundPx * landingMassFactor * landingVariantDirection;

    if (landingProgress < 0.52) {
      const impactT = landingProgress / 0.52;
      const easedImpactT = 1 - Math.pow(1 - impactT, 2.2);
      return sideImpactPx * easedImpactT;
    }

    if (landingProgress < 0.8) {
      const reboundT = (landingProgress - 0.52) / 0.28;
      const easedReboundT = reboundT * reboundT * (3 - 2 * reboundT);
      return sideImpactPx + (-sideReboundPx - sideImpactPx) * easedReboundT;
    }

    const settleT = (landingProgress - 0.8) / 0.2;
    const easedSettleT = settleT * settleT * (3 - 2 * settleT);
    return -sideReboundPx * (1 - easedSettleT);
  })();
  const settleImpact = landed && landingProgress < 1 ? Math.sin(landingProgress * Math.PI) : 0;
  const settleRotationDirection =
    landingVariantDirection !== 0
      ? landingVariantDirection
      : debris.visualRotation !== 0
        ? Math.sign(debris.visualRotation)
        : debris.visualFlipX
          ? -1
          : 1;
  const settleRotationOffset = (() => {
    if (!landed || landingProgress >= 1) {
      return 0;
    }

    const impactRotationDeg = settleProfile.impactRotationDeg * landingMassFactor * settleRotationDirection;
    if (landingProgress < 0.52) {
      const impactT = landingProgress / 0.52;
      const easedImpactT = 1 - Math.pow(1 - impactT, 2.2);
      return impactRotationDeg * easedImpactT;
    }

    if (landingProgress < 0.8) {
      const reboundT = (landingProgress - 0.52) / 0.28;
      const easedReboundT = reboundT * reboundT * (3 - 2 * reboundT);
      return impactRotationDeg + (-impactRotationDeg * 0.46 - impactRotationDeg) * easedReboundT;
    }

    const settleT = (landingProgress - 0.8) / 0.2;
    const easedSettleT = settleT * settleT * (3 - 2 * settleT);
    return -impactRotationDeg * 0.46 * (1 - easedSettleT);
  })();
  const squashAmount = settleProfile.squashAmount * landingMassFactor;
  const squashScaleX = 1 + squashAmount * settleImpact;
  const squashScaleY = 1 - squashAmount * 0.9 * settleImpact;
  const shieldPoolLifeMs = Math.max(0, debris.shieldPoolTimerMs);
  const shieldPoolFadeIn = Math.min(1, shieldPoolLifeMs / SHIELD_NEW_POOL_FADE_IN_MS);
  const shieldPoolPulseDecay = Math.min(1, shieldPoolLifeMs / SHIELD_NEW_POOL_PULSE_DECAY_MS);
  const shieldPoolPulse = 1 - shieldPoolPulseDecay;
  const shieldPoolSprite = shieldNewPoolSprites[debris.shieldPoolVariant] ?? shieldNewPoolSprites.pool1;
  const shieldPoolOpacity = Math.max(
    0.2,
    Math.min(
      0.54,
      (SHIELD_NEW_POOL_REST_ALPHA + (SHIELD_NEW_POOL_ALPHA - SHIELD_NEW_POOL_REST_ALPHA) * shieldPoolFadeIn) *
        (1 - shieldPoolPulse * 0.12) +
        debris.shieldPoolOpacityJitter,
    ),
  );
  const debrisScaleInfluence = 1 + ((debris.scale ?? 1) - 1) * 0.22;
  const shieldPoolScale =
    (debris.kind === "tank" ? 1.1 : debris.kind === "heavy" ? 1.06 : 1) *
    debrisScaleInfluence *
    (SHIELD_NEW_POOL_BASE_SCALE +
      shieldPoolPulse * Math.max(0.02, SHIELD_NEW_POOL_PULSE_SCALE + debris.shieldPoolPulseJitter) +
      debris.shieldPoolScaleJitter);
  const corrosiveGlow = debris.isCorrosive
    ? landed
      ? "drop-shadow-[0_0_18px_rgba(163,230,53,0.34)]"
      : "drop-shadow-[0_0_14px_rgba(163,230,53,0.24)]"
    : "";
  const splatterExplosionGlow =
    debris.kind === "splatter" && exploding
      ? "drop-shadow-[0_0_22px_rgba(244,114,182,0.3)]"
      : "";
  const landedShell =
    debris.kind === "heavy"
      ? "h-[82%] rounded-[24%] rotate-[4deg]"
      : debris.kind === "tank"
      ? "h-[76%] rounded-[30%] rotate-[6deg]"
      : debris.kind === "splatter"
        ? "h-[62%] rounded-[44%_32%_48%_30%] rotate-[10deg]"
      : debris.kind === "corrosive"
        ? "h-[58%] rounded-[42%] rotate-[24deg]"
        : "h-[56%] rounded-[42%] rotate-[12deg]";
  const landedFragments =
    debris.kind === "heavy"
      ? [
          "left-[10%] top-[60%] h-[18%] w-[30%] rotate-[10deg] rounded-[28%]",
          "left-[48%] top-[20%] h-[28%] w-[28%] -rotate-[8deg] rounded-[24%]",
          "left-[70%] top-[56%] h-[16%] w-[16%] rotate-[20deg] rounded-[26%]",
        ]
      : debris.kind === "tank"
      ? [
          "left-[12%] top-[62%] h-[18%] w-[28%] rotate-[12deg] rounded-[32%]",
          "left-[54%] top-[18%] h-[26%] w-[22%] -rotate-[8deg] rounded-[28%]",
          "left-[68%] top-[56%] h-[18%] w-[18%] rotate-[22deg] rounded-[26%]",
        ]
      : debris.kind === "splatter"
        ? [
            "left-[14%] top-[68%] h-[14%] w-[18%] rotate-[24deg] rounded-full",
            "left-[54%] top-[20%] h-[12%] w-[12%] -rotate-[18deg] rounded-full",
            "left-[72%] top-[54%] h-[16%] w-[14%] rotate-[30deg] rounded-full",
          ]
      : debris.kind === "corrosive"
        ? [
            "left-[18%] top-[66%] h-[14%] w-[18%] rotate-[32deg] rounded-full",
            "left-[62%] top-[18%] h-[16%] w-[14%] -rotate-[22deg] rounded-full",
            "left-[72%] top-[54%] h-[12%] w-[12%] rotate-[18deg] rounded-full",
          ]
        : [
            "left-[16%] top-[66%] h-[14%] w-[18%] rotate-[20deg] rounded-[40%]",
            "left-[60%] top-[22%] h-[18%] w-[14%] -rotate-[14deg] rounded-[38%]",
            "left-[72%] top-[58%] h-[12%] w-[12%] rotate-[24deg] rounded-[36%]",
          ];

  return (
    <div
      data-testid="debris"
      className="pointer-events-none absolute transition-transform duration-150 ease-out"
      style={{
        left: `${debris.x}%`,
        top: `${-12 + (debris.targetY + 12) * progress}%`,
        transform: `translate(-50%, -50%) translate(${visualOffsetX + settleXOffsetPx}px, ${groundedOffsetPx + visualOffsetY + settleYOffsetPx}px) rotate(${visualRotation + settleRotationOffset}deg) scaleX(${(0.92 + hpRatio * 0.08) * cleanupScale * explosionScale * squashScaleX * flipScaleX}) scaleY(${(0.92 + hpRatio * 0.08) * cleanupScale * explosionScale * squashScaleY})`,
        width: `${size}%`,
      }}
    >
      <div
        className={
          usesSprite
            ? `relative aspect-square w-full ${
                isSuctioned ? "scale-[0.88] drop-shadow-[0_0_18px_rgba(34,211,238,0.42)]" : ""
              }`
            : `relative flex items-center justify-center border text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-[0_0_24px_rgba(15,23,42,0.32)] ${
                landed ? landedShell : `aspect-square ${visual.shape}`
              } ${visual.fill} ${
                landed
                  ? `w-[112%] opacity-95 ${shieldActive ? "shadow-[0_8px_16px_rgba(2,6,23,0.16)]" : ""}`
                  : "aspect-square"
              } ${
                isSuctioned ? "scale-[0.88] ring-2 ring-cyan-200/70 shadow-[0_0_28px_rgba(34,211,238,0.42)]" : ""
              }`
        }
      >
        {shieldPoolVisible ? (
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 aspect-square"
            style={{
              width: `${shieldPoolScale * 118}%`,
              transform: `translate(-50%, -50%) translateY(18%) rotate(${debris.shieldPoolRotationDeg}deg)`,
              opacity: shieldPoolOpacity,
            }}
          >
            <Image
              src={shieldPoolSprite}
              alt=""
              width={256}
              height={256}
              unoptimized
              className="pointer-events-none block h-full w-full select-none object-contain mix-blend-screen"
            />
          </div>
        ) : null}
        {usesSprite ? (
          <>
            <Image
              src={spriteSrc ?? debris.spriteFlying ?? ""}
              alt=""
              width={256}
              height={256}
              unoptimized
              className={`pointer-events-none block aspect-square w-full select-none object-contain ${corrosiveGlow} ${splatterExplosionGlow} ${
                landed || exploding ? "opacity-95" : ""
              }`}
            />
            {landed && shieldActive ? (
              <div className="absolute inset-x-[10%] bottom-[-7%] h-[14%] rounded-full bg-slate-950/26 blur-[2px]" />
            ) : null}
            {debris.kind === "heavy" && landed && shieldActive && debris.cleanupStage > 0 ? (
              <div className="absolute inset-x-[18%] bottom-[10%] h-[9%] rounded-full bg-slate-950/12 blur-[1px]" />
            ) : null}
            {debris.isCorrosive ? (
              <div
                className="absolute inset-[12%] rounded-full border border-lime-300/40"
                style={{ opacity: landed ? 0.4 : 0.24 }}
              />
            ) : null}
          </>
        ) : (
          <>
            {landed ? (
              <>
                <span className="translate-y-[1px] text-[9px] tracking-[0.12em] opacity-90">{visual.short}</span>
                {landedFragments.map((fragment, index) => (
                  <div
                    key={`${debris.id}-fragment-${index}`}
                    className={`absolute border border-white/18 bg-white/12 ${fragment}`}
                  />
                ))}
                {shieldActive ? (
                  <div className="absolute inset-x-[9%] bottom-[-8%] h-[15%] rounded-full bg-slate-950/28 blur-[2px]" />
                ) : null}
              </>
            ) : (
              <span>{visual.short}</span>
            )}
          </>
        )}
        {isSuctioned ? (
          <>
            <div className="absolute inset-[-18%] rounded-full border border-cyan-200/90 opacity-85" />
            <div className="absolute inset-[-32%] rounded-full border border-cyan-300/45 opacity-60" />
          </>
        ) : null}
        {isDrift && !landed ? (
          <>
            <div className="absolute left-[-18%] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-sky-200/85" />
            <div className="absolute right-[-18%] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-sky-200/85" />
          </>
        ) : null}
        {isSticky ? (
          <div className="absolute bottom-[-8%] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-amber-100/40 bg-amber-200/70" />
        ) : null}
        {isSwift && !landed ? (
          <>
            <div className="absolute right-[-16%] top-[36%] h-0.5 w-3 rounded-full bg-rose-100/85" />
            <div className="absolute right-[-20%] top-[54%] h-0.5 w-4 rounded-full bg-rose-100/60" />
          </>
        ) : null}
        {debris.kind === "tank" && !usesSprite ? (
          <>
            <div className="absolute inset-[18%] rounded-[24%] border border-orange-50/18" />
            {shieldActive ? (
              <div className="absolute inset-x-[24%] bottom-[18%] h-[9%] rounded-full bg-slate-950/18" />
            ) : null}
          </>
        ) : null}
        {debris.kind === "splatter" && debris.state === "resting" && fuseProgress !== undefined ? (
          <>
            <div
              className="absolute inset-[-10%] rounded-[42%] border border-violet-200/70"
              style={{
                opacity: 0.35 + fuseProgress * 0.45,
                transform: `scale(${1 + fuseProgress * 0.08})`,
              }}
            />
            <div
              className="absolute bottom-[-14%] left-1/2 h-1 w-[52%] -translate-x-1/2 overflow-hidden rounded-full bg-slate-950/75"
            >
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,_#c084fc,_#ef4444)]"
                style={{ width: `${fuseProgress * 100}%` }}
              />
            </div>
          </>
        ) : null}
        {debris.isFragment ? (
          <div className="absolute inset-[-8%] rounded-full border border-white/18 opacity-75" />
        ) : null}
      </div>
    </div>
  );
}

function FlybyDebrisChip({ debris }: { debris: FlybyDebris }) {
  const size = getDebrisRenderSize(debris);

  if (!debris.spriteSrc) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute z-[5]"
      style={{
        left: `${debris.x}%`,
        top: `${debris.y}%`,
        width: `${size}%`,
        transform: `translate(-50%, -50%) rotate(${debris.rotation}deg) scaleX(${debris.flipX ? -1 : 1})`,
        opacity: 0.72,
        filter: "drop-shadow(0 0 8px rgba(15,23,42,0.18))",
      }}
    >
      <Image
        src={debris.spriteSrc}
        alt=""
        width={256}
        height={256}
        unoptimized
        className="pointer-events-none block w-full select-none object-contain"
      />
    </div>
  );
}

function PickupChip({ pickup }: { pickup: Pickup }) {
  const progress = getPickupProgress(pickup);
  const top = getFallingY(pickup.targetY, pickup.ageMs, pickup.fallDurationMs);
  const visual = PICKUP_APPEARANCE[pickup.kind];

  return (
    <div
      data-testid={`pickup-${pickup.kind}`}
      className="pointer-events-none absolute z-[11]"
      style={{
        left: `${pickup.x}%`,
        top: `${top}%`,
        transform: `translate(-50%, -50%) scale(${0.92 + (1 - progress) * 0.08})`,
        width: "11.5%",
      }}
    >
      <div className={`relative flex aspect-square items-center justify-center rounded-full border ${visual.tone} ${visual.ring}`}>
        <PowerupSpriteArt kind={pickup.kind} sizeClassName="relative z-[1] h-[76%] w-[76%] drop-shadow-[0_0_12px_rgba(2,6,23,0.42)]" />
        <div className="absolute inset-[-18%] rounded-full border border-white/25" />
      </div>
    </div>
  );
}

function MovingPowerupChip({ powerup }: { powerup: RecoveryPowerup }) {
  const velocityAngle = (Math.atan2(powerup.velocityY, powerup.velocityX) * 180) / Math.PI;
  const trailLength = Math.min(10, Math.max(5, Math.hypot(powerup.velocityX, powerup.velocityY) * 0.18));
  const isReset = powerup.kind === "nuke_reset" || powerup.kind === "slow_reset";
  const trailTone =
    powerup.kind === "nuke_reset"
      ? "bg-amber-200/75"
      : powerup.kind === "slow_reset"
        ? "bg-cyan-100/75"
        : "bg-white/55";

  return (
    <div
      data-testid={`moving-powerup-${powerup.kind}`}
      className="pointer-events-none absolute z-[11]"
      style={{
        left: `${powerup.x}%`,
        top: `${powerup.y}%`,
        transform: "translate(-50%, -50%)",
        width: "12%",
      }}
    >
      <div
        className={`absolute left-1/2 top-1/2 h-1 -translate-y-1/2 rounded-full blur-[1px] ${trailTone}`}
        style={{
          width: `${trailLength * 3.5}px`,
          transform: `translate(-110%, -50%) rotate(${velocityAngle}deg)`,
          transformOrigin: "100% 50%",
        }}
      />
      <div
        className={`relative flex aspect-square items-center justify-center ${isReset ? "animate-[pulse_1.35s_ease-in-out_infinite]" : ""}`}
      >
        <PowerupSpriteArt kind={powerup.kind} sizeClassName="h-full w-full drop-shadow-[0_0_14px_rgba(2,6,23,0.42)]" />
        <div className="absolute inset-[-20%] rounded-full border border-white/18" />
      </div>
    </div>
  );
}

function IncomingBotWarningChip({ warning }: { warning: IncomingBotWarning }) {
  const fromLeft = warning.side === "left";
  const pulse = Math.sin(warning.ttlMs / 120);
  const opacity = 0.4 + Math.abs(pulse) * 0.6;

  return (
    <div
      className="pointer-events-none absolute z-[14]"
      style={{
        left: fromLeft ? "1.25%" : undefined,
        right: fromLeft ? undefined : "1.25%",
        top: `${warning.y}%`,
        transform: "translateY(-50%)",
        opacity,
      }}
    >
      <BotSpriteArt
        kind={warning.kind}
        frameIndex={0}
        sizeClassName="h-11 w-11 drop-shadow-[0_0_14px_rgba(2,6,23,0.6)]"
      />
    </div>
  );
}

function ActiveBotChip({ activeBot }: { activeBot: SupportBot }) {
  const progress = activeBot.ageMs / activeBot.lifeMs;
  const visual = BOT_APPEARANCE[activeBot.kind];
  const isRogue = activeBot.kind === "rogue";

  return (
    <div
      data-testid={`bot-${activeBot.kind}`}
      className="pointer-events-none absolute z-[12]"
      style={{
        left: `${activeBot.x}%`,
        top: `${activeBot.y}%`,
        transform: `translate(-50%, -50%) scale(${1 - progress * 0.08})`,
        opacity: Math.max(0.72, 1 - progress * 0.22),
        width: "16%",
      }}
    >
      <div
        className={`relative flex aspect-square items-center justify-center overflow-visible ${isRogue ? "rotate-[8deg] rounded-[34%]" : "rounded-full"}`}
      >
        <div
          className={`absolute inset-[-6%] ${isRogue ? "rounded-[36%]" : "rounded-full"} ${visual.ring} opacity-60`}
        />
        <div
          className={`absolute inset-[10%] ${isRogue ? "rounded-[34%]" : "rounded-full"} ${visual.tone} opacity-28 blur-[8px]`}
        />
        <BotSpriteArt
          kind={activeBot.kind}
          frameIndex={activeBot.animationFrameIndex}
          sizeClassName="relative z-[1] h-full w-full drop-shadow-[0_0_14px_rgba(2,6,23,0.4)]"
        />
        {isRogue ? (
          <>
            <div className="absolute inset-[-22%] rounded-[40%] border border-rose-200/55" />
            <div className="absolute bottom-[-20%] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-rose-200/75 blur-[1px]" />
          </>
        ) : null}
      </div>
    </div>
  );
}

function BotShotBeam({ shot }: { shot: BotShot }) {
  const deltaX = shot.toX - shot.fromX;
  const deltaY = shot.toY - shot.fromY;
  const length = Math.hypot(deltaX, deltaY);
  const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
  const opacity = Math.max(0, 1 - shot.ageMs / shot.lifeMs);

  return (
    <div
      data-testid="bot-shot"
      className="pointer-events-none absolute z-[13]"
      style={{
        left: `${shot.fromX}%`,
        top: `${shot.fromY}%`,
        width: `${length}%`,
        transform: `translateY(-50%) rotate(${angle}deg)`,
        transformOrigin: "0 50%",
        opacity,
      }}
    >
      <div className="relative h-1 rounded-full bg-[linear-gradient(90deg,_rgba(254,202,202,0.9),_rgba(239,68,68,0.95),_rgba(127,29,29,0.72))] shadow-[0_0_14px_rgba(248,113,113,0.85)]">
        <div className="absolute right-[-3px] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-red-200 shadow-[0_0_10px_rgba(248,113,113,0.95)]" />
      </div>
    </div>
  );
}

function VacuumCaptureChip({ capture }: { capture: VacuumCaptureDebris }) {
  const progress = Math.min(1, capture.ageMs / Math.max(1, capture.durationMs));
  const easedProgress = 1 - Math.pow(1 - progress, 3);
  const x = capture.startX + (capture.targetX - capture.startX) * easedProgress;
  const y = capture.startY + (capture.targetY - capture.startY) * easedProgress;
  const scale = capture.scale * (1 - easedProgress * 0.24);
  const opacity = 1 - progress * 0.22;
  const flipScaleX = capture.flipX ? -1 : 1;

  return (
    <div
      className="pointer-events-none absolute z-[12]"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${capture.size}%`,
        opacity,
        transform: `translate(-50%, -50%) rotate(${capture.rotation * (1 - easedProgress * 0.5)}deg) scaleX(${scale * flipScaleX}) scaleY(${scale})`,
        filter: "drop-shadow(0 0 14px rgba(34,211,238,0.3))",
      }}
    >
      {capture.spriteSrc ? (
        <Image
          src={capture.spriteSrc}
          alt=""
          width={256}
          height={256}
          unoptimized
          className="pointer-events-none block aspect-square w-full select-none object-contain"
        />
      ) : (
        <div className="aspect-square w-full rounded-[40%] bg-cyan-200/80" />
      )}
    </div>
  );
}

function EffectBubble({ effect }: { effect: EffectBurst }) {
  const progress = effect.ageMs / effect.lifeMs;
  const scale = 0.75 + progress * 0.7;
  const opacity = Math.max(0, 1 - progress);
  const translateY = effect.kind === "reward" ? -progress * 8 : 0;

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: `${effect.x}%`,
        top: `${effect.y}%`,
        transform: `translate(-50%, calc(-50% + ${translateY}px))`,
        opacity,
      }}
    >
      <div
        className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${effect.tone}`}
        style={{ transform: `scale(${scale})` }}
      >
        {effect.label}
      </div>
    </div>
  );
}

function VacuumRig({
  x,
  y,
  isActive,
  pullRadius,
  vacuumRange,
  transportDebris,
}: {
  x: number;
  y: number;
  isActive: boolean;
  pullRadius: number;
  vacuumRange: number;
  transportDebris: VacuumTransportDebris[];
}) {
  const anchorX = 50;
  const anchorY = 114;
  const minimumArmLength = 12;
  const headWidth = 15.5;
  const ringWidth = 11.4;
  const transportDebrisWidthRatio = 0.68 * TRANSPORT_DEBRIS_SCALE;
  const headScale = isActive ? 1.03 : 1;
  const headTilt = Math.max(-8, Math.min(8, (x - 50) * 0.18));
  const { socket: tubeTop, headRenderCenter } = getVacuumHeadSocket(x, y);
  const suctionPoint = getVacuumSuctionPoint(x, y);
  const tubeBottom = {
    x: anchorX,
    y: Math.max(anchorY, tubeTop.y + minimumArmLength),
  };
  const deltaX = tubeBottom.x - tubeTop.x;
  const deltaY = tubeBottom.y - tubeTop.y;
  const tubeLength = Math.hypot(deltaX, deltaY);
  const ringAspect = 0.52;
  const ringHeight = ringWidth * ringAspect;
  const ringSpacing = ringWidth * VACUUM_RING_SPACING_RATIO;
  const firstRingDistance = ringHeight * VACUUM_FIRST_RING_DISTANCE_RATIO;
  const ringCount = Math.max(1, Math.ceil((tubeLength + ringHeight) / ringSpacing) + 1);
  const pathOpacity = isActive ? 1 : 0.9;
  const ringReactionRange = ringSpacing * RING_REACTION_RANGE_MULTIPLIER;
  const curvedEnd = {
    x: Math.min(88, tubeTop.x + VACUUM_TRANSPORT_CURVE_RIGHT_OFFSET),
    y: tubeBottom.y,
  };
  const curveControlStart = {
    x: tubeTop.x,
    y: tubeTop.y + tubeLength * 0.36,
  };
  const curveControlEnd = {
    x: Math.max(tubeTop.x, curvedEnd.x - VACUUM_TRANSPORT_CURVE_RIGHT_OFFSET * 0.06),
    y: tubeBottom.y - tubeLength * 0.27,
  };
  const getTransportPathPoint = (distanceAlongPath: number) => {
    const t = Math.max(0, Math.min(1, distanceAlongPath / Math.max(1, tubeLength)));
    const inverseT = 1 - t;
    const x =
      inverseT ** 3 * tubeTop.x +
      3 * inverseT ** 2 * t * curveControlStart.x +
      3 * inverseT * t ** 2 * curveControlEnd.x +
      t ** 3 * curvedEnd.x;
    const y =
      inverseT ** 3 * tubeTop.y +
      3 * inverseT ** 2 * t * curveControlStart.y +
      3 * inverseT * t ** 2 * curveControlEnd.y +
      t ** 3 * curvedEnd.y;
    const tangentX =
      3 * inverseT ** 2 * (curveControlStart.x - tubeTop.x) +
      6 * inverseT * t * (curveControlEnd.x - curveControlStart.x) +
      3 * t ** 2 * (curvedEnd.x - curveControlEnd.x);
    const tangentY =
      3 * inverseT ** 2 * (curveControlStart.y - tubeTop.y) +
      6 * inverseT * t * (curveControlEnd.y - curveControlStart.y) +
      3 * t ** 2 * (curvedEnd.y - curveControlEnd.y);

    return {
      x,
      y,
      angle: (Math.atan2(tangentY, tangentX) * 180) / Math.PI - 90,
    };
  };
  const transportDebrisWithPosition = transportDebris.map((piece) => ({
    piece,
    distanceAlongPath: piece.progress * tubeLength,
  }));

  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 z-[15]"
        style={{
          opacity: pathOpacity,
          filter: isActive ? "drop-shadow(0 0 12px rgba(34,211,238,0.24))" : "drop-shadow(0 0 7px rgba(34,211,238,0.12))",
        }}
      >
        {Array.from({ length: ringCount }).map((_, index) => {
          const distanceAlongPath = firstRingDistance + index * ringSpacing;
          if (distanceAlongPath > tubeLength + ringHeight) {
            return null;
          }
          const pathPoint = getTransportPathPoint(distanceAlongPath);

          const ringReaction = transportDebrisWithPosition.reduce(
            (acc, entry) => {
              const distanceDelta = distanceAlongPath - entry.distanceAlongPath;
              const normalizedDistance = Math.abs(distanceDelta) / Math.max(1, ringReactionRange);
              if (normalizedDistance >= 1) {
                return acc;
              }

              const baseInfluence = 1 - normalizedDistance;
              const influence = Math.pow(baseInfluence, RING_REACTION_FALLOFF_EXPONENT);
              const direction = entry.piece.rotation >= 0 ? 1 : -1;

              return {
                offset: acc.offset + direction * influence * RING_REACTION_MAX_OFFSET_PX,
                rotation: acc.rotation + direction * influence * RING_REACTION_MAX_ROTATION_DEG,
              };
            },
            { offset: 0, rotation: 0 },
          );

          return (
            <div
              key={`vacuum-ring-${index}`}
              className="absolute"
              style={{
                left: `${pathPoint.x}%`,
                top: `${pathPoint.y}%`,
                width: `${ringWidth}%`,
                height: `${ringHeight}%`,
                backgroundImage: `url(${vacuumRingSprite})`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                backgroundSize: "100% 100%",
                opacity: isActive ? 0.84 : 0.74,
                transform: `translate(calc(-50% + ${ringReaction.offset}px), -50%) rotate(${pathPoint.angle + ringReaction.rotation}deg)`,
                transformOrigin: "50% 50%",
              }}
            />
          );
        })}
        {transportDebrisWithPosition.map(({ piece, distanceAlongPath }) => {
          const spriteSrc = vacuumTransportDebrisSprites[piece.spriteKey];
          const pieceWidth = ringWidth * transportDebrisWidthRatio * piece.scale;
          const pieceHeight = pieceWidth * 1.5;
          const pathPoint = getTransportPathPoint(distanceAlongPath);

          return (
            <div
              key={`vacuum-transport-${piece.id}`}
              className="absolute z-[1]"
              style={{
                left: `${pathPoint.x}%`,
                top: `${pathPoint.y}%`,
                width: `${pieceWidth}%`,
                height: `${pieceHeight}%`,
                transform: `translate(-50%, -50%) rotate(${pathPoint.angle + piece.rotation}deg)`,
                transformOrigin: "50% 50%",
                filter: isActive
                  ? "drop-shadow(0 0 10px rgba(34,211,238,0.18))"
                  : "drop-shadow(0 0 5px rgba(34,211,238,0.08))",
              }}
            >
              <Image
                src={spriteSrc}
                alt=""
                width={1024}
                height={1536}
                unoptimized
                className="pointer-events-none block h-full w-full select-none object-contain"
              />
            </div>
          );
        })}
      </div>

      <div
        className="pointer-events-none absolute z-[15]"
        style={{
          left: `${tubeTop.x}%`,
          top: `${tubeTop.y}%`,
          width: `${ringWidth * 0.88}%`,
          height: `${ringWidth * 0.66}%`,
          transform: `translate(-50%, -6%) rotate(${getTransportPathPoint(0).angle}deg)`,
        }}
      >
        <div className="h-full w-full rounded-[999px] bg-[radial-gradient(circle_at_center,_rgba(34,211,238,0.18),_rgba(2,6,23,0.0)_72%)]" />
      </div>

      <div
        className={`pointer-events-none absolute z-10 transition-transform duration-75 ${
          isActive ? "opacity-100" : "opacity-90"
        }`}
        style={{
          left: `${suctionPoint.x}%`,
          top: `${suctionPoint.y}%`,
          transform: "translate(-50%, -50%)",
        }}
      >
        <div
          data-testid="vacuum-pull"
          className="absolute left-1/2 top-1/2 rounded-full border border-cyan-200/25 bg-cyan-300/5"
          style={{
            width: `${pullRadius * 2.1}%`,
            height: `${pullRadius * 2.1}%`,
            transform: "translate(-50%, -50%)",
            boxShadow: isActive
              ? "0 0 38px rgba(34,211,238,0.16)"
              : "0 0 18px rgba(34,211,238,0.08)",
          }}
        />
        <div
          data-testid="vacuum-range"
          className="rounded-full border border-cyan-200/70 bg-cyan-300/12"
          style={{
            width: `${vacuumRange * 2.15}%`,
            height: `${vacuumRange * 2.15}%`,
            boxShadow: isActive
              ? "0 0 52px rgba(34,211,238,0.28), inset 0 0 26px rgba(34,211,238,0.09)"
              : "0 0 28px rgba(34,211,238,0.16)",
          }}
        />
      </div>

      <div
        className="pointer-events-none absolute z-[16]"
        style={{
          left: `${headRenderCenter.x}%`,
          top: `${headRenderCenter.y}%`,
          width: `${headWidth * VACUUM_HEAD_SCALE}%`,
          transform: `translate(-50%, -50%) rotate(${headTilt}deg) scale(${headScale})`,
          transformOrigin: "50% 44%",
          filter: isActive
            ? "drop-shadow(0 0 24px rgba(34,211,238,0.28))"
            : "drop-shadow(0 0 14px rgba(15,23,42,0.26))",
        }}
      >
        <Image
          src={vacuumHeadSprite}
          alt=""
          width={512}
          height={512}
          unoptimized
          className="pointer-events-none block aspect-square w-full select-none object-contain"
        />
      </div>
    </>
  );
}

export function HullKeeperGame() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const [readyScreen, setReadyScreen] = useState<ReadyScreen>("startMenu");
  const boardRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const activePointerIdRef = useRef<number | null>(null);

  const currentScreen: MenuScreen = state.mode === "ready" ? readyScreen : "gameplay";
  const derived = getDerivedStats(state);
  const stage = getStageConfig(state.level);

  const dispatchTick = useEffectEvent((deltaMs: number) => {
    dispatch({ type: "tick", deltaMs });
  });

  useEffect(() => {
    const storedDifficulty = window.localStorage.getItem(difficultyStorageKey);
    if (
      storedDifficulty === "Easy" ||
      storedDifficulty === "Normal" ||
      storedDifficulty === "Hard"
    ) {
      dispatch({ type: "setDifficulty", difficulty: storedDifficulty });
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(difficultyStorageKey, state.difficulty);
  }, [state.difficulty]);

  useEffect(() => {
    if (state.mode !== "running") {
      activePointerIdRef.current = null;
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      lastFrameRef.current = null;
      return;
    }

    const loop = (timestamp: number) => {
      if (lastFrameRef.current === null) {
        lastFrameRef.current = timestamp;
      }

      const deltaMs = Math.min(48, timestamp - lastFrameRef.current);
      lastFrameRef.current = timestamp;
      dispatchTick(deltaMs);
      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      lastFrameRef.current = null;
    };
  }, [state.mode]);

  const getBoardPoint = (clientX: number, clientY: number) => {
    if (!boardRef.current) {
      return null;
    }

    const rect = boardRef.current.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      !boardRef.current ||
      state.mode !== "running" ||
      state.pendingLevelChoices > 0 ||
      activePointerIdRef.current !== null
    ) {
      return;
    }

    const point = getBoardPoint(event.clientX, event.clientY);
    if (!point) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerIdRef.current = event.pointerId;
    dispatch({ type: "pointerDown", ...point });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      !boardRef.current ||
      state.mode !== "running" ||
      state.pendingLevelChoices > 0 ||
      activePointerIdRef.current !== event.pointerId
    ) {
      return;
    }

    const point = getBoardPoint(event.clientX, event.clientY);
    if (!point) {
      return;
    }

    dispatch({ type: "pointerMove", ...point });
  };

  const endPointer = (pointerId: number | null) => {
    if (activePointerIdRef.current === null) {
      return;
    }

    if (pointerId !== null && activePointerIdRef.current !== pointerId) {
      return;
    }

    activePointerIdRef.current = null;
    dispatch({ type: "pointerUp" });
  };

  const handleAbilityPress = (event: React.PointerEvent<HTMLButtonElement>, ability: AbilityKey) => {
    event.preventDefault();
    event.stopPropagation();
    dispatch({ type: "useAbility", ability });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    endPointer(event.pointerId);
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    endPointer(event.pointerId);
  };

  useEffect(() => {
    const handleWindowPointerMove = (event: PointerEvent) => {
      if (
        activePointerIdRef.current === null ||
        activePointerIdRef.current !== event.pointerId ||
        state.mode !== "running" ||
        state.pendingLevelChoices > 0
      ) {
        return;
      }

      const point = getBoardPoint(event.clientX, event.clientY);
      if (!point) {
        return;
      }

      dispatch({ type: "pointerMove", ...point });
    };

    const handleWindowPointerEnd = (event: PointerEvent) => {
      endPointer(event.pointerId);
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerEnd);
    window.addEventListener("pointercancel", handleWindowPointerEnd);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerEnd);
      window.removeEventListener("pointercancel", handleWindowPointerEnd);
    };
  }, [state.mode, state.pendingLevelChoices]);

  const startRun = () =>
    dispatch({ type: "startRun", seed: Date.now(), difficulty: state.difficulty });
  const restartRun = () =>
    dispatch({ type: "restartRun", seed: Date.now(), difficulty: state.difficulty });
  const returnToMenu = () => {
    setReadyScreen("startMenu");
    dispatch({ type: "returnToMenu", seed: Date.now(), difficulty: state.difficulty });
  };

  if (currentScreen === "startMenu") {
    return (
      <StartMenuScreen
        onStart={startRun}
        onInstructions={() => setReadyScreen("instructions")}
        onDifficulty={() => setReadyScreen("difficulty")}
        onQuit={returnToMenu}
      />
    );
  }

  if (currentScreen === "instructions") {
    return <InstructionsScreen onBack={() => setReadyScreen("startMenu")} />;
  }

  if (currentScreen === "difficulty") {
    return (
      <DifficultyScreen
        difficulty={state.difficulty}
        onSelect={(difficulty) => dispatch({ type: "setDifficulty", difficulty })}
        onBack={() => setReadyScreen("startMenu")}
      />
    );
  }

  if (state.mode === "gameOver") {
    return (
      <GameOverScreen
        elapsedMs={state.elapsedMs}
        salvage={state.salvage}
        bestSalvage={state.bestSalvage}
        onRestart={restartRun}
        onMenu={returnToMenu}
      />
    );
  }

  return (
    <Shell>
      <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-hidden sm:max-w-xl">
        <section
          data-testid="game-board"
          className="relative min-h-0 flex-1 touch-none overflow-hidden"
          ref={boardRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-2 pt-2">
            <div className="flex flex-col gap-1.5 text-[8px] uppercase tracking-[0.16em] text-slate-100 [text-shadow:0_1px_6px_rgba(2,6,23,0.8)]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                  <div className="text-slate-100/95">
                    <span className="mr-1 text-slate-300/80">Salvage</span>
                    <span className="font-semibold">{state.salvage}</span>
                  </div>
                  <div className="text-slate-100/95">
                    <span className="mr-1 text-slate-300/80">Lv</span>
                    <span className="font-semibold">{state.level}</span>
                  </div>
                  <div className="text-slate-100/95">
                    <span className="mr-1 text-slate-300/80">XP</span>
                    <span className="font-medium">
                      {Math.floor(state.xp)} / {state.xpToNext}
                    </span>
                  </div>
                  {state.comboTimerMs > 0 && state.comboCount > 1 ? (
                    <div className="text-emerald-100/95">
                      <span className="mr-1 text-emerald-100/70">Combo</span>
                      <span className="font-semibold">
                        x{getComboMultiplier(state.comboCount).toFixed(2)}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-2 text-slate-100/90">
                  <span className="tabular-nums">{formatTime(state.elapsedMs)}</span>
                  <span className="max-w-[7.25rem] truncate text-right text-slate-200/85">
                    {stage.name}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <TopStatBar
                  label="Shield"
                  value={state.shield}
                  maxValue={state.maxShield}
                  tone="bg-[linear-gradient(90deg,_#67e8f9,_#06b6d4)]"
                />
                <TopStatBar
                  label="Hull"
                  value={state.hull}
                  maxValue={state.maxHull}
                  tone="bg-[linear-gradient(90deg,_#fb7185,_#f43f5e)]"
                />
              </div>

              <div className="h-1 overflow-hidden rounded-full bg-slate-950/55">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,_#34d399,_#14b8a6)] transition-all"
                  style={{ width: `${(state.xp / state.xpToNext) * 100}%` }}
                />
              </div>

              {state.modifiers.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {state.modifiers.map((modifier) => (
                    <div
                      key={`${modifier.level}-${modifier.key}`}
                      className={`rounded-full border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] ${milestoneMeta[modifier.key].tone}`}
                      title={MILESTONE_MODIFIER_LABELS[modifier.key]}
                    >
                      {milestoneMeta[modifier.key].short}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="absolute inset-x-0 top-28 z-10">
            <div className="pointer-events-none absolute right-2 top-0 z-20 flex flex-col gap-1">
              {upgradeOrder.map((upgrade) => (
                <UpgradeChip
                  key={upgrade}
                  upgrade={upgrade}
                  level={state.upgrades[upgrade]}
                />
              ))}
            </div>
          </div>

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.16),_transparent_36%),linear-gradient(180deg,_rgba(15,23,42,0.28)_0%,_rgba(15,23,42,0.72)_100%)]" />
          <BoardArtworkLayer shield={state.shield} />

          {state.slowTimeMs > 0 ? (
            <div className="pointer-events-none absolute inset-0 bg-cyan-300/10 backdrop-blur-[1px]" />
          ) : null}

          {state.nukeFlashMs > 0 ? (
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,_rgba(251,191,36,0.4),_rgba(244,63,94,0.16),_transparent_68%)]"
              style={{ opacity: Math.min(1, state.nukeFlashMs / 850) }}
            />
          ) : null}

          {state.incomingBotWarning ? (
            <IncomingBotWarningChip warning={state.incomingBotWarning} />
          ) : null}

          {state.incomingRogueBotWarning ? (
            <IncomingBotWarningChip warning={state.incomingRogueBotWarning} />
          ) : null}

          <VacuumRig
            x={state.vacuumX}
            y={state.vacuumY}
            isActive={state.isVacuumActive}
            pullRadius={derived.pullRadius}
            vacuumRange={derived.vacuumRange}
            transportDebris={state.transportDebris}
          />

          {state.flybyDebris.map((debris) => (
            <FlybyDebrisChip key={debris.id} debris={debris} />
          ))}

          {state.pickups.map((pickup) => (
            <PickupChip key={pickup.id} pickup={pickup} />
          ))}

          {state.powerups.map((powerup) => (
            <MovingPowerupChip key={powerup.id} powerup={powerup} />
          ))}

          {state.activeBot ? <ActiveBotChip activeBot={state.activeBot} /> : null}
          {state.activeRogueBot ? <ActiveBotChip activeBot={state.activeRogueBot} /> : null}

          {state.botShots.map((shot) => (
            <BotShotBeam key={shot.id} shot={shot} />
          ))}

          {state.debris.map((debris) => (
            <DebrisChip
              key={debris.id}
              debris={debris}
              isSuctioned={state.suctioningDebrisIds.includes(debris.id)}
              shieldActive={state.shield > 0}
            />
          ))}

          {state.capturedDebris.map((capture) => (
            <VacuumCaptureChip key={capture.id} capture={capture} />
          ))}

          {state.effects.map((effect) => (
            <EffectBubble key={effect.id} effect={effect} />
          ))}

          {state.toast ? (
            <div
              className={`pointer-events-none absolute left-1/2 top-10 z-20 -translate-x-1/2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] shadow-lg ${
                state.toast.tone === "danger"
                  ? "border-rose-300/70 bg-rose-300/15 text-rose-50"
                  : state.toast.tone === "reward"
                    ? "border-amber-300/70 bg-amber-300/15 text-amber-50"
                    : "border-cyan-300/70 bg-cyan-300/15 text-cyan-50"
              }`}
            >
              {state.toast.label}
            </div>
          ) : null}

          <div className="pointer-events-none absolute bottom-[3.9rem] left-2 right-2 z-20 grid gap-1">
            {state.objectives
              .slice(0, MAX_OBJECTIVES)
              .map((objective) => <ObjectiveRow key={objective.id} objective={objective} />)}
          </div>

          <div className="absolute bottom-2 left-2 right-2 z-20 grid grid-cols-2 gap-2">
            {abilityOrder.map((ability) => (
              <AbilityButton
                key={ability}
                ability={ability}
                cooldownMs={state.abilities[ability].cooldownMs}
                disabled={state.pendingLevelChoices > 0}
                onPress={handleAbilityPress}
              />
            ))}
          </div>

          {state.pendingLevelChoices > 0 ? (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/74 px-3 backdrop-blur-sm">
              <div className="w-full rounded-[28px] border border-amber-300/20 bg-slate-950/92 p-4 shadow-[0_28px_70px_rgba(2,6,23,0.6)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-amber-200/80">
                      Level Up
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">Choose one tuned upgrade</h2>
                  </div>
                  <div className="rounded-2xl bg-amber-300/12 px-3 py-2 text-right">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-amber-100/70">Queued</p>
                    <p className="text-sm font-semibold">{state.pendingLevelChoices}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  {state.upgradeChoices.map((upgrade) => {
                    const maxed = state.upgrades[upgrade] >= UPGRADE_CAPS[upgrade];
                    return (
                    <button
                      key={upgrade}
                      type="button"
                      onClick={() => dispatch({ type: "selectUpgrade", upgrade })}
                      disabled={maxed}
                      className={`flex min-h-24 flex-col rounded-2xl border px-3 py-3 text-left transition ${
                        maxed
                          ? "border-slate-700/80 bg-slate-900/55 text-slate-500"
                          : "border-amber-300/20 bg-slate-900/80 hover:border-amber-300/60 hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{upgradeMeta[upgrade].label}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${
                            maxed
                              ? "bg-amber-300/12 text-amber-100"
                              : "bg-slate-950/60 text-slate-300"
                          }`}
                        >
                          {maxed ? "MAX" : `Lv ${state.upgrades[upgrade]} / ${UPGRADE_CAPS[upgrade]}`}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-300">
                        {UPGRADE_DESCRIPTIONS[upgrade]}
                      </p>
                    </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </Shell>
  );
}
