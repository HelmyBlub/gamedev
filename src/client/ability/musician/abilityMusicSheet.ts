import { Character } from "../../character/characterModel.js";
import { AbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { getNextId } from "../../game.js";
import { Position, Game, IdCounter, FACTION_PLAYER } from "../../gameModel.js";
import { playerInputBindingToDisplayValue } from "../../playerInput.js";
import { MoreInfoPart, createMoreInfosPart } from "../../moreInfo.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, findAbilityById, getAbilityNameUiText } from "../ability.js";
import { AbilityUpgrade, AbilityUpgradeFunctions, AbilityUpgradesFunctions, pushAbilityUpgradesOptions, pushAbilityUpgradesUiTexts, upgradeAbility } from "../abilityUpgrade.js";
import { AbilityDamageBreakdown } from "../../combatlog.js";
import { MusicNote, MusicSheet, Note, playMusicNote } from "../../sound.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SINE, addAbilityMusicSheetUpgradeInstrumentSine } from "./abilityMusicSheetInstrumentSine.js";
import { ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SQUARE, addAbilityMusicSheetUpgradeInstrumentSquare } from "./abilityMusicSheetInstrumentSquare.js";
import { findMyCharacter } from "../../character/character.js";
import { ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_TRIANGLE, addAbilityMusicSheetUpgradeInstrumentTriangle } from "./abilityMusicSheetInstrumentTriangle.js";
import { addAbilityMusicSheetUpgradeSize } from "./abilityMusicSheetUpgradeSize.js";
import { addAbilityMusicSheetUpgradeMultiply } from "./abilityMusicSheetUpgradeMultiply.js";
import { abilityMusicSheetsUpgradeSlowApplySlow, addAbilityMusicSheetUpgradeSlow } from "./abilityMusicSheetUpgradeSlow.js";
import { deleteProjectile, tickProjectile } from "../projectile.js";
import { abilityMusicSheetsUpgradeSpeedSetSpeed, addAbilityMusicSheetUpgradeSpeed } from "./abilityMusicSheetUpgradeSpeed.js";
import { addAbilityMusicSheetUpgradeShield, executeAbilityMusicSheetsUpgradeShield } from "./abilityMusicSheetUpgradeShield.js";
import { abilityMusicSheetsUpgradeDamageOverTimeApply, addAbilityMusicSheetUpgradeDamageOverTime } from "./abilityMusicSheetUpgradeDamageOverTime.js";
import { ABILITY_NAME_EXPLODE } from "../abilityExplode.js";
import { ABILITY_NAME_CIRCLE_AROUND } from "../abilityCircleAround.js";
import { mousePositionToMapPosition } from "../../map/map.js";

export type AbilityMusicSheets = Ability & {
    nextUpgradeAddInstrument: boolean,
    chainOrder?: string,
    musicSheets: AbilityMusicSheet[],
    selectedMusicSheetIndex: number,
    maxMusicSheets: number,
    widthPerNote: number,
    paintHeight: number,
    buttonWidth: number,
    buttons: MusicSheetButton[],
    offestY: number,
    damagePerSecond: number,
    selectedInstrument?: string,
}

export type AbilityUpgradeFunctionsMusicSheets = AbilityUpgradeFunctions & {
    executeNoteDamage?: (notes: MusicNote[], abilityOwner: AbilityOwner, abilityMusicSheets: AbilityMusicSheets, game: Game) => void
    paintNote?: (ctx: CanvasRenderingContext2D, note: MusicNote, notePaintX: number, notePaintY: number, lineNumber: number, noteRadius: number) => void,
    getChainPosition?: (abilityOwner: AbilityOwner, abilityMusicSheets: AbilityMusicSheets, game: Game) => Position,
}

export type AbilityUpgradesFunctionsMusicSheets = {
    [key: string]: AbilityUpgradeFunctionsMusicSheets,
}

export type AbilityMusicSheet = {
    musicSheet: MusicSheet,
    stopping?: boolean,
    stopped: boolean,
    maxPlayTicks: number,
    lastPlayTick?: number,
    lastPlayGameTime?: number,
}

type MusicSheetButton = {
    isLeft: boolean,
    height: number,
    action: "+" | "-" | "↑" | "↓" | "start/stop",
}

const LINE_COUNT = 5;
const BASE_OCATAVE = 4;
const NOTE_PAINT_OFFSETX = 20;
export const ABILITY_NAME_MUSIC_SHEET = "Music Sheet";
export const ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS: AbilityUpgradesFunctionsMusicSheets = {};

export function addAbilityMusicSheet() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_MUSIC_SHEET] = {
        activeAbilityCast: castAbility,
        createAbility: createAbilityMusicSheet,
        createAbilityBossUpgradeOptions: createAbilityBossUpgradeOptions,
        createAbilityMoreInfos: createAbilityMoreInfos,
        createDamageBreakDown: createDamageBreakDown,
        deleteAbilityObject: deleteAbilityObject,
        executeUpgradeOption: executeAbilityUpgradeOption,
        onObjectHit: onObjectHit,
        paintAbility: paintAbility,
        paintAbilityUI: paintAbilityUI,
        resetAbility: resetAbility,
        setAbilityToLevel: setAbilityToLevel,
        setAbilityToBossLevel: setAbilityToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        tickAbility: tickAbility,
        tickAbilityObject: tickAbilityObject,
        tickBossAI: tickBossAI,
        abilityUpgradeFunctions: ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS,
        canBeUsedByBosses: true,
    };
    addAbilityMusicSheetUpgradeInstrumentSine();
    addAbilityMusicSheetUpgradeInstrumentSquare();
    addAbilityMusicSheetUpgradeInstrumentTriangle();
    addAbilityMusicSheetUpgradeSize();
    addAbilityMusicSheetUpgradeMultiply();
    addAbilityMusicSheetUpgradeSlow();
    addAbilityMusicSheetUpgradeSpeed();
    addAbilityMusicSheetUpgradeShield();
    addAbilityMusicSheetUpgradeDamageOverTime();
}

