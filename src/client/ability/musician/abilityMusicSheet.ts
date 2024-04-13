import { Character } from "../../character/characterModel.js";
import { AbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { getNextId } from "../../game.js";
import { Position, Game, IdCounter } from "../../gameModel.js";
import { playerInputBindingToDisplayValue } from "../../playerInput.js";
import { MoreInfoPart, createMoreInfosPart } from "../../moreInfo.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, getAbilityNameUiText } from "../ability.js";
import { AbilityUpgradesFunctions, pushAbilityUpgradesOptions, pushAbilityUpgradesUiTexts, upgradeAbility } from "../abilityUpgrade.js";
import { AbilityDamageBreakdown } from "../../combatlog.js";
import { MusicNote, MusicSheet, Note, notesToFrequencyIndex, playMusicNote } from "../../sound.js";
import { getPointPaintPosition } from "../../gamePaint.js";

export type AbilityMusicSheet = Ability & {
    lastNotePlayTick: number,
    maxPlayTicks: number,
    musicSheet: MusicSheet,
    paintWidth: number,
    paintHeight: number,
    offestY: number,
}

const LINE_COUNT = 5;
const BASE_OCATAVE = 4;
export const ABILITY_NAME_MUSIC_SHEET = "Music Sheet";
export const ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS: AbilityUpgradesFunctions = {};

export function addAbilityMusicSheet() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_MUSIC_SHEET] = {
        activeAbilityCast: castNote,
        createAbility: createAbilityMusicSheet,
        createAbilityBossUpgradeOptions: createAbilityBossSpeedBoostUpgradeOptions,
        createAbilityMoreInfos: createAbilityMoreInfos,
        createDamageBreakDown: createDamageBreakDown,
        executeUpgradeOption: executeAbilityUpgradeOption,
        paintAbility: paintAbility,
        paintAbilityUI: paintAbilityUI,
        resetAbility: resetAbility,
        setAbilityToLevel: setAbilityToLevel,
        setAbilityToBossLevel: setAbilityToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        tickAbility: tickAbility,
        tickBossAI: tickBossAI,
        abilityUpgradeFunctions: ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS,
        canBeUsedByBosses: true,
    };
}

export function createAbilityMusicSheet(
    idCounter: IdCounter,
    playerInputBinding?: string,
): AbilityMusicSheet {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_MUSIC_SHEET,
        passive: false,
        upgrades: {},
        playerInputBinding: playerInputBinding,
        tradable: true,
        musicSheet: { speed: 400, notes: [] },
        maxPlayTicks: 16,
        lastNotePlayTick: 0,
        paintWidth: 500,
        paintHeight: 80,
        offestY: 50,
    };
}

function createDamageBreakDown(damage: number, ability: Ability, abilityObject: AbilityObject | undefined, damageAbilityName: string, game: Game): AbilityDamageBreakdown[] {
    const damageBreakDown: AbilityDamageBreakdown[] = [];
    damageBreakDown.push({
        damage: damage,
        name: "Base Damage",
    });
    return damageBreakDown;
}

function tickBossAI(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
}

function resetAbility(ability: Ability) {
}

function castNote(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, isKeydown: boolean, game: Game) {
    if (!isKeydown) return;
    const musicSheet = ability as AbilityMusicSheet;
    const unroundedTick = (((castPosition.x - abilityOwner.x) + musicSheet.paintWidth / 2) / musicSheet.paintWidth) * musicSheet.maxPlayTicks;
    const tick = Math.round(unroundedTick);
    if (tick < 0 || tick >= musicSheet.maxPlayTicks) return;
    const musicNote = yPosToMusicNote(castPosition.y, abilityOwner.y, musicSheet);
    if (!musicNote) return;
    musicNote.tick = tick;
    let duplicateNoteIndex = musicSheet.musicSheet.notes.findIndex(n => n.note === musicNote.note && n.tick === tick);
    if (duplicateNoteIndex > -1) {
        const dupNote = musicSheet.musicSheet.notes[duplicateNoteIndex];
        if (unroundedTick < tick - 0.1) {
            if (!dupNote.semitone) {
                dupNote.semitone = "sharp";
            } else if (dupNote.semitone === "sharp") {
                dupNote.semitone = "flat";
            } else {
                dupNote.semitone = undefined;
            }
        } else {
            if (dupNote.durationFactor < 4) {
                dupNote.durationFactor *= 2;
            } else {
                musicSheet.musicSheet.notes.splice(duplicateNoteIndex, 1);
            }
        }
    } else {
        musicSheet.musicSheet.notes.push(musicNote);
    }
}

