import { addParticleEffect } from "../additionalPaint.js";
import { Character } from "../character/characterModel.js";
import { AbilityDamageBreakdown, addCurseDamageBreakDownToDamageMeter } from "../combatlog.js";
import { getCameraPosition } from "../game.js";
import { FACTION_PLAYER, Game, IdCounter, Position } from "../gameModel.js";
import { getPointPaintPosition, paintTextWithOutline } from "../gamePaint.js";
import { addCurseDarkness } from "./curseDarkness.js";
import { addCurseIce } from "./curseIce.js";
import { addCurseLightning } from "./curseLightning.js";
import { addCursePoison } from "./cursePoison.js";

export type Curse = {
    id: number,
    type: string,
    level: number,
    color: string,
    visualizeFadeTimer?: number,
    doDamageBreakDown?: boolean,
    cleansed?: boolean,
}

export type CurseFunctions = {
    create: (idCounter: IdCounter) => Curse,
    onCurseIncreased?: (curse: Curse, target: Character, game: Game) => void,
    paint?: (ctx: CanvasRenderingContext2D, curse: Curse, target: Character, game: Game) => void,
    reset?: (curse: Curse) => void,
    tick?: (curse: Curse, target: Character, game: Game) => void,
    remove?: (curse: Curse, target: Character, game: Game) => void,
    mapModifierName: string,
}

export type CursesFunctions = {
    [key: string]: CurseFunctions,
}

export const CURSES_FUNCTIONS: CursesFunctions = {};

export function onDomLoadCurses() {
    addCurseDarkness();
    addCurseLightning();
    addCurseIce();
    addCursePoison();
}

export function createCurse(curseType: string, idCounter: IdCounter): Curse {
    const functions = CURSES_FUNCTIONS[curseType];
    return functions.create(idCounter);
}

export function removeCurses(character: Character, game: Game) {
    if (!character.curses) return;
    for (let curse of character.curses) {
        const functions = CURSES_FUNCTIONS[curse.type];
        if (functions && functions.remove) functions.remove(curse, character, game);
    }
    character.curses = [];
}

export function resetCurses(target: Character) {
    if (!target.curses) return;
    for (let curse of target.curses) {
        const functions = CURSES_FUNCTIONS[curse.type];
        curse.visualizeFadeTimer = undefined;
        if (functions.reset) functions.reset(curse);
    }
}

export function paintCurses(ctx: CanvasRenderingContext2D, target: Character, game: Game) {
    if (!target.curses) return;
    for (let curse of target.curses) {
        const functions = CURSES_FUNCTIONS[curse.type];
        if (functions.paint) functions.paint(ctx, curse, target, game);
    }
    paintCurseTexts(ctx, target, game);
}

export function tickCurses(target: Character, game: Game) {
    if (!target.curses) return;
    for (let curse of target.curses) {
        const functions = CURSES_FUNCTIONS[curse.type];
        if (functions.tick) functions.tick(curse, target, game);
    }
}

export function copyCursesToTarget(sourceCurses: Curse[], targetCurses: Curse[], game: Game, targetFaction: string | undefined = undefined) {
    for (let sourceCurse of sourceCurses) {
        const index = targetCurses.findIndex(c => c.type === sourceCurse.type);
        if (index > -1) {
            const targetCurse = targetCurses[index];
            if (targetCurse.level < sourceCurse.level) {
                targetCurse.level = sourceCurse.level;
                if (!sourceCurse.cleansed) targetCurse.cleansed = false;
                targetCurse.visualizeFadeTimer = game.state.time + 2000;
            }
        } else {
            const curse = copyCurse(sourceCurse, game.state.idCounter);
            curse.visualizeFadeTimer = game.state.time + 2000;
            if (targetFaction === FACTION_PLAYER) curse.doDamageBreakDown = true;
            targetCurses.push(curse);
        }
    }
}

export function doCurseDamageBreakDown(damage: number, curse: Curse, clientId: number, game: Game) {
    if (!curse.doDamageBreakDown) return;
    const damageBreakDown: AbilityDamageBreakdown[] = [];
    damageBreakDown.push({
        damage: damage,
        name: curse.type,
    });
    addCurseDamageBreakDownToDamageMeter(game.UI.damageMeter, curse, damageBreakDown, clientId);
}

export function applyCurse(curse: Curse, character: Character, game: Game) {
    if (!character.curses) character.curses = [];
    if (character.curses.find(c => c.type === curse.type)) return;
    character.curses.push(curse);
    if (character.faction === FACTION_PLAYER) curse.doDamageBreakDown = true;
}

export function addCursedParticleEffect(curses: Curse[], position: Position, game: Game) {
    if (curses.length === 0) return;
    for (let curse of curses) {
        const random = Math.random();
        if (random < 0.002 * curse.level) {
            addParticleEffect({
                x: position.x + Math.floor(Math.random() * 20 - 10),
                y: position.y + 5,
            }, curse.color, 2000, 20, game);
        }
    }
}

export function createCursesMoreInfoTextLine(curses?: Curse[]): string | undefined {
    if (!curses) return undefined;
    let cursesText = "";
    let first = true;
    for (let curse of curses) {
        if (first) first = false; else cursesText += `, `;
        cursesText += `${curse.type} ${Math.floor(curse.level)}`;
        if (curse.cleansed) cursesText += `(cleansed)`;
    }
    return `Curses: ${cursesText}`;
}

export function increaseCurseLevel(curseTarget: Character, curse: Curse, amount: number, game: Game) {
    curse.level += amount;
    const functions = CURSES_FUNCTIONS[curse.type];
    if (functions.onCurseIncreased) functions.onCurseIncreased(curse, curseTarget, game);
}


function paintCurseTexts(ctx: CanvasRenderingContext2D, target: Character, game: Game) {
    if (!target.curses) return;
    let offsetY = 0;
    const fontSize = 30;
    ctx.font = `${fontSize}px Arial`;
    for (let curse of target.curses) {
        if (curse.visualizeFadeTimer !== undefined && curse.visualizeFadeTimer > game.state.time) {
            const cameraPosition = getCameraPosition(game);
            const paintPos = getPointPaintPosition(ctx, target, cameraPosition, game.UI.zoom);
            paintTextWithOutline(ctx, "white", "black", `Curse ${curse.type} Level ${Math.floor(curse.level)}`, paintPos.x, paintPos.y - 30 + offsetY, true, 3);
            offsetY += fontSize + 2;
        }
    }
}

function copyCurse(curse: Curse, idCounter: IdCounter): Curse {
    const functions = CURSES_FUNCTIONS[curse.type];
    const copy = functions.create(idCounter);
    copy.level = curse.level;
    copy.cleansed = curse.cleansed;
    return copy;
}