export function createAbilityMusicSheet(
    idCounter: IdCounter,
    playerInputBinding?: string,
): AbilityMusicSheets {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_MUSIC_SHEET,
        passive: false,
        upgrades: {},
        playerInputBinding: playerInputBinding,
        tradable: true,
        musicSheets: [{
            musicSheet: { speed: 400, notes: [] },
            stopped: true,
            lastPlayTick: -0.5,
            maxPlayTicks: 8,
        }],
        buttons: [
            { action: "+", isLeft: false, height: 20 },
            { action: "-", isLeft: false, height: 20 },
            { action: "↑", isLeft: true, height: 20 },
            { action: "↓", isLeft: true, height: 20 },
            { action: "start/stop", isLeft: true, height: 20 },
        ],
        maxMusicSheets: 5,
        selectedMusicSheetIndex: 0,
        widthPerNote: 30,
        paintHeight: 80,
        offestY: 50,
        damagePerSecond: 200,
        buttonWidth: 20,
        nextUpgradeAddInstrument: true,
    };
}

export function getMusicSheetUpgradeChainPosition(musicSheets: AbilityMusicSheets, abilityOwner: AbilityOwner, game: Game): Position {
    if (!musicSheets.chainOrder) return { x: abilityOwner.x, y: abilityOwner.y };
    const functions = ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS[musicSheets.chainOrder];
    if (!functions.getChainPosition) return { x: abilityOwner.x, y: abilityOwner.y };
    return functions.getChainPosition(abilityOwner, musicSheets, game);
}

function deleteAbilityObject(abilityObject: AbilityObject, game: Game): boolean {
    return deleteProjectile(abilityObject, game);
}

function tickAbilityObject(abilityObject: AbilityObject, game: Game) {
    tickProjectile(abilityObject, game);
}

function onObjectHit(abilityObject: AbilityObject, targetCharacter: Character, game: Game) {
    if (abilityObject.abilityIdRef === undefined) return;
    const ability = findAbilityById(abilityObject.abilityIdRef, game) as AbilityMusicSheets;
    if (!ability) return;
    abilityMusicSheetsUpgradeSlowApplySlow(ability, targetCharacter, game);
    abilityMusicSheetsUpgradeDamageOverTimeApply(ability, targetCharacter, game);
}

function createDamageBreakDown(damage: number, ability: Ability, abilityObject: AbilityObject | undefined, damageAbilityName: string, game: Game): AbilityDamageBreakdown[] {
    const damageBreakDown: AbilityDamageBreakdown[] = [];
    if (abilityObject) {
        let name = "Base Damage";
        switch (abilityObject.type) {
            case ABILITY_NAME_EXPLODE:
                name = ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SQUARE;
                break;
            case ABILITY_NAME_CIRCLE_AROUND:
                name = ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_TRIANGLE;
                break;
            case ABILITY_NAME_MUSIC_SHEET:
                name = ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SINE;
                break;
        }
        damageBreakDown.push({
            damage: damage,
            name: name,
        });
    } else {
        damageBreakDown.push({
            damage: damage,
            name: damageAbilityName,
        });
    }
    return damageBreakDown;
}

