"use client";

import Image from "next/image";
import { useEffect, useEffectEvent, useReducer, useRef, useState } from "react";
import type { ReactNode } from "react";

import {
  BOT_APPEARANCE,
  DEBRIS_APPEARANCE,
  MILESTONE_MODIFIER_LABELS,
  MAX_OBJECTIVES,
  PICKUP_APPEARANCE,
  UPGRADE_CAPS,
  UPGRADE_DESCRIPTIONS,
  createInitialState,
  formatTime,
  gameReducer,
  getComboMultiplier,
  getDebrisProgress,
  getDebrisRenderSprite,
  getDebrisFuseProgress,
  getDerivedStats,
  getFallingY,
  getObjectiveProgressText,
  getPickupProgress,
  getStageConfig,
} from "@/lib/game/engine";
import type {
  AbilityKey,
  BotKind,
  BotShot,
  Debris,
  DebrisKind,
  DifficultyMode,
  EffectBurst,
  IncomingBotWarning,
  Objective,
  Pickup,
  RecoveryPowerup,
  SupportBot,
  UpgradeKey,
} from "@/lib/game/types";

const upgradeOrder: UpgradeKey[] = ["power", "range", "tempo", "ability", "shield"];
const abilityOrder: AbilityKey[] = ["slowTime", "nuke"];
type MenuScreen = "startMenu" | "instructions" | "difficulty" | "gameplay";
type ReadyScreen = Exclude<MenuScreen, "gameplay">;
const difficultyStorageKey = "hull-keeper:difficulty";
const boardImageUnshielded = "/assets/board/ShipHull.png";
const boardImageShielded = "/assets/board/ShipHull_Shielded.png";

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
  { kind: "unstable", name: "Unstable Debris", description: "Explodes after its fuse if ignored." },
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
  {
    kind: "stabilizer",
    name: "Stabilizer Bot",
    description: "Slows nearby debris to buy you breathing room.",
  },
  { kind: "turret", name: "Turret Bot", description: "Fires at debris to help reduce pressure." },
  {
    kind: "rogue",
    name: "Rogue Bot",
    description: "A hostile bot that drops debris and explodes locally when vacuumed.",
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

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_32%),linear-gradient(180deg,_#020617_0%,_#06111f_45%,_#0f172a_100%)] text-slate-50">
      {children}
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
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-16 w-full items-center justify-center rounded-[22px] border border-cyan-300/16 bg-slate-950/72 px-4 py-3 text-center text-slate-50 shadow-[0_14px_30px_rgba(2,6,23,0.3)] transition hover:border-cyan-300/35 hover:bg-slate-900/90 active:scale-[0.99]"
    >
      <span className="text-lg font-semibold">{label}</span>
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
    <Shell>
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col justify-center px-4 py-6 sm:max-w-md">
        <div className="rounded-[32px] border border-cyan-300/20 bg-slate-950/60 px-5 py-8 text-center shadow-[0_30px_70px_rgba(2,6,23,0.56)] backdrop-blur sm:px-7 sm:py-10">
          <h1 className="text-4xl font-semibold tracking-[0.04em] text-slate-50 sm:text-5xl">
            Hull Keeper
          </h1>

          <p className="mx-auto mt-4 max-w-[24rem] text-sm leading-7 text-slate-300 sm:text-base">
            {frontScreenDescription}
          </p>

          <div className="mt-8 space-y-3">
            <MenuButton label="Start" onClick={onStart} />
            <MenuButton label="Instructions" onClick={onInstructions} />
            <MenuButton label="Difficulty" onClick={onDifficulty} />
            <MenuButton label="Quit" onClick={onQuit} />
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

function DebrisReferenceIcon({ kind }: { kind: DebrisKind }) {
  const visual = DEBRIS_APPEARANCE[kind];

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-slate-800 bg-slate-950/80">
      <div
        className={`flex h-8 w-8 items-center justify-center border text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-[0_0_18px_rgba(15,23,42,0.3)] ${visual.shape} ${visual.fill}`}
      >
        <span className={kind === "corrosive" ? "-rotate-45" : ""}>{visual.short}</span>
      </div>
    </div>
  );
}

