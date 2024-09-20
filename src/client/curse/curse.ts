import { Character } from "../character/characterModel";
import { Game } from "../gameModel.js";

export type Curse = {
    type: string,
    level: number,
}

export const CURSE_DARKNESS = "Darkness";

export type CurseDarkness = Curse & {
}

export function createCurseDarkness(): CurseDarkness {
    return { level: 1, type: CURSE_DARKNESS };
}

export function applyCurse(curse: Curse, character: Character, game: Game) {
    if (!character.curses) character.curses = [];
    if (character.curses.find(c => c.type === curse.type)) return;
    character.curses.push(curse);
}