function tickBossAI(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
}

function resetAbility(ability: Ability) {
    const abilityMusicSheet = ability as AbilityMusicSheets;
    for (let musicSheet of abilityMusicSheet.musicSheets) {
        musicSheet.lastPlayTick = undefined;
    }
}

function castAbility(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, isKeydown: boolean, game: Game) {
    if (!isKeydown) return;
    const abilityMusicSheets = ability as AbilityMusicSheets;
    if (abilityMusicSheets.selectedInstrument === undefined) return;
    const selectedMusicSheet = abilityMusicSheets.musicSheets[abilityMusicSheets.selectedMusicSheetIndex];
    const musicSheetWidth = abilityMusicSheets.widthPerNote * selectedMusicSheet.maxPlayTicks;
    const didCastNote = castNote(abilityOwner, abilityMusicSheets, selectedMusicSheet, castPosition, musicSheetWidth);
    if (didCastNote) return;
    const clickedButton = determineClickedButton(abilityMusicSheets, abilityOwner, musicSheetWidth, castPosition);
    if (clickedButton) {
        switch (clickedButton.action) {
            case "+":
                selectedMusicSheet.maxPlayTicks += 4;
                break;
            case "-":
                if (selectedMusicSheet.maxPlayTicks > 4) {
                    selectedMusicSheet.maxPlayTicks -= 4;
                }
                break;
            case "↑":
                if (abilityMusicSheets.selectedMusicSheetIndex > 0) {
                    abilityMusicSheets.selectedMusicSheetIndex--;
                }
                break;
            case "↓":
                if (abilityMusicSheets.selectedMusicSheetIndex < abilityMusicSheets.maxMusicSheets - 1) {
                    abilityMusicSheets.selectedMusicSheetIndex++;
                    if (abilityMusicSheets.musicSheets[abilityMusicSheets.selectedMusicSheetIndex] === undefined) {
                        abilityMusicSheets.musicSheets[abilityMusicSheets.selectedMusicSheetIndex] = {
                            lastPlayTick: -0.5,
                            maxPlayTicks: 8,
                            stopped: true,
                            musicSheet: { notes: [], speed: 400 },
                        }
                    }
                }
                break;
            case "start/stop":
                selectedMusicSheet.stopping = !selectedMusicSheet.stopping;
                break;
        }
    }
}

function determineClickedButton(abilityMusicSheets: AbilityMusicSheets, abilityOwner: AbilityOwner, musicSheetWidth: number, castPosition: Position): MusicSheetButton | undefined {
    const musicSheetLeft = abilityOwner.x - musicSheetWidth / 2;
    const musicSheetRight = musicSheetLeft + musicSheetWidth;
    const musicSheetTop = abilityOwner.y + abilityMusicSheets.offestY;
    const leftButtonHit = musicSheetLeft > castPosition.x && castPosition.x > musicSheetLeft - abilityMusicSheets.buttonWidth;
    const rightButtonHit = musicSheetRight < castPosition.x && castPosition.x < musicSheetRight + abilityMusicSheets.buttonWidth;
    if (!leftButtonHit && !rightButtonHit) return undefined;
    const isLeft = leftButtonHit;
    let offsetY = 0;
    const spacing = 2;
    for (let button of abilityMusicSheets.buttons) {
        if (button.isLeft === isLeft) {
            if (castPosition.y > musicSheetTop + offsetY && castPosition.y < musicSheetTop + offsetY + button.height) {
                return button;
            }
            offsetY += button.height + spacing;
        }
    }
    return undefined;
}

