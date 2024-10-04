import { Character } from "../character/characterModel.js";
import { Game } from "../gameModel.js";
import { addCurseDarkness } from "./curseDarkness.js";

export type Curse = {
    type: string,
    level: number,
    visualizeFadeTimer?: number,
}

export type CurseFunctions = {
    tick?: (curse: Curse, target: Character, game: Game) => void,
    paint?: (ctx: CanvasRenderingContext2D, curse: Curse, target: Character, game: Game) => void,
    reset?: (curse: Curse) => void,
    copy: (curse: Curse) => Curse,
}

export type CursesFunctions = {
    [key: string]: CurseFunctions,
}

export const CURSES_FUNCTIONS: CursesFunctions = {};

export function onDomLoadCurses() {
    addCurseDarkness();
}

export function resetCurses(target: Character) {
    if (!target.curses) return;
    for (let curse of target.curses) {
        const functions = CURSES_FUNCTIONS[curse.type];
        if (functions.reset) functions.reset(curse);
    }
}

export function paintCurses(ctx: CanvasRenderingContext2D, target: Character, game: Game) {
    if (!target.curses) return;
    for (let curse of target.curses) {
        const functions = CURSES_FUNCTIONS[curse.type];
        if (functions.paint) functions.paint(ctx, curse, target, game);
    }
}

export function tickCurses(target: Character, game: Game) {
    if (!target.curses) return;
    for (let curse of target.curses) {
        const functions = CURSES_FUNCTIONS[curse.type];
        if (functions.tick) functions.tick(curse, target, game);
    }
}

export function copyCursesToTarget(sourceCurses: Curse[], targetCurses: Curse[], game: Game) {
    for (let sourceCurse of sourceCurses) {
        const index = targetCurses.findIndex(c => c.type === sourceCurse.type);
        if (index > -1) {
            const targetCurse = targetCurses[index];
            if (targetCurse.level < sourceCurse.level) {
                targetCurse.level = sourceCurse.level;
                targetCurse.visualizeFadeTimer = game.state.time + 2000;
            }
        } else {
            const functions = CURSES_FUNCTIONS[sourceCurse.type];
            const curse = functions.copy(sourceCurse);
            curse.visualizeFadeTimer = game.state.time + 2000;
            targetCurses.push(curse);
        }
    }
}

export function applyCurse(curse: Curse, character: Character, game: Game) {
    if (!character.curses) character.curses = [];
    if (character.curses.find(c => c.type === curse.type)) return;
    character.curses.push(curse);
}