function createAbilityBossSpeedBoostUpgradeOptions(ability: Ability, character: Character, game: Game): UpgradeOptionAndProbability[] {
    const upgradeOptions: UpgradeOptionAndProbability[] = [];
    pushAbilityUpgradesOptions(ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS, upgradeOptions, ability, character, game);
    return upgradeOptions;
}

function executeAbilityUpgradeOption(ability: Ability, character: Character, upgradeOption: UpgradeOption, game: Game) {
    const abilityUpgradeOption: AbilityUpgradeOption = upgradeOption as AbilityUpgradeOption;
    upgradeAbility(ability, character, abilityUpgradeOption);
}

function setAbilityToLevel(ability: Ability, level: number) {
    const musicSheet = ability as AbilityMusicSheet;
}

function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const musicSheet = ability as AbilityMusicSheet;
}

function setAbilityToBossLevel(ability: Ability, level: number) {
    const musicSheet = ability as AbilityMusicSheet;
}

function paintAbilityUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    const musicSheet = ability as AbilityMusicSheet;
    const rectSize = size;

    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.beginPath();
    ctx.rect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.stroke();

    if (musicSheet.playerInputBinding) {
        const keyBind = playerInputBindingToDisplayValue(musicSheet.playerInputBinding, game);
        ctx.fillStyle = "black";
        ctx.font = "10px Arial";
        ctx.fillText(keyBind, drawStartX + 1, drawStartY + 8);
    }
}

function paintAbility(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    const abilityMusicSheet = ability as AbilityMusicSheet;

    let ownerPaintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition);
    const topLeftMusicSheet = {
        x: Math.floor(ownerPaintPos.x - abilityMusicSheet.paintWidth / 2),
        y: ownerPaintPos.y + abilityMusicSheet.offestY,
    }

    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "white";
    ctx.fillRect(topLeftMusicSheet.x, topLeftMusicSheet.y, abilityMusicSheet.paintWidth, abilityMusicSheet.paintHeight);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    for (let i = 0; i < LINE_COUNT; i++) {
        ctx.beginPath();
        const tempY = Math.floor(topLeftMusicSheet.y + (abilityMusicSheet.paintHeight / LINE_COUNT) * (i + 0.5));
        ctx.moveTo(topLeftMusicSheet.x, tempY);
        ctx.lineTo(topLeftMusicSheet.x + abilityMusicSheet.paintWidth, tempY);
        ctx.stroke();
    }

    paintNotes(ctx, abilityMusicSheet, topLeftMusicSheet);

    ctx.lineWidth = 1;
    ctx.fillStyle = "black";
    const xOffset = (((abilityMusicSheet.lastNotePlayTick + abilityMusicSheet.maxPlayTicks) % abilityMusicSheet.maxPlayTicks) / abilityMusicSheet.maxPlayTicks) * abilityMusicSheet.paintWidth;
    ctx.beginPath();
    ctx.moveTo(topLeftMusicSheet.x + xOffset, topLeftMusicSheet.y);
    ctx.lineTo(topLeftMusicSheet.x + xOffset, topLeftMusicSheet.y + abilityMusicSheet.paintHeight);
    ctx.stroke();
}