/** returns true if clicked inside music sheet for note placing */
function castNote(abilityOwner: AbilityOwner, musicSheets: AbilityMusicSheets, selectedSheet: AbilityMusicSheet, castPosition: Position, musicSheetWidth: number): boolean {
    const unroundedTick = (((castPosition.x - abilityOwner.x) + musicSheetWidth / 2 - NOTE_PAINT_OFFSETX + 4) / musicSheetWidth) * selectedSheet.maxPlayTicks;
    const musicNote = positionToMusicNote(abilityOwner, musicSheets, selectedSheet, castPosition, musicSheetWidth);
    if (!musicNote) return false;
    const tick = Math.round(unroundedTick);
    let duplicateNoteIndex = selectedSheet.musicSheet.notes.findIndex(n => n.note === musicNote.note && n.tick === tick && n.octave === musicNote.octave);
    if (duplicateNoteIndex > -1) {
        const dupNote = selectedSheet.musicSheet.notes[duplicateNoteIndex];
        const modifyDelete = modifyNoteClick(dupNote, unroundedTick, tick);
        if (modifyDelete) selectedSheet.musicSheet.notes.splice(duplicateNoteIndex, 1);
    } else {
        selectedSheet.musicSheet.notes.push(musicNote);
    }
    abilityMusicSheetsUpgradeSpeedSetSpeed(musicSheets, abilityOwner);
    return true;
}

function positionToMusicNote(abilityOwner: AbilityOwner, musicSheets: AbilityMusicSheets, selectedSheet: AbilityMusicSheet, castPosition: Position, musicSheetWidth: number): MusicNote | undefined {
    const unroundedTick = (((castPosition.x - abilityOwner.x) + musicSheetWidth / 2 - NOTE_PAINT_OFFSETX + 4) / musicSheetWidth) * selectedSheet.maxPlayTicks;
    const tick = Math.round(unroundedTick);
    if (tick < 0 || tick >= selectedSheet.maxPlayTicks) return undefined;
    const musicNote = yPosToMusicNote(castPosition.y, abilityOwner.y, musicSheets);
    if (!musicNote) return undefined;
    musicNote.tick = tick;
    return musicNote;
}

/** return true if note remove click */
function modifyNoteClick(note: MusicNote, unroundedTick: number, tick: number): boolean {
    if (unroundedTick < tick - 0.1) {
        if (!note.semitone) {
            note.semitone = "sharp";
        } else if (note.semitone === "sharp") {
            note.semitone = "flat";
        } else {
            note.semitone = undefined;
        }
    } else {
        if (note.durationFactor < 4) {
            note.durationFactor *= 2;
        } else {
            return true;
        }
    }
    return false;
}

function positionToHoverNote(abilityOwner: AbilityOwner, musicSheets: AbilityMusicSheets, selectedSheet: AbilityMusicSheet, castPosition: Position, musicSheetWidth: number): { note: MusicNote, delete?: boolean } | undefined {
    const unroundedTick = (((castPosition.x - abilityOwner.x) + musicSheetWidth / 2 - NOTE_PAINT_OFFSETX + 4) / musicSheetWidth) * selectedSheet.maxPlayTicks;
    const tick = Math.round(unroundedTick);

    const note = positionToMusicNote(abilityOwner, musicSheets, selectedSheet, castPosition, musicSheetWidth);
    if (!note) return;
    let duplicateNoteIndex = selectedSheet.musicSheet.notes.findIndex(n => n.note === note.note && n.tick === tick && n.octave === note.octave);
    if (duplicateNoteIndex > -1) {
        const dupNote = selectedSheet.musicSheet.notes[duplicateNoteIndex];
        note.semitone = dupNote.semitone;
        note.durationFactor = dupNote.durationFactor;
        const modifyDelete = modifyNoteClick(note, unroundedTick, tick);
        if (modifyDelete) return { note, delete: true };
    }

    return { note };
}

function createAbilityBossUpgradeOptions(ability: Ability, character: Character, game: Game): UpgradeOptionAndProbability[] {
    const musicSheets = ability as AbilityMusicSheets;
    const upgradeOptions: UpgradeOptionAndProbability[] = [];
    const upgradeFunctionkeys = Object.keys(ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS);
    const upgradeOptionsFuncitons: AbilityUpgradesFunctions = {};
    if (musicSheets.nextUpgradeAddInstrument) {
        for (let upFuncKey of upgradeFunctionkeys) {
            const functions = ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS[upFuncKey];
            if (functions.executeNoteDamage) {
                upgradeOptionsFuncitons[upFuncKey] = functions;
            }
        }
        const isFirstInstrument = Object.keys(musicSheets.upgrades).length === 0;
        if (!isFirstInstrument) {
            musicSheets.nextUpgradeAddInstrument = false;
        }
    } else {
        for (let upFuncKey of upgradeFunctionkeys) {
            const functions = ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS[upFuncKey];
            if (!functions.executeNoteDamage) {
                upgradeOptionsFuncitons[upFuncKey] = functions;
            }
        }
        musicSheets.nextUpgradeAddInstrument = true;
    }
    pushAbilityUpgradesOptions(upgradeOptionsFuncitons, upgradeOptions, ability, character, game);
    return upgradeOptions;
}

