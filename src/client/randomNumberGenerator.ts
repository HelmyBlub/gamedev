import { GameState } from "./gameModel.js";

export function nextRandom(state: GameState) {
    state.randumNumberGenerator.seed++;
    let a = state.randumNumberGenerator.seed * 15485863;
    return (a * a * a % 2038074743) / 2038074743;
}
