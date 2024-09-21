import { Character } from "../character/characterModel.js";
import { Game } from "../gameModel.js";
import { addCurseDarkness } from "./curseDarkness.js";

export type Curse = {
    type: string,
    level: number,
}

export type CurseFunctions = {
    tick?: (curse: Curse, target: Character, game: Game) => void,
}

export type CursesFunctions = {
    [key: string]: CurseFunctions,
}

export const CURSES_FUNCTIONS: CursesFunctions = {};

export function onDomLoadCurses() {
    addCurseDarkness();
}

export function tickCurses(target: Character, game: Game) {
    if (!target.curses) return;
    for (let curse of target.curses) {
        const functions = CURSES_FUNCTIONS[curse.type];
        if (functions.tick) functions.tick(curse, target, game);
    }
}

export function applyCurse(curse: Curse, character: Character, game: Game) {
    if (!character.curses) character.curses = [];
    if (character.curses.find(c => c.type === curse.type)) return;
    character.curses.push(curse);
}