function executeAbilityUpgradeOption(ability: Ability, character: Character, upgradeOption: UpgradeOption, game: Game) {
    const abilityUpgradeOption: AbilityUpgradeOption = upgradeOption as AbilityUpgradeOption;
    const musicSheets = ability as AbilityMusicSheets;
    upgradeAbility(ability, character, abilityUpgradeOption);
    if (!musicSheets.nextUpgradeAddInstrument && ability.bossSkillPoints) {
        ability.bossSkillPoints.available++;
        ability.bossSkillPoints.used--;
    }
}

function setAbilityToLevel(ability: Ability, level: number) {
    const musicSheet = ability as AbilityMusicSheets;
    musicSheet.damagePerSecond = 200 * level;
}

function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const musicSheet = ability as AbilityMusicSheets;
    musicSheet.damagePerSecond = level * 1 * damageFactor;
}

function setAbilityToBossLevel(ability: Ability, level: number) {
    const musicSheets = ability as AbilityMusicSheets;
    musicSheets.damagePerSecond = 10 * level;
    const upgradeKeys = Object.keys(musicSheets.upgrades);
    const levelForEachUpgrade = Math.floor(level / upgradeKeys.length);
    const additionalLevelUntilIndex = level % upgradeKeys.length;
    for (let i = 0; i < upgradeKeys.length; i++) {
        const upgrade: AbilityUpgrade = musicSheets.upgrades[upgradeKeys[i]];
        upgrade.level = 1 + levelForEachUpgrade;
        if (i < additionalLevelUntilIndex) upgrade.level++;
    }
}

function paintAbilityUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    const musicSheet = ability as AbilityMusicSheets;
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
    if (ability.disabled) return;
    const abilityMusicSheets = ability as AbilityMusicSheets;
    if (abilityMusicSheets.selectedInstrument === undefined) return;
    const selectedSheet = abilityMusicSheets.musicSheets[abilityMusicSheets.selectedMusicSheetIndex];
    const musicSheetWidth = abilityMusicSheets.widthPerNote * selectedSheet.maxPlayTicks;
    const isMyAbility = findMyCharacter(game) === abilityOwner;
    let hoverNote: { note: MusicNote, delete?: boolean } | undefined;
    let ownerPaintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition);
    const topLeftMusicSheet = {
        x: Math.floor(ownerPaintPos.x - musicSheetWidth / 2),
        y: ownerPaintPos.y + abilityMusicSheets.offestY,
    }
    if (!isMyAbility) {
        ctx.globalAlpha *= 0.5;
    } else {
        const currentMousePosition = mousePositionToMapPosition(game, cameraPosition);
        hoverNote = positionToHoverNote(abilityOwner, abilityMusicSheets, selectedSheet, currentMousePosition, musicSheetWidth);
    }
    if (abilityOwner.faction === FACTION_PLAYER) ctx.globalAlpha *= game.UI.playerGlobalAlphaMultiplier;

    paintMusicSheetLines(ctx, topLeftMusicSheet, musicSheetWidth, abilityMusicSheets, selectedSheet);
    paintNotes(ctx, abilityMusicSheets, topLeftMusicSheet, selectedSheet, hoverNote);
    paintMovingLineTimeIndicator(ctx, abilityMusicSheets, topLeftMusicSheet, musicSheetWidth, selectedSheet);

    if (isMyAbility) {
        let spacing = 2;
        let leftOffsetY = 0;
        let rightOffsetY = 0;
        const fontSize = 24;
        ctx.font = `bold ${fontSize}px Arial`;
        for (let button of abilityMusicSheets.buttons) {
            const paintX = button.isLeft ? topLeftMusicSheet.x - abilityMusicSheets.buttonWidth : topLeftMusicSheet.x + musicSheetWidth;
            const paintY = button.isLeft ? topLeftMusicSheet.y + leftOffsetY : topLeftMusicSheet.y + rightOffsetY;
            let buttonText: string = button.action;
            if (button.action === "start/stop") {
                if (selectedSheet.stopping) {
                    buttonText = "►";
                } else {
                    buttonText = "■";
                }
            }
            const textWidth = ctx.measureText(buttonText).width;
            ctx.fillStyle = "white";
            ctx.fillRect(paintX, paintY, abilityMusicSheets.buttonWidth, button.height);
            ctx.fillStyle = "black";
            ctx.fillText(buttonText, paintX + Math.floor(abilityMusicSheets.buttonWidth / 2 - textWidth / 2), Math.floor(paintY + button.height / 2 + fontSize / 2) - 5);
            if (button.isLeft) {
                leftOffsetY += button.height + spacing;
            } else {
                rightOffsetY += button.height + spacing;
            }
        }
        ctx.fillStyle = "white";
        ctx.fillRect(topLeftMusicSheet.x - abilityMusicSheets.buttonWidth, topLeftMusicSheet.y + leftOffsetY, abilityMusicSheets.buttonWidth, abilityMusicSheets.buttonWidth);
        ctx.fillStyle = "black";
        ctx.fillText((1 + abilityMusicSheets.selectedMusicSheetIndex).toFixed(), topLeftMusicSheet.x - abilityMusicSheets.buttonWidth + 5, Math.floor(topLeftMusicSheet.y + leftOffsetY + abilityMusicSheets.buttonWidth / 2 + fontSize / 2) - 5);

        if (hoverNote && !hoverNote.delete) {
            paintNote(ctx, hoverNote.note, abilityMusicSheets, topLeftMusicSheet, selectedSheet, "blue", 0.5);
        }
    }
    ctx.globalAlpha = 1;
}