function paintNotes(ctx: CanvasRenderingContext2D, abilityMusicSheet: AbilityMusicSheet, topLeftMusicSheet: Position) {
    const noteRadius = Math.floor(abilityMusicSheet.paintHeight / LINE_COUNT / 2);
    const noteStemSize = Math.floor(abilityMusicSheet.paintHeight / 2);
    for (let note of abilityMusicSheet.musicSheet.notes) {
        ctx.fillStyle = "black";
        ctx.strokeStyle = "black";
        const lineNumber = musicNoteToMusicSheetLine(note) + 0.5;
        const xOffset = (note.tick / abilityMusicSheet.maxPlayTicks) * abilityMusicSheet.paintWidth;
        ctx.beginPath();
        const noteX = topLeftMusicSheet.x + xOffset;
        const noteY = topLeftMusicSheet.y + lineNumber * (abilityMusicSheet.paintHeight / LINE_COUNT);
        ctx.arc(noteX, noteY, noteRadius, 0, Math.PI * 2);
        switch (note.durationFactor) {
            case 1:
                ctx.fill();
                break;
            case 2:
                ctx.lineWidth = 3;
                ctx.stroke();
                break;
            case 4:
                ctx.lineWidth = 3;
                ctx.stroke();
                break;
        }
        if (note.durationFactor < 4) {
            ctx.lineWidth = 2;
            ctx.beginPath();
            const noteStemDirection = lineNumber < 3 ? 1 : -1;
            ctx.moveTo(noteX + noteRadius - 1, noteY);
            ctx.lineTo(noteX + noteRadius - 1, noteY + noteStemSize * noteStemDirection);
            ctx.stroke();
        }
        if (note.semitone) {
            const char = note.semitone === "flat" ? "b" : "#";
            ctx.font = `bold ${noteRadius * 2.5}px Arial`;
            ctx.fillStyle = "black";
            const charWidth = ctx.measureText(char).width;
            ctx.fillText(char, noteX - noteRadius - charWidth, noteY + noteRadius - 2);
        }
    }
}

/** 0 = inside top line | 0.5 = between top line and second top line etc.  */
function musicNoteToMusicSheetLine(musicNote: MusicNote): number {
    const noteToLineMap: { [key: string]: number } = {
        "B": -1.5, "A": -1, "G": -0.5, "F": 0, "E": 0.5, "D": 1, "C": 1.5,
    };
    const line = noteToLineMap[(musicNote.note.charAt(0))];
    const lineWithOctave = line + (BASE_OCATAVE - musicNote.octave) * 3.5;
    return lineWithOctave;
}

function yPosToMusicNote(yClickPos: number, yOwnerPos: number, abilityMusicSheet: AbilityMusicSheet): MusicNote | undefined {
    const indexToNote = ["B", "A", "G", "F", "E", "D", "C"];
    const offsetTopMusciSheet = (yClickPos - yOwnerPos - abilityMusicSheet.offestY);
    const lineNumber = offsetTopMusciSheet / abilityMusicSheet.paintHeight * LINE_COUNT;
    const index = Math.round(lineNumber * 2) + 2;
    const octave = BASE_OCATAVE - (Math.floor(index / indexToNote.length));
    if (octave < BASE_OCATAVE - 1 || octave > BASE_OCATAVE + 1) return undefined;
    const note = indexToNote[(index + indexToNote.length) % indexToNote.length] as Note;
    return {
        durationFactor: 1,
        note: note,
        octave: octave,
        tick: 0,
    }
}


function tickAbility(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityMusicSheet = ability as AbilityMusicSheet;
    const musicSheetTime = (game.state.time) % (abilityMusicSheet.musicSheet.speed * abilityMusicSheet.maxPlayTicks);
    const currentTick = musicSheetTime / abilityMusicSheet.musicSheet.speed;
    const lastTick = abilityMusicSheet.lastNotePlayTick;
    //warning: playing sound is client specific delayed. Casting ability must not.
    const delayTicks = game.sound ? game.sound.customDelay / abilityMusicSheet.musicSheet.speed : 0;
    for (let note of abilityMusicSheet.musicSheet.notes) {
        const delayedNotTick = (note.tick + delayTicks) % abilityMusicSheet.maxPlayTicks;
        if ((lastTick < delayedNotTick && delayedNotTick <= currentTick)
            || (lastTick > currentTick && delayedNotTick <= currentTick)
        ) {
            console.log("sound", note);
            playMusicNote(abilityMusicSheet.musicSheet, note, game.sound);
        }
    }
    abilityMusicSheet.lastNotePlayTick = currentTick;
}

function createAbilityMoreInfos(ctx: CanvasRenderingContext2D, ability: Ability, game: Game): MoreInfoPart {
    const abilityMusicSheet = ability as AbilityMusicSheet;
    const textLines: string[] = getAbilityNameUiText(ability);
    textLines.push(
        `Key: ${playerInputBindingToDisplayValue(abilityMusicSheet.playerInputBinding!, game)}`,
        `Click to place notes in music sheet.`,
    );
    pushAbilityUpgradesUiTexts(ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS, textLines, ability);

    return createMoreInfosPart(ctx, textLines);
}

