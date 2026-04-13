import { createInitialState, gameReducer } from "../lib/game/engine";

let state = createInitialState();

if (state.mode !== "ready") {
  throw new Error(`Expected initial state to be ready, received ${state.mode}.`);
}

state = gameReducer(state, { type: "startRun", seed: 42 });

if (state.mode !== "running") {
  throw new Error(`Expected state to enter running after start, received ${state.mode}.`);
}

for (let step = 0; step < 800; step += 1) {
  if (state.mode === "gameOver") {
    break;
  }
  state = gameReducer(state, { type: "tick", deltaMs: 1000 });
}

if (state.mode !== "gameOver") {
  throw new Error("Expected the run to reach game over during simulation.");
}

state = gameReducer(state, { type: "restartRun", seed: 99 });

if (state.mode !== "running") {
  throw new Error(`Expected restart to re-enter running, received ${state.mode}.`);
}

console.log(
  JSON.stringify(
    {
      initial: "ready",
      afterStart: "running",
      reachedGameOver: true,
      afterRestart: state.mode,
    },
    null,
    2,
  ),
);