function paintMovingLineTimeIndicator(ctx: CanvasRenderingContext2D, abilityMusicSheets: AbilityMusicSheets, topLeftMusicSheet: Position, musicSheetWidth: number, selectedSheet: AbilityMusicSheet) {
    ctx.lineWidth = 1;
    ctx.fillStyle = "black";
    if (selectedSheet.lastPlayTick === undefined) return;
    const xOffset1 = (((selectedSheet.lastPlayTick + selectedSheet.maxPlayTicks) % selectedSheet.maxPlayTicks) / selectedSheet.maxPlayTicks) * musicSheetWidth;
    const xOffset = (xOffset1 + NOTE_PAINT_OFFSETX) % musicSheetWidth;
    ctx.beginPath();
    ctx.moveTo(topLeftMusicSheet.x + xOffset, topLeftMusicSheet.y);
    ctx.lineTo(topLeftMusicSheet.x + xOffset, topLeftMusicSheet.y + abilityMusicSheets.paintHeight);
    ctx.stroke();
}

function paintMusicSheetLines(ctx: CanvasRenderingContext2D, topLeftMusicSheet: Position, musicSheetWidth: number, abilityMusicSheets: AbilityMusicSheets, selectedSheet: AbilityMusicSheet) {
    ctx.globalAlpha *= 0.5;
    ctx.fillStyle = "white";
    ctx.fillRect(topLeftMusicSheet.x, topLeftMusicSheet.y, musicSheetWidth, abilityMusicSheets.paintHeight);
    ctx.globalAlpha *= 2;
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    for (let i = 0; i < LINE_COUNT; i++) {
        ctx.beginPath();
        const tempY = Math.floor(topLeftMusicSheet.y + (abilityMusicSheets.paintHeight / LINE_COUNT) * (i + 0.5));
        ctx.moveTo(topLeftMusicSheet.x, tempY);
        ctx.lineTo(topLeftMusicSheet.x + musicSheetWidth, tempY);
        ctx.stroke();
    }

    const splitterTopY = Math.floor(topLeftMusicSheet.y + (abilityMusicSheets.paintHeight / LINE_COUNT) * 0.5);
    for (let i = 4; i < selectedSheet.maxPlayTicks; i += 4) {
        const xOffset = Math.floor(i / selectedSheet.maxPlayTicks * musicSheetWidth);
        ctx.beginPath();
        ctx.moveTo(topLeftMusicSheet.x + xOffset, splitterTopY);
        ctx.lineTo(topLeftMusicSheet.x + xOffset, splitterTopY + abilityMusicSheets.paintHeight - Math.floor(abilityMusicSheets.paintHeight / LINE_COUNT));
        ctx.stroke();
    }
}