function BotReferenceIcon({ kind }: { kind: BotKind }) {
  const visual = BOT_APPEARANCE[kind];
  const isTurret = kind === "turret";
  const isStabilizer = kind === "stabilizer";
  const isRogue = kind === "rogue";

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-slate-800 bg-slate-950/80">
      <div
        className={`relative flex h-8 w-9 items-center justify-center border text-[10px] font-bold shadow-[0_0_18px_rgba(15,23,42,0.3)] ${visual.tone} ${visual.ring} ${isRogue ? "rounded-[34%] rotate-[8deg]" : "rounded-full"}`}
      >
        <div className="absolute inset-y-[24%] left-[-14%] w-[18%] rounded-full border border-white/30 bg-white/10" />
        <div className="absolute inset-y-[24%] right-[-14%] w-[18%] rounded-full border border-white/30 bg-white/10" />
        {isTurret ? (
          <div className="absolute left-1/2 top-[14%] h-[14%] w-0.5 -translate-x-1/2 rounded-full bg-red-100/90" />
        ) : null}
        {isStabilizer ? (
          <div className="absolute inset-[-20%] rounded-full border border-sky-100/35" />
        ) : null}
        <span>{visual.short}</span>
      </div>
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
    <Shell>
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
                  title="Debris Types"
                  description="These are the main threats that build up across the hull."
                />
                <div className="mt-4 space-y-3">
                  {debrisGuide.map((entry) => (
                    <ReferenceRow
                      key={entry.kind}
                      icon={<DebrisReferenceIcon kind={entry.kind} />}
                      title={entry.name}
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
    <Shell>
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
    <Shell>
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center gap-4 px-4 py-4">
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

        <div className="grid grid-cols-2 gap-3 rounded-[28px] border border-rose-300/20 bg-slate-950/60 p-4 shadow-[0_22px_60px_rgba(2,6,23,0.45)] backdrop-blur">
          <button
            type="button"
            onClick={onRestart}
            className="relative z-10 inline-flex min-h-16 w-full items-center justify-center rounded-[22px] bg-rose-300 px-5 text-base font-semibold text-slate-950 shadow-[0_14px_30px_rgba(251,113,133,0.3)] transition hover:bg-rose-200 active:scale-[0.99]"
          >
            Play Again
          </button>
          <button
            type="button"
            onClick={onMenu}
            className="inline-flex min-h-16 w-full items-center justify-center rounded-[22px] border border-slate-700 bg-slate-900/80 px-5 text-base font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-900"
          >
            Main Menu
          </button>
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
  const baseSize =
    debris.kind === "heavy"
      ? 19.5
      : debris.kind === "tank"
      ? 17.5
        : debris.kind === "splatter"
          ? 13.5
          : debris.kind === "unstable"
          ? 13
          : 11.5;
  const size = debris.isFragment ? baseSize * 0.68 : baseSize;
  const hpRatio = Math.max(0, debris.hp / debris.maxHp);
  const landed = debris.state === "resting";
  const exploding = debris.state === "exploding";
  const fuseProgress = getDebrisFuseProgress(debris);
  const isDrift = debris.behavior === "drift";
  const isSticky = debris.behavior === "sticky";
  const isSwift = debris.behavior === "swift";
  const spriteSrc = getDebrisRenderSprite(debris);
  const usesSprite = Boolean(spriteSrc);
  const flyingRotation = ((debris.id % 7) - 3) * 4;
  const cleanupScale =
    debris.kind === "heavy" && landed ? Math.max(0.7, 1 - debris.cleanupProgress * 0.26) : 1;
  const explosionScale = exploding ? 1.08 : 1;
  const groundedOffsetPx = landed ? (shieldActive ? -2 : 2) : 0;
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
        : debris.kind === "unstable"
          ? "h-[64%] rounded-[46%] rotate-[6deg]"
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
        : debris.kind === "unstable"
          ? [
              "left-[16%] top-[60%] h-[16%] w-[16%] rotate-[18deg] rounded-full",
              "left-[62%] top-[18%] h-[18%] w-[18%] -rotate-[12deg] rounded-full",
              "left-[70%] top-[56%] h-[14%] w-[14%] rotate-[26deg] rounded-full",
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
        transform: `translate(-50%, calc(-50% + ${groundedOffsetPx}px)) scale(${(0.92 + hpRatio * 0.08) * cleanupScale * explosionScale}) rotate(${landed || exploding ? 0 : flyingRotation}deg)`,
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
                  ? `w-[112%] opacity-95 ${shieldActive ? "shadow-[0_10px_20px_rgba(2,6,23,0.24)]" : ""}`
                  : "aspect-square"
              } ${
                isSuctioned ? "scale-[0.88] ring-2 ring-cyan-200/70 shadow-[0_0_28px_rgba(34,211,238,0.42)]" : ""
              }`
        }
      >
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
              <div className="absolute inset-x-[8%] bottom-[-8%] h-[16%] rounded-full bg-slate-950/40 blur-[2px]" />
            ) : null}
            {debris.kind === "heavy" && landed && shieldActive && debris.cleanupStage > 0 ? (
              <div className="absolute inset-x-[16%] bottom-[10%] h-[10%] rounded-full bg-slate-950/18 blur-[1px]" />
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
                  <div className="absolute inset-x-[6%] bottom-[-10%] h-[18%] rounded-full bg-slate-950/45 blur-[2px]" />
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
        {debris.kind === "tank" ? (
          <>
            <div className="absolute inset-[18%] rounded-[24%] border border-orange-50/18" />
            {shieldActive ? (
              <div className="absolute inset-x-[22%] bottom-[18%] h-[10%] rounded-full bg-slate-950/28" />
            ) : null}
          </>
        ) : null}
        {debris.kind === "unstable" && landed ? (
          <div
            className="absolute inset-[-10%] rounded-full border border-rose-300/70"
            style={{
              opacity: 0.4 + ((debris.ageMs - debris.fallDurationMs) % 800) / 1600,
            }}
          />
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
      <div className={`relative flex aspect-square items-center justify-center rounded-full border text-[10px] font-bold uppercase tracking-[0.2em] ${visual.tone} ${visual.ring}`}>
        <span>{visual.short}</span>
        <div className="absolute inset-[-18%] rounded-full border border-white/25" />
      </div>
    </div>
  );
}

function MovingPowerupChip({ powerup }: { powerup: RecoveryPowerup }) {
  const visual = PICKUP_APPEARANCE[powerup.kind];
  const velocityAngle = (Math.atan2(powerup.velocityY, powerup.velocityX) * 180) / Math.PI;
  const trailLength = Math.min(10, Math.max(5, Math.hypot(powerup.velocityX, powerup.velocityY) * 0.18));

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
        className="absolute left-1/2 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/55 blur-[1px]"
        style={{
          width: `${trailLength * 3.5}px`,
          transform: `translate(-110%, -50%) rotate(${velocityAngle}deg)`,
          transformOrigin: "100% 50%",
        }}
      />
      <div
        className={`relative flex aspect-square items-center justify-center rounded-full border text-[10px] font-bold uppercase tracking-[0.18em] ${visual.tone} ${visual.ring}`}
      >
        <span>{powerup.kind === "shield" ? "+S" : "+H"}</span>
        <div className="absolute inset-[-20%] rounded-full border border-white/25" />
        <div className="absolute inset-[-42%] rounded-full border border-white/12" />
      </div>
    </div>
  );
}

function IncomingBotWarningChip({ warning }: { warning: IncomingBotWarning }) {
  const visual = BOT_APPEARANCE[warning.kind];
  const fromLeft = warning.side === "left";
  const opacity = Math.max(0.45, Math.min(1, warning.ttlMs / 2300));
  const bannerTone =
    warning.kind === "rogue"
      ? "border-rose-300/60 bg-rose-300/15 text-rose-50"
      : "border-cyan-300/50 bg-slate-950/85 text-cyan-50";

  return (
    <>
      <div
        className="pointer-events-none absolute z-[14]"
        style={{
          left: fromLeft ? "2%" : undefined,
          right: fromLeft ? undefined : "2%",
          top: `${warning.y}%`,
          transform: "translateY(-50%)",
          opacity,
        }}
      >
        <div className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] ${visual.tone}`}>
          <span>{fromLeft ? ">" : "<"}</span>
          <span>{visual.short}</span>
        </div>
      </div>
      <div
        className={`pointer-events-none absolute left-1/2 top-16 z-[14] -translate-x-1/2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${bannerTone}`}
        style={{ opacity }}
      >
        {warning.kind === "rogue" ? "Rogue Bot" : "Bot Incoming"}
      </div>
    </>
  );
}

function ActiveBotChip({ activeBot }: { activeBot: SupportBot }) {
  const progress = activeBot.ageMs / activeBot.lifeMs;
  const visual = BOT_APPEARANCE[activeBot.kind];
  const isStabilizer = activeBot.kind === "stabilizer";
  const isTurret = activeBot.kind === "turret";
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
        width: "11%",
      }}
    >
      <div className={`relative flex aspect-[1.2] items-center justify-center border text-[11px] font-bold ${visual.tone} ${visual.ring} ${isRogue ? "rounded-[34%] rotate-[8deg]" : "rounded-full"}`}>
        <div className="absolute inset-y-[24%] left-[-18%] w-[24%] rounded-full border border-white/35 bg-white/15" />
        <div className="absolute inset-y-[24%] right-[-18%] w-[24%] rounded-full border border-white/35 bg-white/15" />
        <div className="absolute inset-x-[24%] top-[-18%] h-[22%] rounded-full border border-white/35 bg-white/18" />
        <span>{visual.short}</span>
        <div className="absolute inset-[-18%] rounded-full border border-white/20" />
        {isTurret ? (
          <>
            <div className="absolute left-1/2 top-[14%] h-[14%] w-0.5 -translate-x-1/2 rounded-full bg-red-100/90" />
            <div className="absolute left-[50%] top-1/2 h-0.5 w-[44%] -translate-y-1/2 rounded-full bg-red-100/85" />
          </>
        ) : null}
        {isStabilizer ? (
          <div className="absolute inset-[-48%] rounded-full border border-sky-200/30" />
        ) : null}
        {isRogue ? (
          <>
            <div className="absolute inset-[-22%] rounded-[40%] border border-rose-200/55" />
            <div className="absolute left-[18%] top-[18%] h-1.5 w-1.5 rounded-full bg-white/90" />
            <div className="absolute right-[18%] top-[18%] h-1.5 w-1.5 rounded-full bg-white/90" />
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
  const vacuumVisualY = Math.max(12, state.vacuumY - 7.5);
  const vacuumTetherHeight = Math.max(0, state.vacuumY - vacuumVisualY);

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

          {state.isVacuumActive ? (
            <>
              <div
                className="pointer-events-none absolute z-10 w-0.5 -translate-x-1/2 rounded-full bg-gradient-to-b from-cyan-200/80 via-cyan-300/45 to-transparent"
                style={{
                  left: `${state.vacuumX}%`,
                  top: `${vacuumVisualY}%`,
                  height: `${vacuumTetherHeight}%`,
                }}
              />
              <div
                className="pointer-events-none absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/45 bg-cyan-300/10"
                style={{
                  left: `${state.vacuumX}%`,
                  top: `${state.vacuumY}%`,
                }}
              />
            </>
          ) : null}

          <div
            className={`pointer-events-none absolute z-10 transition-transform duration-75 ${
              state.isVacuumActive ? "opacity-100" : "opacity-90"
            }`}
            style={{
              left: `${state.vacuumX}%`,
              top: `${vacuumVisualY}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              data-testid="vacuum-pull"
              className="absolute left-1/2 top-1/2 rounded-full border border-cyan-200/25 bg-cyan-300/5"
              style={{
                width: `${derived.pullRadius * 2.1}%`,
                height: `${derived.pullRadius * 2.1}%`,
                transform: "translate(-50%, -50%)",
                boxShadow: state.isVacuumActive
                  ? "0 0 38px rgba(34,211,238,0.16)"
                  : "0 0 18px rgba(34,211,238,0.08)",
              }}
            />
            <div
              data-testid="vacuum-range"
              className="rounded-full border border-cyan-200/70 bg-cyan-300/12"
              style={{
                width: `${derived.vacuumRange * 2.15}%`,
                height: `${derived.vacuumRange * 2.15}%`,
                boxShadow: state.isVacuumActive
                  ? "0 0 52px rgba(34,211,238,0.28), inset 0 0 26px rgba(34,211,238,0.09)"
                  : "0 0 28px rgba(34,211,238,0.16)",
              }}
            />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/45 bg-cyan-300/8 blur-[1px]" />
            <div
              data-testid="vacuum-core"
              className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-50/65 bg-[radial-gradient(circle,_rgba(165,243,252,0.96),_rgba(34,211,238,0.48),_rgba(8,47,73,0.18))] shadow-[0_0_38px_rgba(34,211,238,0.52)]"
            >
              <div className="absolute inset-[22%] rounded-full border border-slate-950/20" />
              <div className="absolute inset-[-22%] rounded-full border border-cyan-200/35" />
            </div>
          </div>

          {state.pickups.map((pickup) => (
            <PickupChip key={pickup.id} pickup={pickup} />
          ))}

          {state.powerups.map((powerup) => (
            <MovingPowerupChip key={powerup.id} powerup={powerup} />
          ))}

          {state.activeBot ? <ActiveBotChip activeBot={state.activeBot} /> : null}

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