function paintNotes(ctx: CanvasRenderingContext2D, abilityMusicSheets: AbilityMusicSheets, topLeftMusicSheet: Position, selectedSheet: AbilityMusicSheet, hoverNote: { note: MusicNote, delete?: boolean } | undefined) {
    for (let note of selectedSheet.musicSheet.notes) {
        let globalAlphaModifier = undefined;
        if (hoverNote && note.note === hoverNote.note.note && note.tick === hoverNote.note.tick && note.octave === hoverNote.note.octave) {
            globalAlphaModifier = 0.5;
        }
        paintNote(ctx, note, abilityMusicSheets, topLeftMusicSheet, selectedSheet, "black", globalAlphaModifier);
    }
}

function paintNote(ctx: CanvasRenderingContext2D, note: MusicNote, abilityMusicSheet: AbilityMusicSheets, topLeftMusicSheet: Position, selectedSheet: AbilityMusicSheet, color: string = "black", globalAlphaModifier: number | undefined = undefined) {
    const musicSheetWidth = abilityMusicSheet.widthPerNote * selectedSheet.maxPlayTicks;
    const noteRadius = Math.floor(abilityMusicSheet.paintHeight / LINE_COUNT / 2);
    if (globalAlphaModifier) ctx.globalAlpha *= globalAlphaModifier;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    const lineNumber = musicNoteToMusicSheetLine(note) + 0.5;
    const xOffset = (note.tick / selectedSheet.maxPlayTicks) * musicSheetWidth + NOTE_PAINT_OFFSETX;
    if (xOffset > musicSheetWidth) return;

    if (note.type === undefined) return;
    const upgradeFunctions = ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS[note.type];
    const noteX = topLeftMusicSheet.x + xOffset;
    const noteY = topLeftMusicSheet.y + lineNumber * (abilityMusicSheet.paintHeight / LINE_COUNT);
    if (upgradeFunctions.paintNote) upgradeFunctions.paintNote(ctx, note, noteX, noteY, lineNumber, noteRadius);

    if (note.semitone) {
        const char = note.semitone === "flat" ? "b" : "#";
        ctx.font = `bold ${noteRadius * 2.5}px Arial`;
        ctx.fillStyle = color;
        const charWidth = ctx.measureText(char).width;
        ctx.fillText(char, noteX - noteRadius - charWidth, noteY + noteRadius - 2);
    }
    if (globalAlphaModifier) ctx.globalAlpha /= globalAlphaModifier;
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

function yPosToMusicNote(yClickPos: number, yOwnerPos: number, abilityMusicSheets: AbilityMusicSheets): MusicNote | undefined {
    const indexToNote = ["B", "A", "G", "F", "E", "D", "C"];
    const offsetTopMusciSheet = (yClickPos - yOwnerPos - abilityMusicSheets.offestY);
    const lineNumber = offsetTopMusciSheet / abilityMusicSheets.paintHeight * LINE_COUNT;
    if (lineNumber < -1) return undefined;
    const index = Math.round(lineNumber * 2) + 2;
    const octave = BASE_OCATAVE - (Math.floor(index / indexToNote.length));
    if (octave < BASE_OCATAVE - 1 || octave > BASE_OCATAVE + 1) return undefined;
    const note = indexToNote[(index + indexToNote.length) % indexToNote.length] as Note;
    const noteType = abilityMusicSheets.selectedInstrument;
    return {
        durationFactor: 1,
        note: note,
        octave: octave,
        tick: 0,
        type: noteType,
    }
}

function tickAbility(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityMusicSheets = ability as AbilityMusicSheets;
    const typeToArrayIndex = new Map<string, number>();
    const notesDamageTypeTicks: MusicNote[][] = [];
    for (let selectedMusicSheet of abilityMusicSheets.musicSheets) {
        if (selectedMusicSheet.lastPlayGameTime === undefined) selectedMusicSheet.lastPlayGameTime = game.state.time;
        if (selectedMusicSheet.lastPlayTick === undefined) selectedMusicSheet.lastPlayTick = 0;
        if (selectedMusicSheet.stopped && !selectedMusicSheet.stopping) {
            const interval = selectedMusicSheet.musicSheet.speed * 4;
            const gameTimeInterval = game.state.time % interval;
            if (gameTimeInterval < 16) {
                selectedMusicSheet.lastPlayTick = -0.5;
                selectedMusicSheet.stopped = false;
                selectedMusicSheet.lastPlayGameTime = game.state.time;
            }
        }

        const musicSheetTime = (selectedMusicSheet.musicSheet.speed * selectedMusicSheet.lastPlayTick + (game.state.time - selectedMusicSheet.lastPlayGameTime)) % (selectedMusicSheet.musicSheet.speed * selectedMusicSheet.maxPlayTicks);
        const currentTick = musicSheetTime / selectedMusicSheet.musicSheet.speed;
        if (selectedMusicSheet.stopping) {
            if (currentTick % 4 >= 3.4) {
                selectedMusicSheet.stopped = true;
                selectedMusicSheet.lastPlayTick = -0.5;
            }
        }

        if (selectedMusicSheet.stopped) continue;
        if (selectedMusicSheet.lastPlayTick === undefined) selectedMusicSheet.lastPlayTick = currentTick - 1;
        const lastTick = selectedMusicSheet.lastPlayTick;
        const delayTicks = game.sound ? game.sound.customDelay / selectedMusicSheet.musicSheet.speed : 0;
        for (let i = selectedMusicSheet.musicSheet.notes.length - 1; i >= 0; i--) {
            const note = selectedMusicSheet.musicSheet.notes[i];
            if (note.type === undefined) continue;
            if (note.tick >= selectedMusicSheet.maxPlayTicks) {
                if (note.tick > selectedMusicSheet.maxPlayTicks + 4) {
                    selectedMusicSheet.musicSheet.notes.splice(i, 1);
                }
                continue;
            }
            const delayedNoteTick = (note.tick + delayTicks) % selectedMusicSheet.maxPlayTicks;
            if ((lastTick < delayedNoteTick && delayedNoteTick <= currentTick)
                || (lastTick > currentTick && delayedNoteTick <= currentTick)
            ) {
                //warning: playing sound is client specific delayed. other things should not.
                if (!game.testing.replay) playMusicNote(selectedMusicSheet.musicSheet, note, game.sound);
            }
            const noteTick = note.tick % selectedMusicSheet.maxPlayTicks;
            if ((lastTick < noteTick && noteTick <= currentTick)
                || (lastTick > currentTick && noteTick <= currentTick)
            ) {
                if (!typeToArrayIndex.has(note.type)) {
                    typeToArrayIndex.set(note.type, notesDamageTypeTicks.length);
                    notesDamageTypeTicks.push([]);
                }
                const index = typeToArrayIndex.get(note.type);
                if (index !== undefined) notesDamageTypeTicks[index].push(note);
            }
        }

        selectedMusicSheet.lastPlayTick = currentTick;
        selectedMusicSheet.lastPlayGameTime = game.state.time;
    }

    for (let notesDamageTicks of notesDamageTypeTicks) {
        const noteType = notesDamageTicks[0].type;
        if (noteType === undefined) continue;
        let upgradeFunctions = ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS[noteType];
        if (upgradeFunctions.executeNoteDamage) {
            upgradeFunctions.executeNoteDamage(notesDamageTicks, abilityOwner, abilityMusicSheets, game);
            executeAbilityMusicSheetsUpgradeShield(abilityMusicSheets, abilityOwner, notesDamageTicks.length);
        }
    }

    if (abilityMusicSheets.musicSheets.length > 0 && abilityMusicSheets.musicSheets[0].lastPlayTick !== undefined) {
        if (abilityMusicSheets.musicSheets[0].lastPlayTick % 4 > 3) {
            abilityMusicSheets.chainOrder = undefined;
        } else if (notesDamageTypeTicks.length > 0 && notesDamageTypeTicks[0].length > 0 && notesDamageTypeTicks[0][0].type) {
            abilityMusicSheets.chainOrder = notesDamageTypeTicks[0][0].type;
        }
    }
}

function createAbilityMoreInfos(ctx: CanvasRenderingContext2D, ability: Ability, game: Game): MoreInfoPart {
    const abilityMusicSheet = ability as AbilityMusicSheets;
    const textLines: string[] = getAbilityNameUiText(ability);
    textLines.push(
        `Key: ${playerInputBindingToDisplayValue(abilityMusicSheet.playerInputBinding!, game)}`,
        `Click to place notes in music sheet.`,
        `Each note creates an damage effect.`,
        `More notes => less damage per Note.`,
    );
    if (abilityMusicSheet.level) {
        textLines.push(`Level: ${abilityMusicSheet.level.level}`);
        if (abilityMusicSheet.level.leveling) {
            textLines.push(
                `XP: ${abilityMusicSheet.level.leveling.experience.toFixed(0)}/${abilityMusicSheet.level.leveling.experienceForLevelUp}`,
            );
        }
    }
    pushAbilityUpgradesUiTexts(ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS, textLines, ability);

    return createMoreInfosPart(ctx, textLines);
}

